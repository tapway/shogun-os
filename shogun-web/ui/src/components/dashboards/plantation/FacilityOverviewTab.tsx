import { useMemo } from 'react';
import { Building2, MapPin, ClipboardCheck, AlertTriangle, Clock, TrendingUp, ShieldAlert } from 'lucide-react';
import { BarChart, LineChart } from '../charts';
import type { FacilityStats } from '../../../lib/types';

interface Props {
  stats: FacilityStats;
  color: string;
  onNavigateTab?: (tabId: string) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const DANGER = 'var(--samurai-danger)';
const OK = 'var(--samurai-ok)';
const WARNING = 'var(--samurai-warning)';

export function FacilityOverviewTab({ stats, color, onNavigateTab }: Props) {
  const KPIs = [
    {
      label: 'Total Locations',
      value: `${stats.total_locations}`,
      icon: MapPin,
      targetTab: 'locations',
    },
    {
      label: 'Avg Compliance Score',
      value: `${Math.round(stats.avg_score)}%`,
      icon: TrendingUp,
      warn: stats.avg_score < 70,
      targetTab: 'reports',
    },
    {
      label: 'Open Actions',
      value: `${stats.open_actions}`,
      icon: ClipboardCheck,
      warn: stats.open_actions > 0,
      targetTab: 'reports',
    },
    {
      label: 'Overdue Inspections',
      value: `${stats.overdue_inspections}`,
      icon: Clock,
      warn: stats.overdue_inspections > 0,
      targetTab: 'locations',
    },
    {
      label: 'Critical Alerts',
      value: `${stats.critical_alerts}`,
      icon: ShieldAlert,
      warn: stats.critical_alerts > 0,
      targetTab: 'reports',
    },
  ];

  return (
    <div className="sd-stack">
      {/* KPI Grid */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {KPIs.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="sd-kpi-card"
              style={{ cursor: m.targetTab ? 'pointer' : 'default' }}
              onClick={() => m.targetTab && onNavigateTab?.(m.targetTab)}
            >
              <div className="sd-kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </div>
              <div
                className="sd-kpi-value"
                style={{ color: m.warn ? DANGER : TEXT }}
              >
                {m.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Compliance Trend</h3>
          <p className="sd-chart-sub">Monthly average score over time</p>
          <LineChart
            data={stats.compliance_trend}
            xKey="month"
            yKey="score"
            color="var(--samurai-lime)"
            unit="%"
          />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Score by Location Type</h3>
          <p className="sd-chart-sub">Average compliance score per category</p>
          <BarChart
            data={stats.score_by_type}
            xKey="type"
            yKey="score"
            color={TEXT}
            xAngle={-25}
          />
        </div>
      </div>

      {/* Bottom Row: Top Violations + Recent Inspections */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Top Violations */}
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Top Violations</h3>
          <p className="sd-chart-sub">Most frequently failed checklist items</p>
          {stats.top_violations.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: MUTED, fontSize: '0.85rem' }}>
              No violations recorded yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {stats.top_violations.slice(0, 8).map((v, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--samurai-surface-2)',
                    border: '1px solid var(--samurai-border)',
                    cursor: 'pointer',
                  }}
                  onClick={() => onNavigateTab?.('reports')}
                >
                  <span style={{ fontSize: '0.8rem', color: TEXT }}>{v.item}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: v.count > 3 ? DANGER : WARNING,
                    }}
                  >
                    {v.count}×
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Inspections */}
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Recent Inspections</h3>
          <p className="sd-chart-sub">Latest inspection results</p>
          {stats.recent_inspections.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: MUTED, fontSize: '0.85rem' }}>
              No inspections recorded yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {stats.recent_inspections.slice(0, 6).map((insp) => (
                <div
                  key={insp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--samurai-surface-2)',
                    border: '1px solid var(--samurai-border)',
                    cursor: 'pointer',
                  }}
                  onClick={() => onNavigateTab?.('reports')}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT }}>
                      Location #{insp.location_id}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: MUTED }}>
                      {insp.inspection_date ? new Date(insp.inspection_date).toLocaleDateString() : ''} · {insp.inspected_by || 'Unknown'}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: (insp.overall_score ?? 0) >= 80 ? OK : (insp.overall_score ?? 0) >= 60 ? WARNING : DANGER,
                    }}
                  >
                    {insp.overall_score != null ? `${Math.round(insp.overall_score)}%` : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
