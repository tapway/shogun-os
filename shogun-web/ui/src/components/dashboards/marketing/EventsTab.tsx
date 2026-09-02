import { useState } from 'react';
import { Check, Circle, Bell } from 'lucide-react';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

export function EventsTab({ stats, color }: Props) {
  const [view, setView] = useState<'list' | 'calendar' | 'timeline'>('list');

  const upcoming = stats.events.filter((e) => e.status === 'upcoming');
  const past = stats.events.filter((e) => e.status === 'past');

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
          {/* Upcoming events */}
          {upcoming.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, marginBottom: 8 }}>Upcoming</h3>
              {upcoming.map((event) => (
                <div key={event.id} className="sd-chart-card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{event.name}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{event.date} · {event.location}</div>
                    </div>
                    {event.daysUntil !== undefined && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color }}>{event.daysUntil} days</span>
                    )}
                  </div>
                  {/* Task checklist */}
                  {event.tasks && event.tasks.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: 4 }}>
                        {event.tasks.filter((t) => t.done).length}/{event.tasks.length} done
                      </div>
                      {event.tasks.map((task) => (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: '0.8rem' }}>
                          {task.done
                            ? <Check className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />
                            : <Circle className="h-3.5 w-3.5" style={{ opacity: 0.3 }} />
                          }
                          <span style={{ textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.5 : 1 }}>
                            {task.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Past events */}
          {past.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.7, marginBottom: 8 }}>Past</h3>
              {past.map((event) => (
                <div key={event.id} className="sd-chart-card" style={{ marginBottom: 8, opacity: 0.7 }}>
                  <div style={{ fontWeight: 600 }}>{event.name}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{event.date} · {event.location}</div>
                  {event.tasks && event.tasks.length > 0 && (
                    <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.5 }}>
                      {event.tasks.filter((t) => t.done).length}/{event.tasks.length} done
                    </div>
                  )}
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
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Reminders</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{stats.eventsRemindersNote}</div>
        </div>
      </div>
    </div>
  );
}
