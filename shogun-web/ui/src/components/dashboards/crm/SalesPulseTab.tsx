import { BarChart } from '../charts';
import type { CeoDashboardStats } from '../../../lib/types';

interface Props { stats: CeoDashboardStats; color: string }

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

export function SalesPulseTab({ stats, color }: Props) {
  // Calculate attainment percentages (targets would come from config in production)
  const mtdTarget = 1_200_000; // RM 1.2M
  const qtdTarget = 3_600_000; // RM 3.6M  
  const ytdTarget = 9_500_000; // RM 9.5M
  
  const mtdAttainment = Math.round((stats.salesMTD / mtdTarget) * 100);
  const qtdAttainment = Math.round((stats.salesQTD / qtdTarget) * 100);
  const ytdAttainment = Math.round((stats.salesYTD / ytdTarget) * 100);

  // Get current month/quarter/year labels
  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const quarterLabel = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
  const yearLabel = now.getFullYear().toString();

  // Last quarter avg deal size comparison (simplified - would need historical data)
  const lastQuarterAvg = 38_000; // RM 38K placeholder

  const KPIs = [
    { 
      label: 'Sales MTD', 
      value: `RM ${(stats.salesMTD / 1000).toFixed(0)}K`,
      sub: monthLabel,
      detail: `${mtdAttainment}% attainment of RM ${(mtdTarget / 1_000_000).toFixed(1)}M target`
    },
    { 
      label: 'Sales QTD', 
      value: `RM ${(stats.salesQTD / 1000).toFixed(0)}K`,
      sub: quarterLabel,
      detail: `${qtdAttainment}% attainment of RM ${(qtdTarget / 1_000_000).toFixed(1)}M target`
    },
    { 
      label: 'Sales YTD', 
      value: `RM ${(stats.salesYTD / 1_000_000).toFixed(1)}M`,
      sub: yearLabel,
      detail: `${ytdAttainment}% attainment of RM ${(ytdTarget / 1_000_000).toFixed(1)}M target`
    },
    { 
      label: 'Avg Deal Size', 
      value: `RM ${(stats.avgDealSize / 1_000_000).toFixed(1)}M`,
      sub: '',
      detail: `vs RM ${(lastQuarterAvg / 1000).toFixed(0)}K last quarter`
    },
  ];

  // Filter managers with actual deals for the chart
  const managerChartData = stats.byManager
    .filter(m => m.deals > 0 || m.salesYTD > 0)
    .map(m => ({
      owner: m.owner.length > 12 ? m.owner.substring(0, 12) + '...' : m.owner,
      salesQTD: m.salesQTD,
    }))
    .sort((a, b) => b.salesQTD - a.salesQTD);

  // Product mix data sorted by value descending
  const productMix = [...stats.byProduct]
    .sort((a, b) => b.value - a.value)
    .map(p => ({
      ...p,
      pct: stats.totalPipelineValue > 0 ? Math.round((p.value / stats.totalPipelineValue) * 100) : 0,
    }));

  return (
    <div className="sd-stack" style={{ gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {KPIs.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>
              {kpi.value}
            </div>
            {kpi.sub && (
              <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 2 }}>
                {kpi.sub}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 6 }}>
              {kpi.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Sales Booking by Manager — {quarterLabel}</h3>
          <p className="sd-chart-sub">Click bar to filter</p>
          <BarChart
            data={managerChartData}
            xKey="owner"
            yKey="salesQTD"
            color={color}
            unit="RM "
            height={240}
          />
        </div>
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Deals Won by Month</h3>
          <p className="sd-chart-sub">Click bar to filter</p>
          <BarChart
            data={stats.wonByMonth}
            xKey="month"
            yKey="value"
            color={color}
            unit="RM "
            height={240}
          />
        </div>
      </div>

      {/* Product Mix Section */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Product Mix (by deal value)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {productMix.map((product) => (
            <div key={product.product} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 6,
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: TEXT }}>
                  {product.product}
                </div>
                <div style={{ fontSize: '0.75rem', color: MUTED }}>
                  {product.count} deal{product.count !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>
                  RM {product.value >= 1_000_000 
                    ? `${(product.value / 1_000_000).toFixed(1)}M`
                    : `${(product.value / 1000).toFixed(0)}K`}
                </div>
                <div style={{ fontSize: '0.75rem', color: MUTED }}>
                  {product.pct}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manager Breakdown Table */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Manager Breakdown</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Manager</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>MTD</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>QTD</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>YTD</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Deals</th>
              </tr>
            </thead>
            <tbody>
              {stats.byManager
                .filter(m => m.deals > 0 || m.salesYTD > 0)
                .sort((a, b) => b.salesYTD - a.salesYTD)
                .map((manager) => (
                  <tr key={manager.owner} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: TEXT }}>
                      {manager.owner.length > 20 ? manager.owner.substring(0, 20) + '...' : manager.owner}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      RM {(manager.salesMTD / 1000).toFixed(0)}K
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      RM {(manager.salesQTD / 1000).toFixed(0)}K
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      RM {manager.salesYTD >= 1_000_000 
                        ? `${(manager.salesYTD / 1_000_000).toFixed(1)}M`
                        : `${(manager.salesYTD / 1000).toFixed(0)}K`}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      {manager.deals}
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
