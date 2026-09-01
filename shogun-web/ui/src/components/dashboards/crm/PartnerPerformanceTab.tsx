import { BarChart } from '../charts';
import type { CeoDashboardStats } from '../../../lib/types';

interface Props { stats: CeoDashboardStats; color: string }

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const WARN = 'var(--samurai-warn, #f59e0b)';

export function PartnerPerformanceTab({ stats, color }: Props) {
  // Calculate partner totals
  const totalBooking = stats.byPartner.reduce((sum, p) => sum + p.booking, 0);
  const totalDealsWon = stats.byPartner.reduce((sum, p) => sum + p.dealsWon, 0);
  const totalPipelineDeals = stats.byPartner.reduce((sum, p) => sum + p.pipelineDeals, 0);
  const totalPipelineValue = stats.byPartner.reduce((sum, p) => sum + p.pipelineValue, 0);
  
  // Partner win rate
  const totalWinNum = stats.byPartner.reduce((sum, p) => sum + (p.winRate > 0 ? Math.round(p.dealsWon * p.winRate / 100) : 0), 0);
  const totalWinDen = stats.byPartner.reduce((sum, p) => sum + p.dealsWon, 0);
  const partnerWinRate = totalWinDen > 0 ? Math.round((totalDealsWon / (totalDealsWon + stats.byPartner.filter(p => p.dealsWon === 0 && p.pipelineDeals > 0).length)) * 100) : 0;
  
  // Average deal size for partners vs direct
  const partnerAvgDeal = totalDealsWon > 0 ? Math.round(totalBooking / totalDealsWon) : 0;
  const directAvgDeal = 35_000; // RM 35K placeholder

  // Booking percentage
  const bookingPct = stats.salesYTD > 0 ? Math.round((totalBooking / stats.salesYTD) * 100) : 0;

  const KPIs = [
    {
      label: 'Partner Booking',
      value: `RM ${(totalBooking / 1_000_000).toFixed(1)}M`,
      detail: `${bookingPct}% of total booking`,
    },
    {
      label: 'Partner Deals Won',
      value: totalDealsWon.toString(),
      detail: `${totalPipelineDeals} in pipeline · RM ${(totalPipelineValue / 1_000_000).toFixed(1)}M`,
    },
    {
      label: 'Partner Win Rate',
      value: `${partnerWinRate}%`,
      detail: 'Industry avg 25-35%',
    },
    {
      label: 'Partner Avg Deal',
      value: `RM ${(partnerAvgDeal / 1000).toFixed(0)}K`,
      detail: `vs RM ${(directAvgDeal / 1000).toFixed(0)}K direct`,
    },
  ];

  // Top partners by booking (for chart)
  const topByBooking = [...stats.byPartner]
    .filter(p => p.booking > 0)
    .sort((a, b) => b.booking - a.booking)
    .slice(0, 7);

  // Top partners by pipeline value (for chart)
  const topByPipeline = [...stats.byPartner]
    .filter(p => p.pipelineValue > 0)
    .sort((a, b) => b.pipelineValue - a.pipelineValue)
    .slice(0, 7);

  // Top partners by deal count (for chart)
  const topByDeals = [...stats.byPartner]
    .filter(p => p.dealsWon + p.pipelineDeals > 0)
    .map(p => ({ ...p, totalDeals: p.dealsWon + p.pipelineDeals }))
    .sort((a, b) => b.totalDeals - a.totalDeals)
    .slice(0, 7);

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
            <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 6 }}>
              {kpi.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Booking by Partner</h3>
          <p className="sd-chart-sub">Click bar to filter</p>
          <BarChart
            data={topByBooking}
            xKey="partner"
            yKey="booking"
            color={color}
            unit="RM "
            height={240}
          />
        </div>
        <div className="sd-chart-card" style={{ flex: 1 }}>
          <h3 className="sd-chart-title">Partner Pipeline Value</h3>
          <p className="sd-chart-sub">Click bar to filter</p>
          <BarChart
            data={topByPipeline}
            xKey="partner"
            yKey="pipelineValue"
            color={color}
            unit="RM "
            height={240}
          />
        </div>
      </div>

      {/* Deals by Partner Chart */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Deals by Partner</h3>
        <BarChart
          data={topByDeals}
          xKey="partner"
          yKey="totalDeals"
          color={color}
          unit=""
          height={220}
        />
      </div>

      {/* At-Risk by Partner Table */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: WARN }}>⚠</span> At-Risk by Partner
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Partner</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>At-Risk Deals</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>At-Risk Value</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Manager</th>
              </tr>
            </thead>
            <tbody>
              {stats.atRiskByPartner
                .sort((a, b) => b.atRiskValue - a.atRiskValue)
                .map((partner) => (
                  <tr key={partner.partner} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: TEXT }}>
                      {partner.partner}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      {partner.atRiskDeals}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      RM {partner.atRiskValue >= 1_000_000
                        ? `${(partner.atRiskValue / 1_000_000).toFixed(1)}M`
                        : `${(partner.atRiskValue / 1000).toFixed(0)}K`}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: MUTED }}>
                      {partner.primaryOwner ? partner.primaryOwner.substring(0, 3).toUpperCase() : '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partner Breakdown Table */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Partner Breakdown</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Partner</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Booking</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Pipeline</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Deals</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Win Rate</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: MUTED, fontWeight: 600 }}>Manager</th>
              </tr>
            </thead>
            <tbody>
              {stats.byPartner
                .filter(p => p.booking > 0 || p.pipelineValue > 0 || p.dealsWon > 0 || p.pipelineDeals > 0)
                .sort((a, b) => b.booking - a.booking)
                .map((partner) => (
                  <tr key={partner.partner} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: TEXT }}>
                      {partner.partner.length > 30 ? partner.partner.substring(0, 30) + '...' : partner.partner}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      {partner.booking > 0
                        ? `RM ${partner.booking >= 1_000_000
                            ? `${(partner.booking / 1_000_000).toFixed(1)}M`
                            : `${(partner.booking / 1000).toFixed(0)}K`}`
                        : 'RM 0'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      {partner.pipelineValue > 0
                        ? `RM ${partner.pipelineValue >= 1_000_000
                            ? `${(partner.pipelineValue / 1_000_000).toFixed(1)}M`
                            : `${(partner.pipelineValue / 1000).toFixed(0)}K`}`
                        : 'RM 0'}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      {partner.dealsWon + partner.pipelineDeals}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: TEXT }}>
                      {partner.winRate}%
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: MUTED }}>
                      {partner.primaryOwner ? partner.primaryOwner.substring(0, 3).toUpperCase() : '-'}
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
