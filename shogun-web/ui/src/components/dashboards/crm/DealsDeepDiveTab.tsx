import { BarChart } from '../charts';
import type { CeoDashboardStats } from '../../../lib/types';
import { CrmIcon } from './CrmIcons';
import type { CrmIconName } from './CrmIcons';

interface Props { stats: CeoDashboardStats; color: string }

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

// Priority icons
const PRIORITY_ICONS: Record<string, CrmIconName> = {
  'Hot': 'Flame',
  'Warm': 'Zap',
  'Cold': 'Snowflake',
  'High': 'Flame',
  'Medium': 'Zap',
  'Low': 'Snowflake',
};

export function DealsDeepDiveTab({ stats, color }: Props) {
  const KPIs = [
    { label: 'Active Deals', value: stats.totalActiveDeals.toString() },
    { label: 'Hot Deals', value: stats.hotDeals.toString() },
    { label: 'Warm Deals', value: stats.warmDeals.toString() },
    { label: 'Cold / Stale', value: stats.coldDeals.toString() },
  ];

  // Deals by manager (top 6)
  const dealsByManager = [...stats.byManager]
    .filter(m => m.deals > 0)
    .sort((a, b) => b.deals - a.deals)
    .slice(0, 6)
    .map(m => ({
      owner: m.owner.length > 12 ? m.owner.substring(0, 12) + '…' : m.owner,
      deals: m.deals,
    }));

  // Deals by priority
  const dealsByPriority = stats.byPriority
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count);

  // Top partners by deal count
  const topPartners = [...stats.byPartner]
    .filter(p => p.dealsWon + p.pipelineDeals > 0)
    .map(p => ({ ...p, totalDeals: p.dealsWon + p.pipelineDeals }))
    .sort((a, b) => b.totalDeals - a.totalDeals)
    .slice(0, 5);

  // Manager × Partner matrix (top 15)
  const matrixTop = [...stats.byManagerByPartner]
    .sort((a, b) => b.deals - a.deals)
    .slice(0, 15);

  return (
    <div className="sd-stack" style={{ gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {KPIs.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Deals by Manager</h3>
          <BarChart
            data={dealsByManager}
            xKey="owner"
            yKey="deals"
            color={color}
            unit=""
            height={220}
          />
        </div>
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Deals by Priority</h3>
          <BarChart
            data={dealsByPriority}
            xKey="priority"
            yKey="count"
            color={color}
            unit=""
            height={220}
          />
        </div>
      </div>

      {/* Deals by Partner Chart */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Deals by Partner (Top Deals)</h3>
        <BarChart
          data={topPartners}
          xKey="partner"
          yKey="totalDeals"
          color={color}
          unit=""
          height={220}
        />
      </div>

      {/* Top 15 Deals Table */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CrmIcon name="Trophy" size={16} />
          Top 15 Deals
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Deal</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Amount</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Prio</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Mgr</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Partner</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Prob</th>
              </tr>
            </thead>
            <tbody>
              {stats.topDeals.slice(0, 15).map((deal) => (
                <tr key={deal.slug} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: TEXT, maxWidth: 300 }}>
                    <div style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      maxWidth: 300,
                    }}>
                      {deal.title}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT, whiteSpace: 'nowrap' }}>
                    RM {deal.amount >= 1_000_000
                      ? `${(deal.amount / 1_000_000).toFixed(1)}M`
                      : `${(deal.amount / 1000).toFixed(0)}K`}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <CrmIcon name={PRIORITY_ICONS[deal.priority] || PRIORITY_ICONS['Cold'] || 'Snowflake'} size={14} />
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: MUTED }}>
                    {deal.owner ? deal.owner.substring(0, 3).toUpperCase() : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: MUTED }}>
                    {deal.partner 
                      ? (deal.partner.length > 10 ? deal.partner.substring(0, 10) + '…' : deal.partner)
                      : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                    {deal.winProbability}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manager × Partner Matrix */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Manager × Partner Matrix</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Manager</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Partner</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Deals</th>
              </tr>
            </thead>
            <tbody>
              {matrixTop.map((row, idx) => (
                <tr key={`${row.owner}-${row.partner}-${idx}`} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: TEXT }}>
                    {row.owner.substring(0, 3).toUpperCase()}
                  </td>
                  <td style={{ padding: '8px 12px', color: TEXT }}>
                    {row.partner.length > 20 ? row.partner.substring(0, 20) + '…' : row.partner}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                    {row.deals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
