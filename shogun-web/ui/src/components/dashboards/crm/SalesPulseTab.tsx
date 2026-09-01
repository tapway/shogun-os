import { useState } from 'react';
import { BarChart } from '../charts';
import type { CeoDashboardStats, ManagerEntry } from '../../../lib/types';

interface Props { 
  stats: CeoDashboardStats; 
  color: string;
  onDrillDown?: (owner: string) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

// Color palette for product mix visualization
const PRODUCT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export function SalesPulseTab({ stats, color, onDrillDown }: Props) {
  const [selectedManager, setSelectedManager] = useState<ManagerEntry | null>(null);

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

  // Handle manager click
  const handleManagerClick = (manager: ManagerEntry) => {
    if (onDrillDown) {
      onDrillDown(manager.owner);
    } else {
      setSelectedManager(manager);
    }
  };

  // If a manager is selected, show detail view
  if (selectedManager) {
    return (
      <div className="sd-stack" style={{ gap: 16 }}>
        {/* Back button */}
        <button
          onClick={() => setSelectedManager(null)}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 14px',
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: 'transparent',
            color: TEXT,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          ← Back to Sales Booking
        </button>

        {/* Manager Header */}
        <div className="sd-chart-card" style={{ padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: TEXT }}>
            {selectedManager.owner}
          </h2>
          <div style={{ marginTop: 8, fontSize: '0.9rem', color: MUTED }}>
            {selectedManager.deals} active deals · {selectedManager.wonDeals} won YTD
          </div>
        </div>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {/* Target Attainment */}
          <div className="sd-kpi-card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase' }}>
              🎯 Target Attainment
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: TEXT, marginTop: 8 }}>
              {ytdAttainment}%
            </div>
            <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 4 }}>
              attainment
            </div>
            <div style={{ fontSize: '0.85rem', color: TEXT, marginTop: 8 }}>
              RM {(selectedManager.salesYTD / 1_000_000).toFixed(1)}M of RM {(ytdTarget / 1_000_000).toFixed(1)}M
            </div>
          </div>

          {/* Win Rate */}
          <div className="sd-kpi-card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase' }}>
              Win Rate
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: TEXT, marginTop: 8 }}>
              {selectedManager.winRate}%
            </div>
            <div style={{ fontSize: '0.85rem', color: MUTED, marginTop: 8 }}>
              {selectedManager.wonDeals} won / {selectedManager.deals} handled
            </div>
          </div>

          {/* Pipeline */}
          <div className="sd-kpi-card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase' }}>
              Pipeline
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: TEXT, marginTop: 8 }}>
              RM {(selectedManager.pipelineValue / 1_000_000).toFixed(1)}M
            </div>
            <div style={{ fontSize: '0.85rem', color: MUTED, marginTop: 8 }}>
              Weighted: RM {(selectedManager.weightedPipeline / 1_000_000).toFixed(1)}M
            </div>
          </div>

          {/* At-Risk */}
          <div className="sd-kpi-card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase' }}>
              At-Risk
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444', marginTop: 8 }}>
              {Math.max(0, selectedManager.deals - selectedManager.wonDeals)} deals
            </div>
            <div style={{ fontSize: '0.85rem', color: MUTED, marginTop: 8 }}>
              RM {((selectedManager.pipelineValue - selectedManager.weightedPipeline) / 1_000_000).toFixed(1)}M
            </div>
          </div>
        </div>

        {/* Won Deals YTD */}
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>💰 Won Deals YTD</h3>
          <div style={{ fontSize: '0.9rem', color: TEXT }}>
            ({selectedManager.wonDeals} deals · RM {(selectedManager.salesYTD / 1_000_000).toFixed(1)}M)
          </div>
        </div>

        {/* Closing Timeline */}
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Closing Timeline</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.75rem', color: MUTED }}>This Month</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: TEXT, marginTop: 4 }}>
                RM {(selectedManager.closeThisMonth / 1000).toFixed(0)}K
              </div>
            </div>
            <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.75rem', color: MUTED }}>This Quarter</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: TEXT, marginTop: 4 }}>
                RM {(selectedManager.closeThisQ / 1000).toFixed(0)}K
              </div>
            </div>
            <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.75rem', color: MUTED }}>Next Quarter</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: TEXT, marginTop: 4 }}>
                RM {(selectedManager.closeNextQ / 1000).toFixed(0)}K
              </div>
            </div>
            <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.75rem', color: MUTED }}>This Year</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: TEXT, marginTop: 4 }}>
                RM {(selectedManager.closeThisYear / 1_000_000).toFixed(1)}M
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-stack" style={{ gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {KPIs.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: TEXT, marginTop: 6 }}>
              {kpi.value}
            </div>
            {kpi.sub && (
              <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 2 }}>
                {kpi.sub}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 8, lineHeight: 1.4 }}>
              {kpi.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Manager QTD Chart */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Manager Performance (QTD)</h3>
        <BarChart
          data={managerChartData}
          xKey="owner"
          yKey="salesQTD"
          color={color}
          height={200}
          unit="RM"
        />
      </div>

      {/* Product Mix Section with Stacked Bar */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Product Mix (by deal value)</h3>
        
        {/* Stacked percentage bar */}
        <div style={{ 
          display: 'flex', 
          height: 32, 
          borderRadius: 6, 
          overflow: 'hidden',
          marginBottom: 16,
          border: `1px solid ${BORDER}`,
        }}>
          {productMix.map((product, idx) => (
            <div
              key={product.product}
              style={{
                width: `${product.pct}%`,
                background: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#fff',
                minWidth: product.pct > 5 ? undefined : 0,
                overflow: 'hidden',
              }}
              title={`${product.product}: ${product.pct}%`}
            >
              {product.pct >= 8 ? `${product.pct}%` : ''}
            </div>
          ))}
        </div>

        {/* Legend / Detail list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {productMix.map((product, idx) => (
            <div key={product.product} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 6,
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: 3, 
                  background: PRODUCT_COLORS[idx % PRODUCT_COLORS.length],
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: TEXT }}>
                    {product.product}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: MUTED }}>
                    {product.count} deal{product.count !== 1 ? 's' : ''}
                  </div>
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
                  <tr 
                    key={manager.owner} 
                    onClick={() => handleManagerClick(manager)}
                    style={{ 
                      borderBottom: `1px solid ${BORDER}`,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: TEXT }}>
                      <span style={{ textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.textDecorationColor = color}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.textDecorationColor = 'transparent'}>
                        {manager.owner.length > 20 ? manager.owner.substring(0, 20) + '...' : manager.owner}
                      </span>
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
        <div style={{ marginTop: 8, fontSize: '0.75rem', color: MUTED, fontStyle: 'italic' }}>
          Click a manager name to view detailed breakdown
        </div>
      </div>
    </div>
  );
}
