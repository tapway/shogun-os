import { useState } from 'react';
import { MOCK_INCIDENTS, ON_CALL, type IncidentItem } from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

const SEVERITY_COLORS: Record<string, string> = {
  P0: '#ef4444',
  P1: '#f59e0b',
  P2: '#3b82f6',
  P3: '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#ef4444',
  investigating: '#f59e0b',
  resolved: '#10b981',
  postmortem: '#8b5cf6',
};

interface Props {
  dept: string;
  color: string;
}

export function IncidentsTab({ dept, color }: Props) {
  const [incidents] = useState(MOCK_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved'>('all');

  const filtered = incidents.filter(i => {
    if (filterStatus === 'active') return i.status === 'active' || i.status === 'investigating';
    if (filterStatus === 'resolved') return i.status === 'resolved' || i.status === 'postmortem';
    return true;
  });

  const activeCount = incidents.filter(i => i.status === 'active' || i.status === 'investigating').length;
  const resolvedThisWeek = incidents.filter(i => i.status === 'resolved').length;

  // Calculate MTTR from resolved incidents
  const resolvedIncidents = incidents.filter(i => i.resolvedAt && i.startedAt);
  const avgMttr = resolvedIncidents.length > 0
    ? Math.round(resolvedIncidents.reduce((sum, i) => {
        const start = new Date(i.startedAt).getTime();
        const end = new Date(i.resolvedAt!).getTime();
        return sum + (end - start) / 60000; // minutes
      }, 0) / resolvedIncidents.length)
    : 0;

  return (
    <div className="sd-stack" style={{ gap: 14 }}>
      {/* On-Call Card */}
      <div className="sd-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 4 }}>🔔 Currently On-Call</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT }}>{ON_CALL.current}</div>
          <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 2 }}>Shift ends: {new Date(ON_CALL.shiftEnd).toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 4 }}>Next Up</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{ON_CALL.next}</div>
        </div>
        <button className="sd-btn sd-btn-secondary" style={{ fontSize: '0.75rem' }}>📞 Escalate</button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {[
          { label: 'Active Incidents', value: activeCount, color: activeCount > 0 ? '#ef4444' : '#10b981' },
          { label: 'Resolved This Week', value: resolvedThisWeek, color: '#10b981' },
          { label: 'Avg MTTR', value: `${avgMttr}m`, color: avgMttr < 60 ? '#10b981' : '#f59e0b' },
          { label: 'Escalation Path', value: ON_CALL.escalationPath[0].split('→').length, color: TEXT },
        ].map(s => (
          <div key={s.label} className="sd-card" style={{ padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', color: MUTED }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['all', 'active', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            style={{
              padding: '4px 14px', borderRadius: 999, fontSize: '0.75rem', cursor: 'pointer',
              border: `1px solid ${filterStatus === f ? color : BORDER}`,
              background: filterStatus === f ? `${color}18` : 'transparent',
              color: filterStatus === f ? color : MUTED,
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Incident List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(incident => (
          <div
            key={incident.id}
            className="sd-card interactive"
            onClick={() => setSelectedIncident(incident)}
            style={{ padding: '12px 16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: `${SEVERITY_COLORS[incident.severity]}20`,
                  color: SEVERITY_COLORS[incident.severity],
                }}>
                  {incident.severity}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{incident.title}</span>
              </div>
              <span style={{
                fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99,
                background: `${STATUS_COLORS[incident.status]}20`,
                color: STATUS_COLORS[incident.status],
                fontWeight: 600, textTransform: 'capitalize',
              }}>
                {incident.status}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 6 }}>
              {incident.id} · Assigned to {incident.assignee} · Started {new Date(incident.startedAt).toLocaleString()}
              {incident.resolvedAt && ` · Resolved ${new Date(incident.resolvedAt).toLocaleString()}`}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="sd-btn sd-btn-primary">🚨 Report Incident</button>
        <button className="sd-btn sd-btn-secondary">📊 View Post-Mortems</button>
        <button className="sd-btn sd-btn-ghost">📅 On-Call Schedule</button>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSelectedIncident(null)}>
          <div className="sd-card" style={{ width: '90%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: `${SEVERITY_COLORS[selectedIncident.severity]}20`,
                    color: SEVERITY_COLORS[selectedIncident.severity],
                  }}>
                    {selectedIncident.severity}
                  </span>
                  <span style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99,
                    background: `${STATUS_COLORS[selectedIncident.status]}20`,
                    color: STATUS_COLORS[selectedIncident.status],
                    fontWeight: 600, textTransform: 'capitalize',
                  }}>
                    {selectedIncident.status}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: TEXT }}>{selectedIncident.title}</h3>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 4 }}>{selectedIncident.id}</div>
              </div>
              <button className="sd-btn sd-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelectedIncident(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: '0.8rem' }}>
              <div><span style={{ color: MUTED }}>Assignee:</span> <span style={{ color: TEXT }}>{selectedIncident.assignee}</span></div>
              <div><span style={{ color: MUTED }}>Started:</span> <span style={{ color: TEXT }}>{new Date(selectedIncident.startedAt).toLocaleString()}</span></div>
              {selectedIncident.resolvedAt && (
                <div><span style={{ color: MUTED }}>Resolved:</span> <span style={{ color: TEXT }}>{new Date(selectedIncident.resolvedAt).toLocaleString()}</span></div>
              )}
            </div>

            {/* Timeline */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: TEXT, marginBottom: 8 }}>Incident Timeline</div>
              <div style={{ fontSize: '0.75rem', color: MUTED, lineHeight: 1.8 }}>
                <div>🔴 {new Date(selectedIncident.startedAt).toLocaleTimeString()} — Incident detected via monitoring</div>
                <div>🟡 {new Date(new Date(selectedIncident.startedAt).getTime() + 300000).toLocaleTimeString()} — {selectedIncident.assignee} acknowledged</div>
                {selectedIncident.resolvedAt && (
                  <div>🟢 {new Date(selectedIncident.resolvedAt).toLocaleTimeString()} — Fix deployed, incident resolved</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(selectedIncident.status === 'active' || selectedIncident.status === 'investigating') && (
                <>
                  <button className="sd-btn sd-btn-primary" style={{ fontSize: '0.75rem' }}>💬 Join War Room</button>
                  <button className="sd-btn sd-btn-secondary" style={{ fontSize: '0.75rem' }}>✅ Mark Resolved</button>
                </>
              )}
              {selectedIncident.status === 'resolved' && (
                <button className="sd-btn sd-btn-secondary" style={{ fontSize: '0.75rem' }}>📝 Write Post-Mortem</button>
              )}
              <button className="sd-btn sd-btn-ghost" style={{ fontSize: '0.75rem' }}>🔗 Share Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
