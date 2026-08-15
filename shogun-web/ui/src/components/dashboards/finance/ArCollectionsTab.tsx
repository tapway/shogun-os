import { useState } from 'react';
import { FinanceDetailModal } from './FinanceDetailModal';
import { DunningEmailModal } from './DunningEmailModal';
import type { DunningItem, FinanceDashboardStats } from '../../../lib/types';

interface Props { stats: FinanceDashboardStats; color: string; department: string }

const fmtMyr = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

const BUCKET_CHIP: Record<string, string> = {
  '0-30': 'ok', '31-60': 'warn', '61-90': 'warn', '90+': 'bad',
};

const BUCKET_COLORS: Record<string, string> = {
  '0-30': 'var(--samurai-ok)',
  '31-60': 'var(--samurai-warning)',
  '61-90': '#f59e0b',
  '90+': 'var(--samurai-danger)',
};

export function ArCollectionsTab({ stats, department }: Props) {
  const [dunningTarget, setDunningTarget] = useState<DunningItem | null>(null);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<DunningItem | null>(null);

  const ag = stats.arAging;
  const agTotal = ag.bucket_0_30 + ag.bucket_31_60 + ag.bucket_61_90 + ag.bucket_90_plus;
  const pct = (n: number) => (agTotal > 0 ? (n / agTotal) * 100 : 0);

  const buckets = [
    { label: '0–30 days', val: ag.bucket_0_30, key: '0-30', color: BUCKET_COLORS['0-30'] },
    { label: '31–60 days', val: ag.bucket_31_60, key: '31-60', color: BUCKET_COLORS['31-60'] },
    { label: '61–90 days', val: ag.bucket_61_90, key: '61-90', color: BUCKET_COLORS['61-90'] },
    { label: '90+ days', val: ag.bucket_90_plus, key: '90+', color: BUCKET_COLORS['90+'] },
  ];

  const kpis = [
    { label: 'Total AR', value: fmtMyr(stats.totalAR), warn: false },
    { label: 'Overdue >30d', value: fmtMyr(stats.arOverdue30), warn: stats.arOverdue30 > 0 },
    { label: 'DSO', value: stats.dso > 0 ? `${stats.dso.toFixed(0)} days` : '—', warn: false },
  ];

  // Filter all outstanding invoices by bucket for popout
  const bucketInvoices = activeBucket
    ? stats.arInvoices.filter((d) => d.bucket === activeBucket)
    : [];

  return (
    <div className="sd-stack">
      <div className="sd-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {kpis.map((m) => (
          <div key={m.label} className="sd-kpi-card">
            <div className="sd-kpi-label">{m.label}</div>
            <div className="sd-kpi-value" style={{ color: m.warn ? 'var(--samurai-danger)' : TEXT }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* AR Aging — visual bars, click to popout invoices */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">AR Aging Distribution</h3>
        <p className="sd-chart-sub">Click a bucket to see invoices in that aging range</p>
        <div className="sd-stack" style={{ gap: '0.6rem' }}>
          {buckets.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setActiveBucket(b.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <div style={{ width: '5rem', flexShrink: 0, fontSize: '0.75rem', color: MUTED, textAlign: 'left' }}>{b.label}</div>
              <div style={{ flex: 1, height: '1.2rem', borderRadius: '0.3rem', overflow: 'hidden', background: SURFACE_2 }}>
                <div style={{ height: '100%', width: `${pct(b.val)}%`, borderRadius: '0.3rem', background: b.color, transition: 'width 0.3s' }} />
              </div>
              <div style={{ width: '6rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color: TEXT }}>{fmtMyr(b.val)}</div>
              <div style={{ width: '3rem', textAlign: 'right', fontSize: '0.72rem', color: MUTED }}>{pct(b.val).toFixed(0)}%</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dunning Queue */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Dunning Queue</h3>
        <p className="sd-chart-sub">Overdue invoices requiring collection action — click row for actions</p>
        {stats.dunningQueue.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: MUTED }}>No overdue invoices requiring action.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="pb-2 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Customer</th>
                  <th className="pb-2 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Invoice #</th>
                  <th className="pb-2 text-right" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Amount</th>
                  <th className="pb-2 text-center" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Bucket</th>
                  <th className="pb-2 text-center" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.dunningQueue.map((item) => (
                  <tr key={item.invoice_no} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="py-2" style={{ fontWeight: 600, color: TEXT }}>{item.customer}</td>
                    <td className="py-2" style={{ color: MUTED }}>{item.invoice_no}</td>
                    <td className="py-2 text-right" style={{ fontWeight: 600, color: TEXT }}>{fmtMyr(item.amount)}</td>
                    <td className="py-2 text-center">
                      <span className={`sd-chip ${BUCKET_CHIP[item.bucket] ?? 'muted'}`}>{item.bucket}d</span>
                    </td>
                    <td className="py-2 text-center">
                      <button type="button" onClick={() => setDunningTarget(item)} className="sd-btn sd-btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>
                        Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Popout: bucket invoices */}
      {activeBucket && (
        <FinanceDetailModal
          title={`${activeBucket} Days Outstanding`}
          subtitle={`${bucketInvoices.length} invoices in this aging bucket`}
          onClose={() => setActiveBucket(null)}
        >
          {bucketInvoices.length === 0 ? (
            <p style={{ color: MUTED, fontSize: '0.85rem' }}>No invoices in this bucket.</p>
          ) : (
            <div className="sd-stack" style={{ gap: '0.4rem' }}>
              {bucketInvoices.map((inv) => (
                <div key={inv.invoice_no} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: SURFACE_2 }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{inv.customer}</div>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>{inv.invoice_no} · Due {inv.due_date}</div>
                  </div>
                  <div style={{ fontWeight: 600, color: TEXT }}>{fmtMyr(inv.amount)}</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderTop: `1px solid ${BORDER}`, marginTop: '0.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: MUTED }}>Total ({bucketInvoices.length} invoices)</div>
                <div style={{ fontWeight: 700, color: TEXT, fontSize: '0.95rem' }}>{fmtMyr(bucketInvoices.reduce((s, i) => s + i.amount, 0))}</div>
              </div>
            </div>
          )}
        </FinanceDetailModal>
      )}

      {/* Popout: dunning action */}
      {dunningTarget && (
        <FinanceDetailModal
          title="Dunning Action"
          subtitle={`${dunningTarget.customer} · ${dunningTarget.invoice_no}`}
          onClose={() => setDunningTarget(null)}
          maxWidth="28rem"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>Amount Due</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT, fontSize: '1.1rem' }}>{fmtMyr(dunningTarget.amount)}</div>
            </div>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>Overdue Days</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--samurai-danger)', fontSize: '1.1rem' }}>{dunningTarget.aging_days}d</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem' }}>
            <p style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.6rem' }}>Select action to send to Koku (Finance Agent):</p>
            <div className="sd-stack" style={{ gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => {
                  setEmailTarget(dunningTarget);
                  setDunningTarget(null);
                }}
                className="sd-btn sd-btn-primary"
                style={{ justifyContent: 'flex-start', fontWeight: 500 }}
              >
                Send Reminder Email
              </button>
              {['Escalate to Sales', 'Flag for Legal Notice', 'Log Call Note'].map((action) => (
                <button key={action} type="button" onClick={() => setDunningTarget(null)} className="sd-btn sd-btn-secondary" style={{ justifyContent: 'flex-start', fontWeight: 500 }}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        </FinanceDetailModal>
      )}

      {/* Popout: Dunning email flow (form → draft → send) */}
      {emailTarget && (
        <DunningEmailModal
          dunningItem={emailTarget}
          department={department}
          onClose={() => setEmailTarget(null)}
        />
      )}
    </div>
  );
}
