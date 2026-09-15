import { useState } from 'react';
import { MOCK_PRS, type PrItem } from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  approved: '#10b981',
  changes_requested: '#f59e0b',
  merged: '#6b7280',
  draft: '#9ca3af',
};

const CI_COLORS: Record<string, string> = {
  passing: '#10b981',
  failing: '#ef4444',
  pending: '#f59e0b',
  skipped: '#6b7280',
};

interface Props {
  dept: string;
  color: string;
}

export function PullRequestsTab({ dept, color }: Props) {
  const [prs] = useState(MOCK_PRS);
  const [filter, setFilter] = useState<'all' | 'mine' | 'review' | 'failing' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'age' | 'additions'>('age');
  const [selectedPr, setSelectedPr] = useState<PrItem | null>(null);

  const filtered = prs.filter(pr => {
    if (filter === 'mine') return pr.author === 'Aisha'; // mock "current user"
    if (filter === 'review') return pr.reviewers.includes('Aisha') && pr.status === 'open';
    if (filter === 'failing') return pr.ciStatus === 'failing';
    if (filter === 'draft') return pr.status === 'draft';
    return true;
  }).sort((a, b) => sortBy === 'age' ? b.ageHours - a.ageHours : b.additions - a.additions);

  const stats = {
    open: prs.filter(p => p.status === 'open').length,
    approved: prs.filter(p => p.status === 'approved').length,
    failing: prs.filter(p => p.ciStatus === 'failing').length,
    avgAge: Math.round(prs.filter(p => p.status !== 'merged').reduce((a, p) => a + p.ageHours, 0) / Math.max(1, prs.filter(p => p.status !== 'merged').length)),
  };

  return (
    <div className="sd-stack" style={{ gap: 12 }}>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {[
          { label: 'Open PRs', value: stats.open, color: '#3b82f6' },
          { label: 'Approved', value: stats.approved, color: '#10b981' },
          { label: 'CI Failing', value: stats.failing, color: '#ef4444' },
          { label: 'Avg Age', value: `${stats.avgAge}h`, color: stats.avgAge > 24 ? '#f59e0b' : '#10b981' },
        ].map(s => (
          <div key={s.label} className="sd-card" style={{ padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', color: MUTED }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'mine', 'review', 'failing', 'draft'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', cursor: 'pointer',
              border: `1px solid ${filter === f ? color : BORDER}`,
              background: filter === f ? `${color}18` : 'transparent',
              color: filter === f ? color : MUTED,
            }}
          >
            {f === 'all' ? 'All' : f === 'mine' ? 'My PRs' : f === 'review' ? 'Needs My Review' : f === 'failing' ? 'CI Failing' : 'Drafts'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: MUTED }}>Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'age' | 'additions')}
            style={{ background: 'var(--samurai-surface-2)', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '3px 6px', fontSize: '0.72rem', cursor: 'pointer' }}
          >
            <option value="age">Oldest First</option>
            <option value="additions">Largest Diff</option>
          </select>
        </div>
      </div>

      {/* PR Table */}
      <div className="sd-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {['PR', 'Title', 'Author', 'CI', 'Status', 'Age', '+/-', 'Reviewers'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: MUTED, fontWeight: 600, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(pr => (
              <tr
                key={pr.id}
                onClick={() => setSelectedPr(pr)}
                style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--samurai-hover-ui)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: MUTED }}>#{pr.id}</td>
                <td style={{ padding: '10px 12px', color: TEXT, maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.title}</td>
                <td style={{ padding: '10px 12px', color: MUTED }}>{pr.author}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: '0.68rem', color: CI_COLORS[pr.ciStatus],
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: CI_COLORS[pr.ciStatus] }} />
                    {pr.ciStatus}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99,
                    background: `${STATUS_COLORS[pr.status]}20`,
                    color: STATUS_COLORS[pr.status],
                    fontWeight: 600,
                  }}>
                    {pr.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: pr.ageHours > 48 ? '#ef4444' : MUTED }}>{pr.ageHours}h</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  <span style={{ color: '#10b981' }}>+{pr.additions}</span>{' '}
                  <span style={{ color: '#ef4444' }}>-{pr.deletions}</span>
                </td>
                <td style={{ padding: '10px 12px', color: MUTED, fontSize: '0.72rem' }}>
                  {pr.reviewers.length > 0 ? pr.reviewers.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: MUTED, fontSize: '0.8rem' }}>No PRs match this filter</div>
        )}
      </div>

      {/* PR Detail Modal */}
      {selectedPr && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSelectedPr(null)}>
          <div className="sd-card" style={{ width: '90%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: MUTED }}>#{selectedPr.id}</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1rem', color: TEXT }}>{selectedPr.title}</h3>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 4 }}>{selectedPr.branch}</div>
              </div>
              <button className="sd-btn sd-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelectedPr(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: '0.8rem' }}>
              <div><span style={{ color: MUTED }}>Author:</span> <span style={{ color: TEXT }}>{selectedPr.author}</span></div>
              <div><span style={{ color: MUTED }}>Status:</span> <span style={{ color: STATUS_COLORS[selectedPr.status] }}>{selectedPr.status.replace('_', ' ')}</span></div>
              <div><span style={{ color: MUTED }}>CI:</span> <span style={{ color: CI_COLORS[selectedPr.ciStatus] }}>{selectedPr.ciStatus}</span></div>
              <div><span style={{ color: MUTED }}>Age:</span> <span style={{ color: TEXT }}>{selectedPr.ageHours}h</span></div>
              <div><span style={{ color: MUTED }}>Diff:</span> <span style={{ color: '#10b981' }}>+{selectedPr.additions}</span> <span style={{ color: '#ef4444' }}>-{selectedPr.deletions}</span></div>
              <div><span style={{ color: MUTED }}>Reviewers:</span> <span style={{ color: TEXT }}>{selectedPr.reviewers.join(', ') || 'None'}</span></div>
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
              {selectedPr.labels.map(l => (
                <span key={l} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: 'var(--samurai-surface-2)', color: MUTED }}>{l}</span>
              ))}
            </div>

            {/* Actions */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedPr.ciStatus === 'failing' && (
                <button className="sd-btn sd-btn-primary" style={{ fontSize: '0.75rem' }}>🔧 View CI Logs</button>
              )}
              {selectedPr.status === 'open' && (
                <>
                  <button className="sd-btn sd-btn-secondary" style={{ fontSize: '0.75rem' }}>✅ Approve</button>
                  <button className="sd-btn sd-btn-secondary" style={{ fontSize: '0.75rem' }}>💬 Request Changes</button>
                </>
              )}
              {selectedPr.status === 'approved' && (
                <button className="sd-btn sd-btn-primary" style={{ fontSize: '0.75rem' }}>🔀 Merge</button>
              )}
              <button className="sd-btn sd-btn-ghost" style={{ fontSize: '0.75rem' }}>📋 Copy Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
