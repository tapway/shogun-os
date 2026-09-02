import { useState } from 'react';
import { Check, Circle, Bell } from 'lucide-react';
import type { MarketingDashboardStats, MarketingEventTask } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function EventsTab({ stats, color }: Props) {
  const [view, setView] = useState<'list' | 'calendar' | 'timeline'>('list');
  // Local task state — keyed by "eventId:taskId"
  const [taskOverrides, setTaskOverrides] = useState<Record<string, boolean>>({});

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

      {(view === 'calendar' || view === 'timeline') && (
        <div className="sd-empty">
          <p style={{ opacity: 0.5 }}>{view === 'calendar' ? '📅 Calendar view coming soon' : '📌 Timeline view coming soon'}</p>
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
