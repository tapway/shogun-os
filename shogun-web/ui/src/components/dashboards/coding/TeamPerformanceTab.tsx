import { useState } from 'react';
import { MOCK_DEV_METRICS, SKILL_MATRIX, VELOCITY_HISTORY } from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

interface Props {
  dept: string;
  color: string;
}

export function TeamPerformanceTab({ dept, color }: Props) {
  const [view, setView] = useState<'metrics' | 'skills' | 'velocity'>('metrics');
  const [selectedDev, setSelectedDev] = useState<string | null>(null);

  const views = [
    { id: 'metrics' as const, label: 'Dev Metrics' },
    { id: 'skills' as const, label: 'Skill Matrix' },
    { id: 'velocity' as const, label: 'Velocity Trend' },
  ];

  const maxCommits = Math.max(...MOCK_DEV_METRICS.map(d => d.commits));

  return (
    <div className="sd-stack" style={{ gap: 14 }}>
      {/* View Switcher */}
      <div style={{ display: 'flex', gap: 6 }}>
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: '0.78rem', cursor: 'pointer',
              border: `1px solid ${view === v.id ? color : BORDER}`,
              background: view === v.id ? `${color}18` : 'transparent',
              color: view === v.id ? color : MUTED,
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Dev Metrics View */}
      {view === 'metrics' && (
        <div className="sd-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['Developer', 'Commits', 'PRs Opened', 'PRs Reviewed', 'Lines +/-', 'Coverage Δ'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: MUTED, fontWeight: 600, fontSize: '0.7rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_DEV_METRICS.map(dev => (
                <tr
                  key={dev.name}
                  onClick={() => setSelectedDev(selectedDev === dev.name ? null : dev.name)}
                  style={{
                    borderBottom: `1px solid ${BORDER}`, cursor: 'pointer',
                    background: selectedDev === dev.name ? 'var(--samurai-hover-ui)' : 'transparent',
                    transition: 'background 150ms',
                  }}
                >
                  <td style={{ padding: '10px 12px', color: TEXT, fontWeight: 600 }}>{dev.name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: TEXT }}>{dev.commits}</span>
                      <div style={{ width: 40, height: 4, background: 'var(--samurai-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(dev.commits / maxCommits) * 100}%`, background: color, borderRadius: 99 }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: TEXT }}>{dev.prsOpened}</td>
                  <td style={{ padding: '10px 12px', color: TEXT }}>{dev.prsReviewed}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                    <span style={{ color: '#10b981' }}>+{dev.linesAdded}</span>{' '}
                    <span style={{ color: '#ef4444' }}>-{dev.linesRemoved}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: dev.coverageDelta >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                    {dev.coverageDelta > 0 ? '+' : ''}{dev.coverageDelta}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedDev && (
            <div style={{ padding: 12, borderTop: `1px solid ${BORDER}`, background: 'var(--samurai-surface-2)', fontSize: '0.75rem', color: MUTED }}>
              💡 Click a row to see details. In production, this would show commit history, PR links, and code review comments for {selectedDev}.
            </div>
          )}
        </div>
      )}

      {/* Skill Matrix View */}
      {view === 'skills' && (
        <div className="sd-card" style={{ padding: 16, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${Object.keys(SKILL_MATRIX[0].skills).length}, 1fr)`, gap: 1, fontSize: '0.75rem' }}>
            {/* Header Row */}
            <div style={{ padding: 8, fontWeight: 600, color: MUTED }}>Dev</div>
            {Object.keys(SKILL_MATRIX[0].skills).map(skill => (
              <div key={skill} style={{ padding: 8, textAlign: 'center', fontWeight: 600, color: TEXT }}>{skill}</div>
            ))}

            {/* Data Rows */}
            {SKILL_MATRIX.map(dev => (
              <>
                <div key={dev.name + '-label'} style={{ padding: 8, fontWeight: 600, color: TEXT, display: 'flex', alignItems: 'center' }}>{dev.name}</div>
                {Object.entries(dev.skills).map(([skill, level]) => (
                  <div
                    key={`${dev.name}-${skill}`}
                    style={{
                      padding: 8, textAlign: 'center', cursor: 'pointer',
                      background: `rgba(${level >= 4 ? '16,185,129' : level >= 3 ? '59,130,246' : level >= 2 ? '245,158,11' : '239,68,68'}, ${level * 0.12})`,
                      borderRadius: 4, margin: 1,
                      transition: 'transform 150ms',
                    }}
                    title={`${dev.name}: ${skill} — Level ${level}/5`}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <span style={{ fontWeight: 700, color: TEXT }}>{level}</span>
                    <span style={{ fontSize: '0.6rem', color: MUTED }}>/5</span>
                  </div>
                ))}
              </>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: '0.68rem', color: MUTED, justifyContent: 'center' }}>
            <span>🟢 4-5 Expert</span>
            <span>🔵 3 Proficient</span>
            <span>🟡 2 Developing</span>
            <span>🔴 1 Beginner</span>
          </div>
        </div>
      )}

      {/* Velocity Trend View */}
      {view === 'velocity' && (
        <div className="sd-card" style={{ padding: 16 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '0.85rem', color: TEXT }}>Sprint Velocity (Last 6 Sprints)</h4>
          <svg viewBox="0 0 500 180" style={{ width: '100%', height: 180 }}>
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => (
              <line key={f} x1={40} y1={10 + f * 140} x2={480} y2={10 + f * 140} stroke={BORDER} strokeWidth={0.5} />
            ))}
            {/* Y-axis labels */}
            <text x={5} y={18} fontSize={8} fill={MUTED}>50</text>
            <text x={5} y={88} fontSize={8} fill={MUTED}>25</text>
            <text x={5} y={158} fontSize={8} fill={MUTED}>0</text>

            {/* Bars */}
            {VELOCITY_HISTORY.map((v, i) => {
              const barW = 50;
              const gap = (440 - VELOCITY_HISTORY.length * barW) / (VELOCITY_HISTORY.length + 1);
              const x = 40 + gap + i * (barW + gap);
              const barH = (v.points / 50) * 140;
              const isCurrent = i === VELOCITY_HISTORY.length - 1;
              return (
                <g key={v.sprint}>
                  <rect
                    x={x} y={150 - barH} width={barW} height={barH}
                    rx={4}
                    fill={isCurrent ? color : 'var(--samurai-surface-2)'}
                    stroke={isCurrent ? color : BORDER}
                    strokeWidth={1}
                    style={{ cursor: 'pointer' }}
                  />
                  <text x={x + barW / 2} y={145 - barH} textAnchor="middle" fontSize={9} fontWeight={600} fill={TEXT}>{v.points}</text>
                  <text x={x + barW / 2} y={168} textAnchor="middle" fontSize={7} fill={MUTED}>{v.sprint}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: MUTED, marginTop: 8 }}>
            Average: {Math.round(VELOCITY_HISTORY.slice(0, -1).reduce((a, b) => a + b.points, 0) / (VELOCITY_HISTORY.length - 1))} pts/sprint
          </div>
        </div>
      )}
    </div>
  );
}
