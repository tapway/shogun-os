import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { ComboChart } from '../charts';
import { FinanceDetailModal } from './FinanceDetailModal';
import type { FinanceDashboardStats, BvaLineItem } from '../../../lib/types';

interface Props { stats: FinanceDashboardStats; color: string }

const fmtMyr = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `RM ${(n / 1_000_000).toFixed(2)}M` : `RM ${(n / 1_000).toFixed(1)}K`;

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const TEAL = '#2dd4bf';
const ORANGE = '#fb923c';
const BLUE = '#60a5fa';
const RED = '#f87171';

const th = { fontSize: '0.72rem', fontWeight: 500, color: MUTED } as const;

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th className="pb-2" style={{ ...th, textAlign: align }}>{children}</th>;
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: '0.6rem', borderRadius: '0.3rem', overflow: 'hidden', background: SURFACE_2 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: '0.3rem', background: color, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// Group P&L sections into INCOME (Revenue + Other Income) and EXPENSES (COS + Expenses)
function groupIntoIncomeExpense(items: BvaLineItem[]) {
  const income = items.filter((i) => i.section === 'Revenue' || i.section === 'Other Income');
  const expenses = items.filter((i) => i.section === 'Cost of Sales' || i.section === 'Expenses');
  return { income, expenses };
}

function sectionTotals(items: BvaLineItem[]) {
  return items.reduce(
    (acc, it) => {
      acc.budget += it.budget_ytd;
      acc.actual += it.actual_ytd;
      return acc;
    },
    { budget: 0, actual: 0 },
  );
}

// Build monthly trend from bva_line_items' monthly_budget (budget) + derived actual
// For the BvA tab, budget comes from Excel (monthly_budget), actual comes from live QBO.
// Since we don't have monthly actuals per line, we distribute actual_ytd evenly across YTD months.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildTrendData(items: BvaLineItem[], ytdMonths: number) {
  const trend: { month: string; actual: number; planned: number }[] = [];
  const totalBudget = items.reduce((s, it) => s + (it.monthly_budget?.reduce((a, b) => a + b, 0) ?? 0), 0);
  const totalActual = items.reduce((s, it) => s + it.actual_ytd, 0);
  const monthlyActualAvg = ytdMonths > 0 ? totalActual / ytdMonths : 0;

  for (let i = 0; i < 12; i++) {
    const monthlyBudget = items.reduce((s, it) => s + (it.monthly_budget?.[i] ?? 0), 0);
    const monthlyActual = i < ytdMonths ? monthlyActualAvg : 0;
    if (monthlyBudget > 0 || monthlyActual > 0) {
      trend.push({
        month: MONTHS[i],
        actual: Math.round(monthlyActual),
        planned: Math.round(monthlyBudget),
      });
    }
  }
  return trend;
}

export function BvaUnitEconomicsTab({ stats, color }: Props) {
  const items = stats.bvaLineItems ?? [];
  const { income, expenses } = useMemo(() => groupIntoIncomeExpense(items), [items]);
  const [activeLine, setActiveLine] = useState<BvaLineItem | null>(null);

  // Current month for YTD calculation
  const ytdMonths = new Date().getMonth() + 1;

  // Income section totals
  const incomeTotals = useMemo(() => sectionTotals(income), [income]);
  const incomeVariance = incomeTotals.actual - incomeTotals.budget;
  const incomeAchievementPct = incomeTotals.budget > 0 ? (incomeTotals.actual / incomeTotals.budget) * 100 : 0;
  const incomeShortfall = Math.max(0, incomeTotals.budget - incomeTotals.actual);

  // Expense section totals
  const expTotals = useMemo(() => sectionTotals(expenses), [expenses]);
  const expVariance = expTotals.actual - expTotals.budget;
  const expUtilizationPct = expTotals.budget > 0 ? (expTotals.actual / expTotals.budget) * 100 : 0;
  const expSavings = Math.max(0, expTotals.budget - expTotals.actual);

  // Trend data
  const incomeTrend = useMemo(() => buildTrendData(income, ytdMonths), [income, ytdMonths]);
  const expenseTrend = useMemo(() => buildTrendData(expenses, ytdMonths), [expenses, ytdMonths]);

  return (
    <div className="sd-stack">
      {/* ── SECTION 1: INCOME ── */}
      <BvaSection
        title="INCOME"
        headline={fmtMyr(incomeTotals.actual)}
        headlineLabel="Actual Income (YTD)"
        trendUp={incomeVariance >= 0}
        currentMonth={fmtMyr(incomeTotals.actual / Math.max(ytdMonths, 1))}
        lastMonth={fmtMyr(incomeTrend.length >= 2 ? incomeTrend[incomeTrend.length - 2].actual : 0)}
        progressPct={incomeAchievementPct}
        progressColor={TEAL}
        progressLabel="Income Target Achievement"
        summaryRows={[
          { label: 'Planned Income', value: fmtMyr(incomeTotals.budget) },
          { label: 'Actual Income', value: fmtMyr(incomeTotals.actual) },
          { label: 'Revenue Shortfall', value: fmtMyr(incomeShortfall) },
        ]}
        chartData={incomeTrend}
        chartBarColor={TEAL}
        chartLineColor={BLUE}
        chartBarLabel="Actual Income"
        chartLineLabel="Planned Income"
        breakdownItems={income}
        onRowClick={setActiveLine}
        breakdownType="income"
      />

      {/* ── SECTION 2: EXPENSES ── */}
      <BvaSection
        title="EXPENSES"
        headline={fmtMyr(expTotals.actual)}
        headlineLabel="Actual Expenses (YTD)"
        trendUp={expVariance < 0}
        currentMonth={fmtMyr(expTotals.actual / Math.max(ytdMonths, 1))}
        lastMonth={fmtMyr(expenseTrend.length >= 2 ? expenseTrend[expenseTrend.length - 2].actual : 0)}
        progressPct={expUtilizationPct}
        progressColor={ORANGE}
        progressLabel="Expense Budget Utilization"
        summaryRows={[
          { label: 'Expense Budget', value: fmtMyr(expTotals.budget) },
          { label: 'Actual Expense', value: fmtMyr(expTotals.actual) },
          { label: 'Cost Savings', value: fmtMyr(expSavings) },
        ]}
        chartData={expenseTrend}
        chartBarColor={ORANGE}
        chartLineColor={RED}
        chartBarLabel="Actual Expenses"
        chartLineLabel="Expense Budget"
        breakdownItems={expenses}
        onRowClick={setActiveLine}
        breakdownType="expense"
      />

      {/* Popout: line item monthly breakdown */}
      {activeLine && (
        <FinanceDetailModal
          title={activeLine.account_name}
          subtitle={`${activeLine.section} — Monthly Budget Breakdown (Budget from Excel, Actuals from live QBO)`}
          onClose={() => setActiveLine(null)}
          maxWidth="36rem"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>YTD Budget</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT }}>{fmtMyr(activeLine.budget_ytd)}</div>
            </div>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>YTD Actual</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT }}>{fmtMyr(activeLine.actual_ytd)}</div>
            </div>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>Variance</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: activeLine.variance > 0 ? 'var(--samurai-danger)' : 'var(--samurai-ok)' }}>
                {activeLine.variance > 0 ? '+' : ''}{fmtMyr(activeLine.variance)}
              </div>
            </div>
          </div>
          {/* Monthly bars */}
          <div className="sd-stack" style={{ gap: '0.3rem' }}>
            {MONTHS.map((month, i) => {
              const monthlyBudget = activeLine.monthly_budget?.[i] ?? 0;
              const maxVal = Math.max(...(activeLine.monthly_budget ?? [1]), 1);
              const barWidth = (monthlyBudget / maxVal) * 100;
              return (
                <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '2.5rem', fontSize: '0.72rem', color: MUTED }}>{month}</div>
                  <div style={{ flex: 1, height: '0.8rem', borderRadius: '0.2rem', overflow: 'hidden', background: SURFACE_2 }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: '0.2rem', background: color }} />
                  </div>
                  <div style={{ width: '5rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 600, color: TEXT }}>{fmtMyr(monthlyBudget)}</div>
                </div>
              );
            })}
          </div>
        </FinanceDetailModal>
      )}
    </div>
  );
}

// ── Reusable BvA section: 3-column layout per the reference image ──

function BvaSection({
  title,
  headline,
  headlineLabel,
  trendUp,
  currentMonth,
  lastMonth,
  progressPct,
  progressColor,
  progressLabel,
  summaryRows,
  chartData,
  chartBarColor,
  chartLineColor,
  chartBarLabel,
  chartLineLabel,
  breakdownItems,
  onRowClick,
  breakdownType,
}: {
  title: string;
  headline: string;
  headlineLabel: string;
  trendUp: boolean;
  currentMonth: string;
  lastMonth: string;
  progressPct: number;
  progressColor: string;
  progressLabel: string;
  summaryRows: { label: string; value: string }[];
  chartData: { month: string; actual: number; planned: number }[];
  chartBarColor: string;
  chartLineColor: string;
  chartBarLabel: string;
  chartLineLabel: string;
  breakdownItems: BvaLineItem[];
  onRowClick: (item: BvaLineItem) => void;
  breakdownType: 'income' | 'expense';
}) {
  const TrendIcon = trendUp ? TrendingUp : TrendingDown;
  const trendColor = trendUp ? 'var(--samurai-ok)' : 'var(--samurai-danger)';

  const comboSeries = [
    { key: 'actual', label: chartBarLabel, type: 'bar' as const, color: chartBarColor },
    { key: 'planned', label: chartLineLabel, type: 'line' as const, color: chartLineColor },
  ];

  return (
    <div className="sd-chart-card" style={{ padding: '1.1rem' }}>
      <h3 className="sd-chart-title" style={{ fontSize: '1rem', letterSpacing: '0.05em' }}>{title}</h3>
      <p className="sd-chart-sub">Budget from Budget Excel · Actuals from live QBO</p>

      {/* Top row: 2 columns (Metrics + Trend Chart) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1rem', alignItems: 'start', marginBottom: '1rem' }}>
        {/* ── Column 1: Metrics & Progress ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: TEXT }}>
              {headline}
            </div>
            <TrendIcon className="h-5 w-5" style={{ color: trendColor }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: MUTED }}>{headlineLabel}</div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
            <div>
              <div style={{ color: MUTED, fontSize: '0.66rem' }}>Current Month Avg</div>
              <div style={{ fontWeight: 600, color: TEXT }}>{currentMonth}</div>
            </div>
            <div>
              <div style={{ color: MUTED, fontSize: '0.66rem' }}>Last Month Avg</div>
              <div style={{ fontWeight: 600, color: TEXT }}>{lastMonth}</div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: MUTED, marginBottom: '0.3rem' }}>
              <span>{progressLabel}</span>
              <span style={{ fontWeight: 600, color: TEXT }}>{progressPct.toFixed(1)}%</span>
            </div>
            <ProgressBar pct={progressPct} color={progressColor} />
          </div>

          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.label} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td className="py-1.5" style={{ color: MUTED }}>{row.label}</td>
                  <td className="py-1.5 text-right" style={{ fontWeight: 600, color: TEXT }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Column 2: Trend Chart (bar + line overlay) ── */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: TEXT, marginBottom: '0.5rem' }}>
            {title === 'INCOME' ? 'Income Trend' : 'Expense Trend'} ({chartData.length > 0 ? `${chartData[0].month} – ${chartData[chartData.length - 1].month}` : 'no data'})
          </div>
          {chartData.length === 0 ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.78rem', color: MUTED }}>
              No budget data available. Run the budget Excel parser to populate.
            </div>
          ) : (
            <ComboChart
              data={chartData}
              xKey="month"
              series={comboSeries}
              unit="RM "
              height={240}
            />
          )}
        </div>
      </div>

      {/* Bottom row: Breakdown Table (full width) */}
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: TEXT, marginBottom: '0.5rem' }}>
          {title === 'INCOME' ? 'Income Breakdown' : 'Expense Breakdown'}
        </div>
        {breakdownItems.length === 0 ? (
          <div style={{ padding: '1rem 0', fontSize: '0.78rem', color: MUTED }}>
            No breakdown data available.
          </div>
        ) : (
          <div>
              <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {breakdownType === 'income' ? (
                      <>
                        <Th align="left">Category</Th>
                        <Th align="right">Target</Th>
                        <Th align="right">Actual</Th>
                        <Th align="right">Gap</Th>
                        <Th align="right">%</Th>
                      </>
                    ) : (
                      <>
                        <Th align="left">Category</Th>
                        <Th align="right">Budget</Th>
                        <Th align="right">Actual</Th>
                        <Th align="right">Savings</Th>
                        <Th align="right">Util %</Th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {breakdownItems.map((item) => {
                    const variance = item.actual_ytd - item.budget_ytd;
                    const pct = item.budget_ytd > 0 ? (item.actual_ytd / item.budget_ytd) * 100 : 0;
                    const gap = breakdownType === 'income' ? Math.max(0, item.budget_ytd - item.actual_ytd) : Math.max(0, item.budget_ytd - item.actual_ytd);
                    return (
                      <tr
                        key={`${item.section}-${item.account_name}`}
                        style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                        onClick={() => onRowClick(item)}
                      >
                        <td className="py-1.5 px-1" style={{ color: TEXT }}>{item.account_name}</td>
                        <td className="py-1.5 text-right" style={{ color: TEXT }}>{fmtMyr(item.budget_ytd)}</td>
                        <td className="py-1.5 text-right" style={{ color: TEXT }}>{fmtMyr(item.actual_ytd)}</td>
                        <td className="py-1.5 text-right" style={{ color: gap > 0 ? 'var(--samurai-ok)' : TEXT }}>{fmtMyr(gap)}</td>
                        <td className="py-1.5 text-right" style={{ fontWeight: 600, color: pct > 100 ? 'var(--samurai-danger)' : pct > 90 ? 'var(--samurai-warning)' : TEXT }}>
                          {pct.toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}