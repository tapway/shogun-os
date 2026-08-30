import { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Area, Cell,
} from 'recharts';
import { FinanceDetailModal } from './FinanceDetailModal';
import { ChartEmpty, CHART_TICK, CHART_TOOLTIP_STYLE } from '../charts/empty';
import type {
  FinanceDashboardStats, ApAgingBucket, MonthlyPlTrendPoint,
  CashFlowForecastPoint, BurnTrendPoint,
} from '../../../lib/types';

interface Props { stats: FinanceDashboardStats; color: string }

const fmt = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `RM ${(n / 1_000_000).toFixed(2)}M`
    : Math.abs(n) >= 1_000
      ? `RM ${(n / 1_000).toFixed(0)}K`
      : `RM ${n.toFixed(0)}`;

// Recharts tooltip formatters pass ValueType (number | string | undefined),
// so coerce to number for formatting. Pattern matches existing BarChart/ComboChart.
const fmtTipNamed = (value: unknown, name: string) =>
  [fmt(Number(value ?? 0)), name] as [string, string];
const fmtTipAP = (value: unknown) =>
  [fmt(Number(value ?? 0)), 'Outstanding'] as [string, string];
const fmtTipBurn = (value: unknown) =>
  [fmt(Number(value ?? 0)), 'Burn'] as [string, string];

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

type ModalType =
  | 'bankBalance' | 'receivables' | 'burn' | 'netCashFlow'
  | 'incomeExpenses' | 'forecast'
  | 'apAging' | 'arAging' | 'burnTrend'
  | null;

// Color-coded DPD tiers for horizontal aging bars (matches reference image)
const DPD_COLORS: Record<string, string> = {
  '1-30 DPD': '#3b82f6',    // blue
  '31-60 DPD': '#eab308',   // yellow
  '61-90 DPD': '#f97316',   // orange
  '90+ DPD': '#ef4444',     // red
};

export function CashFlowTab({ stats, color }: Props) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // ── Dashboard figures (from finance mock ledger) ──
  const totalLiquidCash = stats.totalLiquidCash ?? 0;
  const totalAR = stats.totalAR ?? 0;
  const avgMonthlyBurn = stats.netMonthlyBurn ?? 0;
  // Net cash flow = MTD revenue - MTD burn (proxy from YTD averages)
  const netCashFlow = stats.revenueMTD > 0
    ? stats.revenueMTD - avgMonthlyBurn
    : (stats.monthlyPlTrend.length > 0
        ? (stats.monthlyPlTrend[stats.monthlyPlTrend.length - 1].revenue
           - stats.monthlyPlTrend[stats.monthlyPlTrend.length - 1].expenses)
        : 0);

  const monthlyPlTrend: MonthlyPlTrendPoint[] = stats.monthlyPlTrend ?? [];
  const cashFlowForecast: CashFlowForecastPoint[] = stats.cashFlowForecast ?? [];
  const burnTrend: BurnTrendPoint[] = stats.burnTrend ?? [];
  const arAgingByTarget: ApAgingBucket[] = stats.arAgingByTarget ?? [];
  const apAgingByTarget: ApAgingBucket[] = stats.apAgingByTarget ?? [];

  // ── Column 1: Core Financial Metrics (vertical stack of 4 KPI cards) ──
  const coreMetrics = [
    { label: 'Current Bank Balance', value: fmt(totalLiquidCash), modal: 'bankBalance' as ModalType },
    { label: 'Outstanding Receivables', value: fmt(totalAR), modal: 'receivables' as ModalType },
    { label: 'Avg Monthly Burn', value: fmt(avgMonthlyBurn), modal: 'burn' as ModalType },
    { label: 'Net Cash Flow', value: fmt(netCashFlow), modal: 'netCashFlow' as ModalType },
  ];

  return (
    <div className="sd-stack">
      {/* Title header */}
      <div className="sd-chart-card" style={{ padding: '0.85rem 1.1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: TEXT, margin: 0 }}>
          Cash Flow Management Dashboard
        </h2>
        <p style={{ fontSize: '0.72rem', color: MUTED, margin: '0.15rem 0 0' }}>
          Live data from QuickBooks Online — bank balances, receivables, burn rate, and 6-month forecast
        </p>
      </div>

      {/* ── Top Row: 3 grid columns ── */}
      <div className="sd-row" style={{ alignItems: 'stretch' }}>
        {/* Column 1: Core Financial Metrics (vertical stack) */}
        <div className="sd-chart-card" style={{ flex: '0 0 22%', minWidth: '220px' }}>
          <h3 className="sd-chart-title">Core Financial Metrics</h3>
          <p className="sd-chart-sub">Finance KPIs — click for detail</p>
          <div className="sd-stack" style={{ gap: '0.5rem', marginTop: '0.4rem' }}>
            {coreMetrics.map((kpi) => (
              <button
                key={kpi.label}
                type="button"
                onClick={() => setActiveModal(kpi.modal)}
                className="sd-kpi-card"
                style={{
                  cursor: 'pointer', textAlign: 'left', border: `1px solid ${BORDER}`,
                  transition: 'border-color 0.15s', padding: '0.6rem 0.75rem',
                }}
              >
                <div className="sd-kpi-label">{kpi.label}</div>
                <div className="sd-kpi-value" style={{ fontSize: '1.15rem' }}>{kpi.value}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Income and Expenses (Last 6 Months) — stacked bar chart */}
        <div
          className="sd-chart-card"
          style={{ cursor: 'pointer', flex: '1 1 38%' }}
          onClick={() => setActiveModal('incomeExpenses')}
        >
          <h3 className="sd-chart-title">Income and Expenses (Last 6 Months)</h3>
          <p className="sd-chart-sub">Monthly P&L trend — click for detail</p>
          {monthlyPlTrend.length === 0 ? (
            <ChartEmpty message="No P&L trend data available" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={monthlyPlTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={CHART_TICK} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <Tooltip
                  formatter={fmtTipNamed as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="revenue" name="Income" fill="#22c55e" stackId="a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" stackId="b" radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Column 3: Net Cash Flow Forecast — line chart with fan range */}
        <div
          className="sd-chart-card"
          style={{ cursor: 'pointer', flex: '1 1 38%' }}
          onClick={() => setActiveModal('forecast')}
        >
          <h3 className="sd-chart-title">Net Cash Flow Forecast</h3>
          <p className="sd-chart-sub">6-month projection with fan range — click for detail</p>
          {cashFlowForecast.length === 0 ? (
            <ChartEmpty message="No forecast data available" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={cashFlowForecast} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={CHART_TICK} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <Tooltip
                  formatter={fmtTipNamed as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                {/* Fan range: shaded area between low and high */}
                <Area
                  type="monotone" dataKey="high" name="Optimistic" stroke="none"
                  fill={color} fillOpacity={0.08} stackId="fan"
                />
                <Area
                  type="monotone" dataKey="low" name="Conservative" stroke="none"
                  fill={SURFACE_2} fillOpacity={1} stackId="fan"
                />
                {/* Central forecast line */}
                <Line
                  type="monotone" dataKey="total" name="Total Amount"
                  stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Bottom Row: 3 grid columns ── */}
      <div className="sd-row" style={{ alignItems: 'stretch' }}>
        {/* Column 1: Accounts Payable Aging (Days Past Due) */}
        <div
          className="sd-chart-card"
          style={{ cursor: 'pointer', flex: '1 1 33%' }}
          onClick={() => setActiveModal('apAging')}
        >
          <h3 className="sd-chart-title">Accounts Payable Aging</h3>
          <p className="sd-chart-sub">Days past due — click for bill detail</p>
          {apAgingByTarget.length === 0 ? (
            <ChartEmpty message="No AP aging data available" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                layout="vertical"
                data={apAgingByTarget}
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
                <XAxis
                  type="number" tick={CHART_TICK} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <YAxis
                  type="category" dataKey="label" tick={CHART_TICK}
                  axisLine={false} tickLine={false} width={75}
                />
                <Tooltip
                  formatter={fmtTipAP as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Bar
                  dataKey="amount" name="AP"
                  radius={[0, 4, 4, 0]}
                >
                  {apAgingByTarget.map((b: ApAgingBucket) => (
                    <Cell key={b.label} fill={DPD_COLORS[b.label] ?? '#6366f1'} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Column 2: Accounts Receivable Aging (Days Past Due) */}
        <div
          className="sd-chart-card"
          style={{ cursor: 'pointer', flex: '1 1 33%' }}
          onClick={() => setActiveModal('arAging')}
        >
          <h3 className="sd-chart-title">Accounts Receivable Aging</h3>
          <p className="sd-chart-sub">Days past due — click for invoice detail</p>
          {arAgingByTarget.length === 0 ? (
            <ChartEmpty message="No AR aging data available" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                layout="vertical"
                data={arAgingByTarget}
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
                <XAxis
                  type="number" tick={CHART_TICK} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <YAxis
                  type="category" dataKey="label" tick={CHART_TICK}
                  axisLine={false} tickLine={false} width={75}
                />
                <Tooltip
                  formatter={fmtTipAP as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Bar
                  dataKey="amount" name="AR"
                  radius={[0, 4, 4, 0]}
                >
                  {arAgingByTarget.map((b: ApAgingBucket) => (
                    <Cell key={b.label} fill={DPD_COLORS[b.label] ?? '#6366f1'} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Column 3: Monthly Burn Trend (Last 6 Months) */}
        <div
          className="sd-chart-card"
          style={{ cursor: 'pointer', flex: '1 1 33%' }}
          onClick={() => setActiveModal('burnTrend')}
        >
          <h3 className="sd-chart-title">Monthly Burn Trend</h3>
          <p className="sd-chart-sub">Last 6 months — click for detail</p>
          {burnTrend.length === 0 ? (
            <ChartEmpty message="No burn trend data available" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={burnTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={CHART_TICK} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                />
                <Tooltip
                  formatter={fmtTipBurn as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Line
                  type="monotone" dataKey="burn" name="Monthly Burn"
                  stroke="#14b8a6" strokeWidth={2.5}
                  dot={{ r: 4, fill: '#14b8a6' }} connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Popout modals ── */}

      {/* Popout: Bank Balance → bank accounts list */}
      {activeModal === 'bankBalance' && (
        <FinanceDetailModal
          title="Current Bank Balance"
          subtitle={`Total liquid cash: ${fmt(totalLiquidCash)}`}
          onClose={() => setActiveModal(null)}
          maxWidth="36rem"
        >
          <div style={{ marginBottom: '0.75rem', textAlign: 'center', padding: '0.6rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
            <div style={{ fontSize: '0.72rem', color: MUTED }}>Total Liquid Cash</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: TEXT }}>{fmt(totalLiquidCash)}</div>
          </div>
          <div className="sd-stack" style={{ gap: '0.4rem' }}>
            {(stats.bankAccounts ?? []).map((acct, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.5rem', background: SURFACE_2, padding: '0.5rem 0.75rem' }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: TEXT }}>{acct.name}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>
                    {acct.currency}{acct.last_reconciled ? ` · Rec: ${acct.last_reconciled}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: TEXT }}>{fmt(acct.balance_myr)}</div>
              </div>
            ))}
            {stats.bankAccounts.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: MUTED, textAlign: 'center' }}>No bank accounts available.</p>
            )}
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Outstanding Receivables → AR aging breakdown + dunning queue */}
      {activeModal === 'receivables' && (
        <FinanceDetailModal
          title="Outstanding Receivables"
          subtitle={`Total AR: ${fmt(totalAR)} · DSO: ${(stats.dso || 0).toFixed(0)} days`}
          onClose={() => setActiveModal(null)}
          maxWidth="40rem"
        >
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            <ArAgingBar aging={stats.arAging} />
            {stats.dunningQueue.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT, margin: '0.75rem 0 0.4rem' }}>
                  Dunning Queue ({stats.dunningQueue.length})
                </div>
                <div className="sd-stack" style={{ gap: '0.3rem' }}>
                  {stats.dunningQueue.slice(0, 10).map((d, i) => (
                    <div
                      key={i}
                      style={{ display: 'flex', justifyContent: 'space-between', background: SURFACE_2, borderRadius: '0.4rem', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, color: TEXT }}>{d.customer}</div>
                        <div style={{ fontSize: '0.7rem', color: MUTED }}>{d.invoice_no} · Due {d.due_date}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: TEXT }}>{fmt(d.amount)}</div>
                        <div style={{ fontSize: '0.7rem', color: d.aging_days > 90 ? 'var(--samurai-danger)' : 'var(--samurai-warning)' }}>
                          {d.aging_days} days overdue
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Avg Monthly Burn → burn trend chart */}
      {activeModal === 'burn' && (
        <FinanceDetailModal
          title="Average Monthly Burn"
          subtitle={`YTD avg: ${fmt(avgMonthlyBurn)} · Runway: ${(stats.cashRunwayMonths || 0).toFixed(1)} months`}
          onClose={() => setActiveModal(null)}
          maxWidth="44rem"
        >
          <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.6rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: TEXT }}>{fmt(avgMonthlyBurn)}</div>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.2rem' }}>
              {stats.cashRunwayMonths > 6
                ? `Healthy runway — ${(stats.cashRunwayMonths || 0).toFixed(1)} months`
                : `Monitor burn — ${(stats.cashRunwayMonths || 0).toFixed(1)} months runway`}
            </div>
          </div>
          {burnTrend.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={burnTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} />
                <Tooltip
                  formatter={fmtTipBurn as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Line type="monotone" dataKey="burn" name="Monthly Burn" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4, fill: '#14b8a6' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </FinanceDetailModal>
      )}

      {/* Popout: Net Cash Flow → income vs expenses detail */}
      {activeModal === 'netCashFlow' && (
        <FinanceDetailModal
          title="Net Cash Flow"
          subtitle={`MTD Revenue: ${fmt(stats.revenueMTD)} · MTD Burn: ${fmt(avgMonthlyBurn)}`}
          onClose={() => setActiveModal(null)}
          maxWidth="44rem"
        >
          <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.6rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: netCashFlow >= 0 ? 'var(--samurai-ok)' : 'var(--samurai-danger)' }}>
              {fmt(netCashFlow)}
            </div>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.2rem' }}>
              {netCashFlow >= 0 ? 'Positive cash flow — revenue exceeds burn' : 'Negative cash flow — burn exceeds revenue'}
            </div>
          </div>
          {monthlyPlTrend.length > 0 && (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={monthlyPlTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} />
                <Tooltip
                  formatter={fmtTipNamed as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="revenue" name="Income" fill="#22c55e" stackId="a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" stackId="b" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="net_profit" name="Net Profit" stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </FinanceDetailModal>
      )}

      {/* Popout: Income & Expenses → full 6-month chart */}
      {activeModal === 'incomeExpenses' && (
        <FinanceDetailModal
          title="Income and Expenses (Last 6 Months)"
          subtitle="Monthly P&L trend"
          onClose={() => setActiveModal(null)}
          maxWidth="44rem"
        >
          {monthlyPlTrend.length === 0 ? (
            <ChartEmpty message="No P&L trend data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyPlTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} />
                <Tooltip
                  formatter={fmtTipNamed as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="revenue" name="Income" fill="#22c55e" stackId="a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" stackId="b" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="net_profit" name="Net Profit" stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </FinanceDetailModal>
      )}

      {/* Popout: Forecast → full forecast chart with fan */}
      {activeModal === 'forecast' && (
        <FinanceDetailModal
          title="Net Cash Flow Forecast"
          subtitle="6-month projection with conservative/optimistic fan range"
          onClose={() => setActiveModal(null)}
          maxWidth="44rem"
        >
          {cashFlowForecast.length === 0 ? (
            <ChartEmpty message="No forecast data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cashFlowForecast} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} />
                <Tooltip
                  formatter={fmtTipNamed as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="high" name="Optimistic" stroke="none" fill={color} fillOpacity={0.08} stackId="fan" />
                <Area type="monotone" dataKey="low" name="Conservative" stroke="none" fill={SURFACE_2} fillOpacity={1} stackId="fan" />
                <Line type="monotone" dataKey="total" name="Total Amount" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </FinanceDetailModal>
      )}

      {/* Popout: AP Aging → bill detail */}
      {activeModal === 'apAging' && (
        <FinanceDetailModal
          title="Accounts Payable Aging"
          subtitle={`Total AP: ${fmt(stats.totalAP)} · DPO: ${(stats.dpo || 0).toFixed(0)} days`}
          onClose={() => setActiveModal(null)}
          maxWidth="44rem"
        >
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            {apAgingByTarget.map((b: ApAgingBucket) => (
              <AgingBucketBar key={b.label} label={b.label} amount={b.amount} />
            ))}
            {stats.apBills.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT, margin: '0.75rem 0 0.4rem' }}>
                  Outstanding Bills ({stats.apBills.length})
                </div>
                <div className="sd-stack" style={{ gap: '0.3rem' }}>
                  {stats.apBills.slice(0, 10).map((b, i) => (
                    <div
                      key={i}
                      style={{ display: 'flex', justifyContent: 'space-between', background: SURFACE_2, borderRadius: '0.4rem', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, color: TEXT }}>{b.vendor}</div>
                        <div style={{ fontSize: '0.7rem', color: MUTED }}>{b.bill_no} · Due {b.due_date}</div>
                      </div>
                      <div style={{ fontWeight: 600, color: TEXT }}>{fmt(b.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: AR Aging → invoice detail */}
      {activeModal === 'arAging' && (
        <FinanceDetailModal
          title="Accounts Receivable Aging"
          subtitle={`Total AR: ${fmt(totalAR)} · DSO: ${(stats.dso || 0).toFixed(0)} days`}
          onClose={() => setActiveModal(null)}
          maxWidth="44rem"
        >
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            {arAgingByTarget.map((b: ApAgingBucket) => (
              <AgingBucketBar key={b.label} label={b.label} amount={b.amount} />
            ))}
            {stats.dunningQueue.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT, margin: '0.75rem 0 0.4rem' }}>
                  Dunning Queue ({stats.dunningQueue.length})
                </div>
                <div className="sd-stack" style={{ gap: '0.3rem' }}>
                  {stats.dunningQueue.slice(0, 10).map((d, i) => (
                    <div
                      key={i}
                      style={{ display: 'flex', justifyContent: 'space-between', background: SURFACE_2, borderRadius: '0.4rem', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, color: TEXT }}>{d.customer}</div>
                        <div style={{ fontSize: '0.7rem', color: MUTED }}>{d.invoice_no} · Due {d.due_date}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: TEXT }}>{fmt(d.amount)}</div>
                        <div style={{ fontSize: '0.7rem', color: d.aging_days > 90 ? 'var(--samurai-danger)' : 'var(--samurai-warning)' }}>
                          {d.aging_days} days overdue
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Burn Trend → full 6-month chart */}
      {activeModal === 'burnTrend' && (
        <FinanceDetailModal
          title="Monthly Burn Trend (Last 6 Months)"
          subtitle="Total expenses per month"
          onClose={() => setActiveModal(null)}
          maxWidth="44rem"
        >
          {burnTrend.length === 0 ? (
            <ChartEmpty message="No burn trend data available" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={burnTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmt(v)} />
                <Tooltip
                  formatter={fmtTipBurn as never}
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Line type="monotone" dataKey="burn" name="Monthly Burn" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4, fill: '#14b8a6' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </FinanceDetailModal>
      )}
    </div>
  );
}

// ── Helpers ──

function ArAgingBar({ aging }: { aging: FinanceDashboardStats['arAging'] }) {
  const buckets = [
    { label: '0-30 days', amount: aging.bucket_0_30 },
    { label: '31-60 days', amount: aging.bucket_31_60 },
    { label: '61-90 days', amount: aging.bucket_61_90 },
    { label: '90+ days', amount: aging.bucket_90_plus },
  ];
  const max = Math.max(...buckets.map(b => b.amount), 1);
  return (
    <div className="sd-stack" style={{ gap: '0.5rem' }}>
      {buckets.map((b) => (
        <div key={b.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: MUTED, marginBottom: '0.3rem' }}>
            <span>{b.label}</span>
            <span style={{ fontWeight: 600, color: TEXT }}>{fmt(b.amount)}</span>
          </div>
          <div style={{ height: '0.5rem', borderRadius: 999, overflow: 'hidden', background: SURFACE_2 }}>
            <div
              style={{
                height: '100%',
                width: `${(b.amount / max) * 100}%`,
                borderRadius: 999,
                background: b.label.includes('90') ? 'var(--samurai-danger)'
                  : b.label.includes('60') ? 'var(--samurai-warning)'
                  : 'var(--samurai-ok)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgingBucketBar({ label, amount }: { label: string; amount: number }) {
  const color = DPD_COLORS[label] ?? '#6366f1';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: MUTED, marginBottom: '0.3rem' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: TEXT }}>{fmt(amount)}</span>
      </div>
      <div style={{ height: '0.5rem', borderRadius: 999, overflow: 'hidden', background: SURFACE_2 }}>
        <div style={{ height: '100%', width: '100%', borderRadius: 999, background: color }} />
      </div>
    </div>
  );
}
