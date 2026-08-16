import { useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, ComboChart, LineChart } from '../charts';
import { FinanceDetailModal } from './FinanceDetailModal';
import type { FinanceDashboardStats, ApAgingBucket, MonthlyPlTrendPoint } from '../../../lib/types';

interface Props { stats: FinanceDashboardStats; color: string }

const fmt = (n: number) =>
  n >= 1_000_000 ? `RM ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `RM ${(n / 1_000).toFixed(0)}K` : `RM ${n.toFixed(0)}`;

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

const RUNWAY_CHIP: Record<string, { label: string; cls: string }> = {
  healthy: { label: 'Healthy', cls: 'ok' },
  caution: { label: 'Caution', cls: 'warn' },
  critical: { label: 'Critical', cls: 'bad' },
  unknown: { label: '—', cls: 'muted' },
};

const ALERT_ICON: Record<string, typeof TrendingDown> = {
  concentration: TrendingUp,
  overrun: TrendingDown,
  ar_overdue: AlertTriangle,
  ap_overdue: AlertTriangle,
};

type ModalType =
  | 'cash' | 'runway' | 'revenue' | 'margin' | 'ebitda' | 'burn'
  | 'revOpex' | 'cashFlow' | 'ar' | 'ap' | 'debtEquity' | 'equityRatio'
  | 'arApCoverage' | 'workingCapital' | 'monthlyPl' | 'apAging'
  | null;

export function ExecutiveOverviewTab({ stats, color }: Props) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const chip = RUNWAY_CHIP[stats.runwayStatus] ?? RUNWAY_CHIP.unknown;

  // ── Single grid: 11 KPI cards, 2 rows of 6 (6+5) ──
  const allKpis = [
    { label: 'Accounts Receivable', value: fmt(stats.totalAR), modal: 'ar' as ModalType },
    { label: 'Accounts Payable', value: fmt(stats.totalAP), modal: 'apAging' as ModalType },
    { label: 'Revenue (YTD)', value: fmt(stats.revenueYTD), modal: 'revenue' as ModalType },
    { label: 'Gross Profit Margin', value: fmtPct(stats.grossProfitMargin), modal: 'margin' as ModalType },
    { label: 'Debt-to-Equity Ratio', value: stats.debtToEquity.toFixed(2), modal: 'debtEquity' as ModalType },
    { label: 'Equity Ratio', value: fmtPct(stats.equityRatio * 100), modal: 'equityRatio' as ModalType },
    { label: 'AR to AP Coverage', value: `${stats.arToApCoverage.toFixed(1)}x`, sub: `AR ${fmt(stats.totalAR)} / AP ${fmt(stats.totalAP)}`, modal: 'arApCoverage' as ModalType },
    { label: 'Net Working Capital', value: fmt(stats.netWorkingCapital), sub: `CA − CL`, modal: 'workingCapital' as ModalType },
    { label: 'Liquid Cash', value: fmt(stats.totalLiquidCash), sub: chip.label !== '—' ? chip.label : undefined, chip, modal: 'cash' as ModalType },
    { label: 'Total Equity', value: fmt(stats.totalEquity), modal: 'equityRatio' as ModalType },
    { label: 'Total Liabilities', value: fmt(stats.totalLiabilities), modal: 'debtEquity' as ModalType },
  ];

  // Combo chart series for monthly P&L trend
  const PL_SERIES = [
    { key: 'revenue', label: 'Revenue', type: 'bar' as const, color },
    { key: 'expenses', label: 'Expenses', type: 'bar' as const, color: '#fbbf24' },
    { key: 'net_profit', label: 'Net Profit', type: 'line' as const, color: '#ceef7d' },
  ];

  // AR/AP trend data (derived from monthly P&L trend + current AR/AP)
  const arApTrend = stats.monthlyPlTrend.map((pt: MonthlyPlTrendPoint) => ({
    month: pt.month,
    receivable: stats.totalAR,
    payable: stats.totalAP,
  }));

  // AP aging bar chart data
  const apAgingData = (stats.apAgingByTarget || []).map((b: ApAgingBucket) => ({
    label: b.label,
    amount: b.amount,
  }));

  return (
    <div className="sd-stack">
      {/* Risk Alerts — shown above KPIs when present */}
      {stats.riskAlerts.length > 0 && (
        <div className="sd-stack" style={{ gap: '0.5rem' }}>
          {stats.riskAlerts.map((alert, i) => {
            const Icon = ALERT_ICON[alert.type] ?? AlertTriangle;
            return (
              <div key={i} className={`sd-alert-row ${alert.level === 'critical' ? 'critical' : 'warning'}`}>
                <Icon className="h-4 w-4 shrink-0" />
                {alert.message}
              </div>
            );
          })}
        </div>
      )}

      {/* KPI cards — 11 in a single grid (2 rows: 6 + 5) */}
      <div className="sd-kpi-grid">
        {allKpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => setActiveModal(kpi.modal)}
            className="sd-kpi-card"
            style={{ cursor: 'pointer', textAlign: 'left', border: `1px solid ${BORDER}`, transition: 'border-color 0.15s' }}
          >
            <div className="sd-kpi-label">{kpi.label}</div>
            <div className="sd-kpi-value">{kpi.value}</div>
            {(kpi.chip || kpi.sub) && (
              <div className="sd-kpi-sub">
                {kpi.chip && <span className={`sd-chip ${kpi.chip.cls}`}>{kpi.chip.label}</span>}
                {!kpi.chip && kpi.sub && <span style={{ fontSize: '0.72rem', color: MUTED }}>{kpi.sub}</span>}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Charts Row 1 — Monthly P&L Trend (6 months) + AR vs AP Trend */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ cursor: 'pointer' }} onClick={() => setActiveModal('monthlyPl')}>
          <h3 className="sd-chart-title">Revenue, Expenses & Net Profit (6 Mo)</h3>
          <p className="sd-chart-sub">Monthly P&L trend — click for detail</p>
          <ComboChart data={stats.monthlyPlTrend} xKey="month" series={PL_SERIES} unit="RM " height={220} />
        </div>
        <div className="sd-chart-card" style={{ cursor: 'pointer' }} onClick={() => setActiveModal('arApCoverage')}>
          <h3 className="sd-chart-title">Accounts Receivable vs Accounts Payable</h3>
          <p className="sd-chart-sub">Current outstanding — click for detail</p>
          <ComboChart
            data={arApTrend}
            xKey="month"
            series={[
              { key: 'receivable', label: 'AR', type: 'bar', color },
              { key: 'payable', label: 'AP', type: 'bar', color: '#fbbf24' },
            ]}
            unit="RM "
            height={220}
          />
        </div>
      </div>

      {/* Charts Row 2 — AP by Payment Target + Cash Balance Trend */}
      <div className="sd-row">
        <div className="sd-chart-card" style={{ cursor: 'pointer' }} onClick={() => setActiveModal('apAging')}>
          <h3 className="sd-chart-title">Accounts Payable by Payment Target</h3>
          <p className="sd-chart-sub">Days past due — click for bill detail</p>
          <BarChart data={apAgingData} xKey="label" yKey="amount" name="Accounts Payable" color="#fbbf24" unit="RM " height={220} />
        </div>
        <div className="sd-chart-card" style={{ cursor: 'pointer' }} onClick={() => setActiveModal('cashFlow')}>
          <h3 className="sd-chart-title">Cash Balance &amp; Net Flow Trend</h3>
          <p className="sd-chart-sub">Liquidity trend — click for detail</p>
          <LineChart
            data={stats.cashFlowTrend}
            xKey="month"
            yKey="cash"
            color={color}
            unit="RM "
            height={220}
            dataKeys={['cash', 'netFlow']}
            colors={[color, '#ceef7d']}
            labels={{ cash: 'Cash Balance', netFlow: 'Net Cash Flow' }}
          />
        </div>
      </div>

      {stats.unpaidStatutory > 0 && (
        <div className="sd-chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: MUTED }}>Unpaid Statutory &amp; Tax Liabilities</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--samurai-danger)' }}>{fmt(stats.unpaidStatutory)}</span>
        </div>
      )}

      {/* ── Popout modals ── */}

      {/* Popout: AR → AR aging breakdown */}
      {activeModal === 'ar' && (
        <FinanceDetailModal title="Accounts Receivable Breakdown" subtitle={`Total AR: ${fmt(stats.totalAR)} · DSO: ${stats.dso.toFixed(0)} days`} onClose={() => setActiveModal(null)} maxWidth="40rem">
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            <ArAgingBar aging={stats.arAging} />
            {stats.dunningQueue.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT, margin: '0.75rem 0 0.4rem' }}>Dunning Queue ({stats.dunningQueue.length})</div>
                <div className="sd-stack" style={{ gap: '0.3rem' }}>
                  {stats.dunningQueue.slice(0, 10).map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: SURFACE_2, borderRadius: '0.4rem', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: TEXT }}>{d.customer}</div>
                        <div style={{ fontSize: '0.7rem', color: MUTED }}>{d.invoice_no} · Due {d.due_date}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: TEXT }}>{fmt(d.amount)}</div>
                        <div style={{ fontSize: '0.7rem', color: d.aging_days > 90 ? 'var(--samurai-danger)' : 'var(--samurai-warning)' }}>{d.aging_days} days overdue</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Revenue → monthly P&L detail */}
      {activeModal === 'revenue' && (
        <FinanceDetailModal title="Revenue Detail" subtitle={`MTD: ${fmt(stats.revenueMTD)} · YTD: ${fmt(stats.revenueYTD)}`} onClose={() => setActiveModal(null)} maxWidth="44rem">
          <ComboChart data={stats.monthlyPlTrend} xKey="month" series={PL_SERIES} unit="RM " height={280} />
        </FinanceDetailModal>
      )}

      {/* Popout: Gross Margin → unit economics */}
      {activeModal === 'margin' && (
        <FinanceDetailModal title="Gross Margin Detail" subtitle="Margin and unit economics" onClose={() => setActiveModal(null)} maxWidth="32rem">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <DetailBox label="Gross Margin" value={`${stats.grossMargin.toFixed(1)}%`} />
            <DetailBox label="EBITDA Margin" value={`${stats.ebitdaMargin.toFixed(1)}%`} />
            <DetailBox label="Contribution Margin" value={`${stats.unitEconomics.contribution_margin_pct.toFixed(1)}%`} />
            <DetailBox label="CAC" value={stats.unitEconomics.cac > 0 ? fmt(stats.unitEconomics.cac) : '—'} />
            <DetailBox label="LTV" value={stats.unitEconomics.ltv > 0 ? fmt(stats.unitEconomics.ltv) : '—'} />
            <DetailBox label="LTV/CAC Ratio" value={stats.unitEconomics.ltv_cac_ratio > 0 ? `${stats.unitEconomics.ltv_cac_ratio.toFixed(1)}x` : '—'} />
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Debt-to-Equity → liability + equity breakdown */}
      {activeModal === 'debtEquity' && (
        <FinanceDetailModal title="Debt-to-Equity Ratio" subtitle={`Total Liabilities ${fmt(stats.totalLiabilities)} / Total Equity ${fmt(stats.totalEquity)}`} onClose={() => setActiveModal(null)} maxWidth="40rem">
          <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.6rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: TEXT }}>{stats.debtToEquity.toFixed(2)}</div>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.2rem' }}>
              {stats.debtToEquity < 0.5 ? 'Conservative leverage' : stats.debtToEquity < 1.5 ? 'Healthy leverage' : 'High leverage — monitor closely'}
            </div>
          </div>
          <div className="sd-stack" style={{ gap: '0.4rem' }}>
            <OpxBar label="Total Liabilities" value={stats.totalLiabilities} total={stats.totalLiabilities + stats.totalEquity} color="var(--samurai-warning)" />
            <OpxBar label="Total Equity" value={stats.totalEquity} total={stats.totalLiabilities + stats.totalEquity} color="var(--samurai-ok)" />
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: AR to AP Coverage → AR vs AP detail */}
      {activeModal === 'arApCoverage' && (
        <FinanceDetailModal title="AR to AP Coverage Ratio" subtitle={`AR ${fmt(stats.totalAR)} / AP ${fmt(stats.totalAP)}`} onClose={() => setActiveModal(null)} maxWidth="36rem">
          <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.6rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: TEXT }}>{stats.arToApCoverage.toFixed(2)}x</div>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.2rem' }}>
              {stats.arToApCoverage >= 1 ? 'AR covers AP — healthy liquidity' : 'AR does not cover AP — monitor cash flow'}
            </div>
          </div>
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            <OpxBar label="Accounts Receivable" value={stats.totalAR} total={Math.max(stats.totalAR, stats.totalAP)} color="var(--samurai-ok)" />
            <OpxBar label="Accounts Payable" value={stats.totalAP} total={Math.max(stats.totalAR, stats.totalAP)} color="var(--samurai-warning)" />
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Equity Ratio → equity vs assets */}
      {activeModal === 'equityRatio' && (
        <FinanceDetailModal title="Equity Ratio" subtitle={`Equity ${fmt(stats.totalEquity)} / Total Assets ${fmt(stats.totalAssets)}`} onClose={() => setActiveModal(null)} maxWidth="36rem">
          <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.6rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: TEXT }}>{(stats.equityRatio * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.2rem' }}>
              {stats.equityRatio > 0.5 ? 'Equity-funded — strong solvency' : 'Leveraged — monitor debt levels'}
            </div>
          </div>
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            <OpxBar label="Total Equity" value={stats.totalEquity} total={stats.totalAssets} color="var(--samurai-ok)" />
            <OpxBar label="Total Liabilities" value={stats.totalLiabilities} total={stats.totalAssets} color="var(--samurai-warning)" />
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Working Capital → CA vs CL */}
      {activeModal === 'workingCapital' && (
        <FinanceDetailModal title="Net Working Capital" subtitle={`Current Assets ${fmt(stats.totalCurrentAssets)} − Current Liabilities ${fmt(stats.totalCurrentLiabilities)}`} onClose={() => setActiveModal(null)} maxWidth="36rem">
          <div style={{ textAlign: 'center', marginBottom: '0.75rem', padding: '0.6rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, color: TEXT }}>{fmt(stats.netWorkingCapital)}</div>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.2rem' }}>
              {stats.netWorkingCapital > 0 ? 'Positive — can cover short-term obligations' : 'Negative — short-term liquidity risk'}
            </div>
          </div>
          <div className="sd-stack" style={{ gap: '0.5rem' }}>
            <OpxBar label="Gross Working Capital (Current Assets)" value={stats.totalCurrentAssets} total={Math.max(stats.totalCurrentAssets, stats.totalCurrentLiabilities, 1)} color="var(--samurai-ok)" />
            <OpxBar label="Current Liabilities" value={stats.totalCurrentLiabilities} total={Math.max(stats.totalCurrentAssets, stats.totalCurrentLiabilities, 1)} color="var(--samurai-warning)" />
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Liquid Cash → bank accounts */}
      {activeModal === 'cash' && (
        <FinanceDetailModal title="Liquid Cash Breakdown" subtitle="All bank accounts" onClose={() => setActiveModal(null)} maxWidth="36rem">
          <div style={{ marginBottom: '0.75rem', textAlign: 'center', padding: '0.6rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
            <div style={{ fontSize: '0.72rem', color: MUTED }}>Total Liquid Cash</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: TEXT }}>{fmt(stats.totalLiquidCash)}</div>
          </div>
          <div className="sd-stack" style={{ gap: '0.4rem' }}>
            {stats.bankAccounts.map((acct) => (
              <div key={acct.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0.5rem', background: SURFACE_2, padding: '0.5rem 0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: TEXT }}>{acct.name}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>{acct.currency}{acct.last_reconciled ? ` · Rec: ${acct.last_reconciled}` : ''}</div>
                </div>
                <div style={{ fontWeight: 600, color: TEXT }}>{fmt(acct.balance_myr)}</div>
              </div>
            ))}
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Monthly P&L → full chart */}
      {activeModal === 'monthlyPl' && (
        <FinanceDetailModal title="Revenue, Expenses & Net Profit" subtitle="6-month P&L trend" onClose={() => setActiveModal(null)} maxWidth="44rem">
          <ComboChart data={stats.monthlyPlTrend} xKey="month" series={PL_SERIES} unit="RM " height={300} />
        </FinanceDetailModal>
      )}

      {/* Popout: AP Aging → bill detail */}
      {activeModal === 'apAging' && (
        <FinanceDetailModal title="Accounts Payable by Payment Target" subtitle={`Total AP: ${fmt(stats.totalAP)} · DPO: ${stats.dpo.toFixed(0)} days`} onClose={() => setActiveModal(null)} maxWidth="44rem">
          <BarChart data={apAgingData} xKey="label" yKey="amount" name="Accounts Payable" color="#fbbf24" unit="RM " height={250} />
          {stats.apBills.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT, margin: '0 0 0.4rem' }}>Outstanding Bills ({stats.apBills.length})</div>
              <div className="sd-stack" style={{ gap: '0.3rem' }}>
                {stats.apBills.slice(0, 10).map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: SURFACE_2, borderRadius: '0.4rem', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
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
        </FinanceDetailModal>
      )}

      {/* Popout: Cash flow chart */}
      {activeModal === 'cashFlow' && (
        <FinanceDetailModal title="Cash Balance & Net Flow" subtitle="12-month liquidity trend" onClose={() => setActiveModal(null)} maxWidth="44rem">
          <LineChart
            data={stats.cashFlowTrend}
            xKey="month"
            yKey="cash"
            color={color}
            unit="RM "
            height={280}
            dataKeys={['cash', 'netFlow']}
            colors={[color, '#ceef7d']}
            labels={{ cash: 'Cash Balance', netFlow: 'Net Cash Flow' }}
          />
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
            <div style={{ height: '100%', width: `${(b.amount / max) * 100}%`, borderRadius: 999, background: b.label.includes('90') ? 'var(--samurai-danger)' : b.label.includes('60') ? 'var(--samurai-warning)' : 'var(--samurai-ok)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OpxBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: MUTED, marginBottom: '0.3rem' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: TEXT }}>{fmt(value)}</span>
      </div>
      <div style={{ height: '0.5rem', borderRadius: 999, overflow: 'hidden', background: SURFACE_2 }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: color }} />
      </div>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.72rem', color: MUTED }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: TEXT, marginTop: '0.15rem' }}>{value}</div>
    </div>
  );
}
