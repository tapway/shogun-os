import { useState } from 'react';
import {
  Landmark, FileText, Package, CalendarClock, Building2, TrendingDown,
  Brain, ShieldCheck, Wallet, Layers, ChevronRight,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { FinanceDetailModal } from './FinanceDetailModal';
import type { AssetCategory, AssetTrendPoint, FinanceDashboardStats } from '../../../lib/types';

interface Props { stats: FinanceDashboardStats; color: string }

const fmtMyr = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return abs >= 1_000_000
    ? `${sign}RM ${(abs / 1_000_000).toFixed(2)}M`
    : `${sign}RM ${(abs / 1_000).toFixed(0)}K`;
};

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const SURFACE = 'var(--samurai-surface)';
const BORDER = 'var(--samurai-border)';

// Icon mapping — maps icon string name to lucide component
const ICON_MAP: Record<string, typeof Landmark> = {
  Landmark, FileText, Package, CalendarClock, Building2, TrendingDown,
  Brain, ShieldCheck, Wallet, Layers,
};

function getIcon(name: string): typeof Landmark {
  return ICON_MAP[name] ?? Wallet;
}

export function AssetTab({ stats, color }: Props) {
  const [activeCategory, setActiveCategory] = useState<AssetCategory | null>(null);

  const currentAssets = stats.currentAssets ?? [];
  const nonCurrentAssets = stats.nonCurrentAssets ?? [];
  const assetTrend = stats.assetTrend ?? [];
  const totalCurrent = stats.totalCurrentAssets ?? 0;
  const totalNonCurrent = stats.totalNonCurrentAssets ?? 0;
  const totalAssets = stats.totalAssets ?? (totalCurrent + totalNonCurrent);

  // KPI summary
  const kpis = [
    { label: 'Total Assets', value: fmtMyr(totalAssets), sub: 'All assets' },
    { label: 'Current Assets', value: fmtMyr(totalCurrent), sub: '≤ 12 months' },
    { label: 'Non-Current Assets', value: fmtMyr(totalNonCurrent), sub: '> 12 months' },
  ];

  return (
    <div className="sd-stack">
      {/* Summary KPIs */}
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{kpi.label}</div>
            <div className="sd-kpi-value" style={{ fontSize: '1.3rem' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.66rem', color: MUTED, marginTop: '0.15rem' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Current Assets (12 Months) + Non-Current Assets (12 Months) — side by side */}
      <div className="sd-row">
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Current Assets (12 Months)</h3>
          <p className="sd-chart-sub">Monthly current asset value — hover for amount &amp; MoM change</p>
          {assetTrend.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: MUTED }}>No trend data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RechartsLineChart data={assetTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmtMyr(v)} />
                <Tooltip content={makeAssetTrendTooltip(assetTrend, 'current', color)} />
                <Line type="monotone" dataKey="current" name="Current Assets"
                  stroke={color} strokeWidth={2} dot={{ r: 4, fill: color }} connectNulls />
              </RechartsLineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Non-Current Assets (12 Months)</h3>
          <p className="sd-chart-sub">Monthly non-current asset value — hover for amount &amp; MoM change</p>
          {assetTrend.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: MUTED }}>No trend data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RechartsLineChart data={assetTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmtMyr(v)} />
                <Tooltip content={makeAssetTrendTooltip(assetTrend, 'non_current', 'var(--samurai-warning)')} />
                <Line type="monotone" dataKey="non_current" name="Non-Current Assets"
                  stroke="var(--samurai-warning)" strokeWidth={2} dot={{ r: 4, fill: 'var(--samurai-warning)' }} connectNulls />
              </RechartsLineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Current Asset Categories */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Current Assets</h3>
        <p className="sd-chart-sub">Click a category for account-level breakdown</p>
        {currentAssets.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: MUTED }}>No current asset data available.</p>
        ) : (
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            {currentAssets.map((cat) => {
              const Icon = getIcon(cat.icon);
              const pct = totalCurrent > 0 ? (cat.amount / totalCurrent) * 100 : 0;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => cat.sub_items ? setActiveCategory(cat) : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem 0.75rem',
                    border: 'none', cursor: cat.sub_items ? 'pointer' : 'default', textAlign: 'left',
                    width: '100%',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '2.2rem', height: '2.2rem', borderRadius: '0.5rem',
                    background: `${color}15`, flexShrink: 0,
                  }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  {/* Name + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{cat.name}</span>
                      <span style={{ fontSize: '0.72rem', color: MUTED }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '0.35rem', borderRadius: 999, overflow: 'hidden', background: SURFACE }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: color }} />
                    </div>
                  </div>
                  {/* Amount + chevron */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{fmtMyr(cat.amount)}</div>
                  </div>
                  {cat.sub_items && <ChevronRight className="h-4 w-4" style={{ color: MUTED, flexShrink: 0 }} />}
                </button>
              );
            })}
            {/* Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Current Assets</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: TEXT }}>{fmtMyr(totalCurrent)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Non-Current Asset Categories */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Non-Current Assets</h3>
        <p className="sd-chart-sub">Click a category for account-level breakdown</p>
        {nonCurrentAssets.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: MUTED }}>No non-current asset data available.</p>
        ) : (
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            {nonCurrentAssets.map((cat) => {
              const Icon = getIcon(cat.icon);
              const pct = totalNonCurrent !== 0 ? (cat.amount / Math.abs(totalNonCurrent)) * 100 : 0;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => cat.sub_items ? setActiveCategory(cat) : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem 0.75rem',
                    border: 'none', cursor: cat.sub_items ? 'pointer' : 'default', textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '2.2rem', height: '2.2rem', borderRadius: '0.5rem',
                    background: 'var(--samurai-warning)15', flexShrink: 0,
                  }}>
                    <Icon className="h-4 w-4" style={{ color: 'var(--samurai-warning)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{cat.name}</span>
                      <span style={{ fontSize: '0.72rem', color: MUTED }}>{Math.abs(pct).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '0.35rem', borderRadius: 999, overflow: 'hidden', background: SURFACE }}>
                      <div style={{ height: '100%', width: `${Math.abs(pct)}%`, borderRadius: 999, background: 'var(--samurai-warning)' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, color: cat.amount < 0 ? 'var(--samurai-danger)' : TEXT }}>{fmtMyr(cat.amount)}</div>
                  </div>
                  {cat.sub_items && <ChevronRight className="h-4 w-4" style={{ color: MUTED, flexShrink: 0 }} />}
                </button>
              );
            })}
            {/* Subtotal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Non-Current Assets</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: TEXT }}>{fmtMyr(totalNonCurrent)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Popout: category detail with sub-items */}
      {activeCategory && (
        <FinanceDetailModal
          title={activeCategory.name}
          subtitle={`${activeCategory.amount < 0 ? '-' : ''}RM ${Math.abs(activeCategory.amount).toLocaleString('en-MY', { minimumFractionDigits: 0 })} total`}
          onClose={() => setActiveCategory(null)}
          maxWidth="34rem"
        >
          {activeCategory.sub_items && activeCategory.sub_items.length > 0 ? (
            <div className="sd-stack" style={{ gap: '0.4rem' }}>
              {activeCategory.sub_items.map((sub) => {
                const absTotal = Math.abs(activeCategory.amount);
                const subPct = absTotal > 0 ? (Math.abs(sub.amount) / absTotal) * 100 : 0;
                const isNeg = sub.amount < 0;
                return (
                  <div key={sub.name} style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem 0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: TEXT }}>{sub.name}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, color: isNeg ? 'var(--samurai-danger)' : TEXT }}>
                        {isNeg ? '-' : ''}{fmtMyr(Math.abs(sub.amount))}
                      </span>
                    </div>
                    <div style={{ height: '0.35rem', borderRadius: 999, overflow: 'hidden', background: SURFACE }}>
                      <div style={{ height: '100%', width: `${subPct}%`, borderRadius: 999, background: isNeg ? 'var(--samurai-danger)' : color }} />
                    </div>
                    <div style={{ fontSize: '0.66rem', color: MUTED, marginTop: '0.15rem' }}>{subPct.toFixed(1)}% of category</div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total {activeCategory.name}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, color: activeCategory.amount < 0 ? 'var(--samurai-danger)' : TEXT }}>
                  {activeCategory.amount < 0 ? '-' : ''}{fmtMyr(Math.abs(activeCategory.amount))}
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: MUTED, fontSize: '0.85rem' }}>No sub-account breakdown available.</p>
          )}
        </FinanceDetailModal>
      )}
    </div>
  );
}

// ── Custom Tooltip: shows month, amount, and MoM change ──
// Uses a closure to capture the full trend data array so it can find the
// previous month's value and compute the month-over-month delta.

interface AssetTrendTooltipProps {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string | number;
}

function makeAssetTrendTooltip(
  trendData: AssetTrendPoint[],
  dataKey: 'current' | 'non_current',
  color: string,
) {
  return function AssetTrendTooltip({ active, payload, label }: AssetTrendTooltipProps) {
    if (!active || !payload || !payload.length) return null;

    const month = label ?? payload[0]?.payload?.month ?? '';
    const value = (payload[0]?.payload?.[dataKey] as number) ?? 0;

    // Find this point's index in the trend data to get the previous month's value
    const idx = trendData.findIndex((p) => p.month === month);
    const prevValue = idx > 0 ? (trendData[idx - 1][dataKey] ?? 0) : null;
    const hasPrev = prevValue !== null;
    const delta = hasPrev ? value - (prevValue as number) : 0;
    const deltaPct = hasPrev && (prevValue as number) !== 0
      ? (delta / (prevValue as number)) * 100
      : 0;
    const isUp = delta > 0;
    const isDown = delta < 0;
    const deltaColor = isUp ? 'var(--samurai-ok)' : isDown ? 'var(--samurai-danger)' : 'var(--samurai-muted)';
    const arrow = isUp ? '↑' : isDown ? '↓' : '→';

    return (
      <div style={{
        background: 'var(--samurai-surface-2)',
        border: '1px solid var(--samurai-border)',
        borderRadius: '0.5rem',
        padding: '0.6rem 0.8rem',
        fontSize: '0.78rem',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        color: 'var(--samurai-text)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{month}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
          <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: 999, background: color, flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{fmtMyr(value)}</span>
        </div>
        {hasPrev && (
          <div style={{ color: deltaColor, fontSize: '0.72rem', fontWeight: 500, marginTop: '0.15rem' }}>
            {arrow} {isUp ? '+' : ''}{fmtMyr(Math.abs(delta))} ({deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}% vs last month)
          </div>
        )}
        {!hasPrev && (
          <div style={{ fontSize: '0.66rem', color: 'var(--samurai-muted)', marginTop: '0.15rem' }}>
            First month in range
          </div>
        )}
      </div>
    );
  };
}
