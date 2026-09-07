import { useState } from 'react';
import { BarChart } from '../charts';
import type { CeoDashboardStats, ManagerEntry } from '../../../lib/types';
import { CrmIcon } from './CrmIcons';

interface Props { 
  stats: CeoDashboardStats; 
  color: string;
  onDrillDown?: (owner: string) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const WARN = 'var(--samurai-warn, #f59e0b)';

// Manager targets (would come from config in production)
// Manager targets not yet available from backend — attainment display disabled
// TODO: Pull targets from config/backend when available

export function ManagerPerformanceTab({ stats, color, onDrillDown }: Props) {
  const [selectedManager, setSelectedManager] = useState<ManagerEntry | null>(null);

  const handleManagerClick = (manager: ManagerEntry) => {
    if (onDrillDown) {
      onDrillDown(manager.owner);
    } else {
      setSelectedManager(manager);
    }
  };

  // Filter managers with actual activity
  const activeManagers = stats.byManager
    .filter(m => m.deals > 0 || m.salesYTD > 0)
    .sort((a, b) => b.salesYTD - a.salesYTD);

  if (selectedManager) {
    return (
      <ManagerDrillDown 
        manager={selectedManager} 
        stats={stats}
        color={color}
        onBack={() => setSelectedManager(null)}
      />
    );
  }

  return (
    <div className="sd-stack" style={{ gap: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: TEXT, margin: 0 }}>
          Sales Manager Performance
        </h2>
        <p style={{ fontSize: '0.8rem', color: MUTED, margin: '4px 0 0' }}>
          click any card for full drill-down
        </p>
      </div>

      {/* Manager Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: 16 
      }}>
        {activeManagers.map((manager) => {
          const target = 0; // Targets not available from backend
          const attainment = target > 0 ? Math.round((manager.salesYTD / target) * 100) : 0;
          const atRisk = stats.atRiskByManager.find(a => a.owner === manager.owner);

          return (
            <div 
              key={manager.owner}
              onClick={() => handleManagerClick(manager)}
              style={{
                padding: 16,
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
                background: 'rgba(0,0,0,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = BORDER}
            >
              {/* Header */}
              <div style={{ fontSize: '1rem', fontWeight: 600, color: TEXT, marginBottom: 12 }}>
                {manager.owner}
              </div>

              {/* Target Attainment */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <CrmIcon name="Target" size={11} />
                  Target
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT }}>
                    RM {manager.salesYTD >= 1_000_000
                      ? `${(manager.salesYTD / 1_000_000).toFixed(1)}M`
                      : `${(manager.salesYTD / 1000).toFixed(0)}K`}
                  </span>
                  {target > 0 && (
                    <span style={{ fontSize: '0.75rem', color: MUTED }}>
                      of RM {(target / 1_000_000).toFixed(1)}M
                    </span>
                  )}
                </div>
                {target > 0 && (
                  <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 2 }}>
                    {attainment}% attainment
                  </div>
                )}
              </div>

              {/* Win Rate & Deals */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase' }}>Win Rate</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: TEXT }}>{manager.winRate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase' }}>Active</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: TEXT }}>{manager.deals} deals</div>
                </div>
              </div>

              {/* Pipeline */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase' }}>Pipeline</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>
                  RM {manager.pipelineValue >= 1_000_000
                    ? `${(manager.pipelineValue / 1_000_000).toFixed(1)}M`
                    : `${(manager.pipelineValue / 1000).toFixed(0)}K`}
                </div>
              </div>

              {/* At-Risk */}
              {atRisk && atRisk.atRiskDeals > 0 && (
                <div style={{ 
                  padding: '8px 10px', 
                  background: 'rgba(245, 158, 11, 0.1)', 
                  borderRadius: 6,
                  border: `1px solid ${WARN}`,
                }}>
                  <div style={{ fontSize: '0.7rem', color: WARN, fontWeight: 600 }}>At-Risk</div>
                  <div style={{ fontSize: '0.85rem', color: TEXT }}>
                    {atRisk.atRiskDeals} deals · RM {atRisk.atRiskValue >= 1_000_000
                      ? `${(atRisk.atRiskValue / 1_000_000).toFixed(1)}M`
                      : `${(atRisk.atRiskValue / 1000).toFixed(0)}K`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Drill-down component for individual manager
function ManagerDrillDown({ 
  manager, 
  stats, 
  color, 
  onBack 
}: { 
  manager: ManagerEntry; 
  stats: CeoDashboardStats; 
  color: string;
  onBack: () => void;
}) {
  const target = 0; // Targets not available from backend
  const attainment = target > 0 ? Math.round((manager.salesYTD / target) * 100) : 0;
  const atRisk = stats.atRiskByManager.find(a => a.owner === manager.owner);

  // Filter deals for this manager
  const managerDeals = stats.topDeals.filter(d => d.owner === manager.owner);
  const wonDeals = managerDeals.filter(d => d.stage === 'Won');
  
  // Stage breakdown for pipeline health
  const stageBreakdown = stats.byStage
    .filter(s => s.value > 0)
    .sort((a, b) => b.value - a.value);

  // Product mix for this manager (approximation from top deals)
  const productMix = [...stats.byProduct]
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="sd-stack" style={{ gap: 20 }}>
      {/* Back button */}
      <button 
        onClick={onBack}
        style={{
          padding: '8px 16px',
          fontSize: '0.85rem',
          color: color,
          background: 'transparent',
          border: `1px solid ${color}`,
          borderRadius: 6,
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        ← Back to Managers
      </button>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: TEXT, margin: 0 }}>
          {manager.owner}
        </h2>
        <p style={{ fontSize: '0.85rem', color: MUTED, margin: '4px 0 0' }}>
          {manager.deals} active deals · {manager.wonDeals} won YTD
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="sd-kpi-card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 3 }}>
            <CrmIcon name="Target" size={11} />
            Target Attainment
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>
            {attainment}%
          </div>
          <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 4 }}>
            RM {(manager.salesYTD / 1_000_000).toFixed(1)}M of RM {(target / 1_000_000).toFixed(1)}M
          </div>
        </div>

        <div className="sd-kpi-card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase' }}>Win Rate</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>
            {manager.winRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 4 }}>
            {manager.wonDeals} won / {manager.deals} handled
          </div>
        </div>

        <div className="sd-kpi-card" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase' }}>Pipeline</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>
            RM {(manager.pipelineValue / 1_000_000).toFixed(1)}M
          </div>
          <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 4 }}>
            Weighted: RM {(manager.weightedPipeline / 1_000_000).toFixed(1)}M
          </div>
        </div>

        {atRisk && atRisk.atRiskDeals > 0 && (
          <div className="sd-kpi-card" style={{ padding: 14, borderColor: WARN }}>
            <div style={{ fontSize: '0.7rem', color: WARN, textTransform: 'uppercase' }}>At-Risk</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>
              {atRisk.atRiskDeals} deals
            </div>
            <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 4 }}>
              RM {(atRisk.atRiskValue / 1_000_000).toFixed(1)}M
            </div>
          </div>
        )}
      </div>

      {/* Won Deals YTD */}
      {wonDeals.length > 0 && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CrmIcon name="DollarSign" size={16} />
            Won Deals YTD ({wonDeals.length} deals · RM {(manager.salesYTD / 1_000_000).toFixed(1)}M)
          </h3>
        </div>
      )}

      {/* Pipeline Health by Stage */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Pipeline Health by Stage</h3>
        <BarChart
          data={stageBreakdown}
          xKey="stage"
          yKey="value"
          color={color}
          unit="RM "
          height={220}
        />
      </div>

      {/* Product Mix */}
      <div className="sd-chart-card" style={{ padding: 16 }}>
        <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Product Mix</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {productMix.map((product) => (
            <div key={product.product} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 4,
            }}>
              <span style={{ fontSize: '0.85rem', color: TEXT }}>{product.product}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>
                RM {product.value >= 1_000_000
                  ? `${(product.value / 1_000_000).toFixed(1)}M`
                  : `${(product.value / 1000).toFixed(0)}K`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* At-Risk Exposure */}
      {atRisk && atRisk.atRiskDeals > 0 && (
        <div className="sd-chart-card" style={{ padding: 16, borderColor: WARN }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12, color: WARN }}>
            At-Risk Exposure (stalled &gt;30 days)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: MUTED }}>Total Deals</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT }}>{atRisk.atRiskDeals}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: MUTED }}>Total Value</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT }}>
                RM {(atRisk.atRiskValue / 1_000_000).toFixed(1)}M
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Open Deals */}
      {managerDeals.length > 0 && (
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Top Open Deals by Value</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {managerDeals.slice(0, 5).map((deal, idx) => (
              <div key={deal.slug} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
              }}>
                <div style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: '50%', 
                  background: color, 
                  color: '#fff',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}>
                  #{idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: TEXT }}>
                    {deal.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: MUTED }}>
                    {deal.customer} · {deal.stage} · {deal.daysInStage}d
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>
                    RM {deal.amount >= 1_000_000
                      ? `${(deal.amount / 1_000_000).toFixed(1)}M`
                      : `${(deal.amount / 1000).toFixed(0)}K`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
