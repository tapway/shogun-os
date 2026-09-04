import { useState } from 'react';
import { FinanceDetailModal } from './FinanceDetailModal';
import type { ApBillItem, FinanceDashboardStats } from '../../../lib/types';

interface Props { stats: FinanceDashboardStats; color: string }

const fmtMyr = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

export function ApPaymentsTab({ stats }: Props) {
  const [billTarget, setBillTarget] = useState<ApBillItem | null>(null);

  const kpis = [
    { label: 'Total AP', value: fmtMyr(stats.totalAP), warn: false },
    { label: 'AP Overdue', value: fmtMyr(stats.apOverdue), warn: stats.apOverdue > 0 },
    { label: 'DPO', value: stats.dpo > 0 ? `${(stats.dpo || 0).toFixed(0)} days` : '—', warn: false },
  ];

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

      {/* Bills Table */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Vendor Bills — Payment Run Queue</h3>
        <p className="sd-chart-sub">Click a row for bill detail and payment action</p>
        {stats.apBills.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: MUTED }}>No AP bills pending.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="pb-2 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Vendor</th>
                  <th className="pb-2 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Bill #</th>
                  <th className="pb-2 text-left" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Due Date</th>
                  <th className="pb-2 text-right" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.apBills.map((bill) => (
                  <tr
                    key={bill.bill_no}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                    onClick={() => setBillTarget(bill)}
                  >
                    <td className="py-2" style={{ fontWeight: 600, color: TEXT }}>{bill.vendor}</td>
                    <td className="py-2" style={{ color: MUTED }}>{bill.bill_no}</td>
                    <td className="py-2" style={{ color: MUTED }}>{bill.due_date}</td>
                    <td className="py-2 text-right" style={{ fontWeight: 600, color: TEXT }}>{fmtMyr(bill.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Popout: bill detail */}
      {billTarget && (
        <FinanceDetailModal
          title="Bill Detail"
          subtitle={`${billTarget.vendor} · ${billTarget.bill_no}`}
          onClose={() => setBillTarget(null)}
          maxWidth="30rem"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>Bill Amount</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT, fontSize: '1.1rem' }}>{fmtMyr(billTarget.amount)}</div>
            </div>
            <div style={{ borderRadius: '0.5rem', background: SURFACE_2, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>Due Date</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: TEXT, fontSize: '1rem' }}>{billTarget.due_date}</div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '0.75rem' }}>
            <p style={{ fontSize: '0.72rem', color: MUTED, marginBottom: '0.6rem' }}>Actions (sends to Koku — Finance Agent):</p>
            <div className="sd-stack" style={{ gap: '0.4rem' }}>
              {['Approve & Schedule Payment', 'Hold Pending Clarification', 'Reject — Dispute Amount', 'Request Vendor Credit Note'].map((action) => (
                <button key={action} type="button" onClick={() => setBillTarget(null)} className="sd-btn sd-btn-secondary" style={{ justifyContent: 'flex-start', fontWeight: 500 }}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        </FinanceDetailModal>
      )}
    </div>
  );
}
