import { useState } from 'react';
import { Check, Circle, Bell } from 'lucide-react';
import type { MarketingDashboardStats, MarketingEventTask } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function EventsTab({ stats, color }: Props) {
  const [view, setView] = useState<'list' | 'calendar' | 'timeline'>('list');
  // Local task state — keyed by "eventId:taskId"
  const [taskOverrides, setTaskOverrides] = useState<Record<string, boolean>>({});
  // Calendar state (must be at component level, not inside IIFE)
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const upcoming = stats.events.filter((e) => e.status === 'upcoming');
  const past = stats.events.filter((e) => e.status === 'past');

  const isTaskDone = (eventId: string, task: MarketingEventTask) => {
    const key = `${eventId}:${task.id}`;
    return key in taskOverrides ? taskOverrides[key] : task.done;
  };

  const toggleTask = (eventId: string, taskId: string) => {
    const key = `${eventId}:${taskId}`;
    setTaskOverrides((prev) => ({ ...prev, [key]: !isTaskDone(eventId, { id: taskId, label: '', done: false }) }));
  };

  const getDoneCount = (event: typeof stats.events[number]) => {
    if (!event.tasks) return 0;
    return event.tasks.filter((t) => isTaskDone(event.id, t)).length;
  };

  const renderTasks = (event: typeof stats.events[number], interactive: boolean) => {
    if (!event.tasks || event.tasks.length === 0) return null;
    const doneCount = getDoneCount(event);
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: 4 }}>
          {doneCount}/{event.tasks.length} done
        </div>
        {event.tasks.map((task) => {
          const done = isTaskDone(event.id, task);
          return (
            <div
              key={task.id}
              onClick={() => interactive && toggleTask(event.id, task.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.8rem',
                cursor: interactive ? 'pointer' : 'default', userSelect: 'none',
              }}
            >
              {done
                ? <Check className="h-4 w-4 shrink-0" style={{ color: '#22c55e' }} />
                : <Circle className="h-4 w-4 shrink-0" style={{ color: 'var(--samurai-muted)', opacity: 0.4 }} />
              }
              <span style={{
                textDecoration: done ? 'line-through' : 'none',
                opacity: done ? 0.5 : 1,
                color: 'var(--samurai-text)',
              }}>
                {task.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="sd-stack">
      {/* View toggle + Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['list', 'calendar', 'timeline'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer',
                border: `1px solid ${view === v ? color : 'var(--samurai-border)'}`,
                background: view === v ? `${color}20` : 'transparent',
                color: view === v ? color : 'var(--samurai-muted)',
              }}
            >
              {v === 'list' ? '📋 List' : v === 'calendar' ? '📅 Calendar' : '📌 Timeline'}
            </button>
          ))}
        </div>
        <button style={{
          padding: '6px 14px', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
          border: 'none', background: color, color: '#0a0a0a',
        }}>
          + Add Event
        </button>
      </div>

      {view === 'list' && (
        <div className="sd-stack" style={{ gap: 16 }}>
          {upcoming.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, marginBottom: 8 }}>Upcoming</h3>
              {upcoming.map((event) => (
                <div key={event.id} className="sd-chart-card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--samurai-text)' }}>{event.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--samurai-muted)' }}>{event.date} · {event.location}</div>
                    </div>
                    {event.daysUntil !== undefined && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color }}>{event.daysUntil} days</span>
                    )}
                  </div>
                  {renderTasks(event, true)}
                </div>
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, marginBottom: 8 }}>Past</h3>
              {past.map((event) => (
                <div key={event.id} className="sd-chart-card" style={{ marginBottom: 8, opacity: 0.7 }}>
                  <div style={{ fontWeight: 600, color: 'var(--samurai-text)' }}>{event.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--samurai-muted)' }}>{event.date} · {event.location}</div>
                  {renderTasks(event, true)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'calendar' && (() => {
        const now = new Date();

        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        // Map events to their dates
        const eventMap: Record<string, typeof stats.events[number][]> = {};
        stats.events.forEach((e) => {
          const d = e.date; // "YYYY-MM-DD"
          if (!eventMap[d]) eventMap[d] = [];
          eventMap[d].push(e);
        });

        const prevMonth = () => {
          if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
          else setCalMonth(calMonth - 1);
        };
        const nextMonth = () => {
          if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
          else setCalMonth(calMonth + 1);
        };

        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

        return (
          <div className="sd-chart-card" style={{ padding: 16 }}>
            {/* Month nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--samurai-text)', fontSize: '1.1rem' }}>←</button>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--samurai-text)' }}>{monthNames[calMonth]} {calYear}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--samurai-text)', fontSize: '1.1rem' }}>→</button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'var(--samurai-muted)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {/* Empty cells before first day */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: 70 }} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayEvents = eventMap[dateStr] || [];
                const isToday = dateStr === todayStr;

                return (
                  <div key={day} style={{
                    minHeight: 70, padding: 4, borderRadius: 6,
                    border: `1px solid ${isToday ? color : 'var(--samurai-border)'}`,
                    background: isToday ? `${color}10` : 'transparent',
                    position: 'relative',
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: isToday ? 700 : 500, color: isToday ? color : 'var(--samurai-text)', marginBottom: 2 }}>
                      {day}
                    </div>
                    {dayEvents.map((ev) => (
                      <div key={ev.id} style={{
                        fontSize: '0.65rem', padding: '2px 4px', borderRadius: 3, marginBottom: 2,
                        background: ev.status === 'upcoming' ? `${color}30` : 'var(--samurai-muted)',
                        color: ev.status === 'upcoming' ? color : 'var(--samurai-text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        opacity: ev.status === 'past' ? 0.6 : 1,
                      }}>
                        {ev.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {view === 'timeline' && (
        <div className="sd-stack" style={{ gap: 0, position: 'relative', paddingLeft: 24 }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 11, top: 8, bottom: 8, width: 2, background: 'var(--samurai-border)' }} />

          {[...stats.events].sort((a, b) => a.date.localeCompare(b.date)).map((event, idx) => {
            const isPast = event.status === 'past';
            const doneCount = getDoneCount(event);
            const totalTasks = event.tasks?.length || 0;
            const pct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

            return (
              <div key={event.id} style={{ position: 'relative', paddingBottom: idx < stats.events.length - 1 ? 20 : 0 }}>
                {/* Dot on timeline */}
                <div style={{
                  position: 'absolute', left: -18, top: 6, width: 12, height: 12, borderRadius: '50%',
                  background: isPast ? 'var(--samurai-muted)' : color,
                  border: '2px solid var(--samurai-card)',
                }} />

                <div className="sd-chart-card" style={{ padding: '12px 16px', opacity: isPast ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--samurai-text)' }}>{event.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--samurai-muted)' }}>{event.date} · {event.location}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {event.daysUntil !== undefined && !isPast && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{event.daysUntil} days</span>
                      )}
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                        background: isPast ? '#94a3b820' : `${color}20`,
                        color: isPast ? '#94a3b8' : color,
                      }}>
                        {isPast ? 'Completed' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                  {totalTasks > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--samurai-muted)', marginBottom: 3 }}>
                        <span>Tasks</span>
                        <span>{doneCount}/{totalTasks} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--samurai-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct === 100 ? '#22c55e' : color, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}
                  {renderTasks(event, true)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reminders info */}
      <div className="sd-chart-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Bell className="h-5 w-5 shrink-0" style={{ color, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--samurai-text)' }}>Reminders</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--samurai-muted)' }}>{stats.eventsRemindersNote}</div>
        </div>
      </div>
    </div>
  );
}
