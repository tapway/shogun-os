import { useState } from 'react';
import type { ProcurementDashboardStats, PurchaseRequisition } from '../../../lib/types';

interface Props {
  stats: ProcurementDashboardStats;
  onAction?: (actionType: string, entity: any) => void;
}

const PRIORITY_STYLE: Record<string, string> = {
  Low: 'muted',
  Medium: 'muted',
  High: 'warn',
  Urgent: 'bad',
};

const STATUS_STYLE: Record<string, string> = {
  Draft: 'muted',
  'Pending Approval': 'warn',
  Approved: 'ok',
  'Converted to RFQ/PO': 'muted',
  Rejected: 'bad',
};

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const SURFACE_2 = 'var(--samurai-surface-2)';

const th = { fontSize: '0.72rem', fontWeight: 500, color: MUTED } as const;
function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return <th className="px-3 py-2.5" style={{ ...th, textAlign: align }}>{children}</th>;
}

const FILTERS = ['All', 'Pending Approval', 'Approved', 'Converted to RFQ/PO'] as const;

export function PurchaseRequisitionsTab({ stats, onAction }: Props) {
  const prList = stats.purchaseRequisitions ?? [];
  const [filter, setFilter] = useState<'All' | 'Pending Approval' | 'Approved' | 'Converted to RFQ/PO'>('All');

  const filteredPrs = prList.filter((pr) => (filter === 'All' ? true : pr.status === filter));

  return (
    <div className="sd-stack">
      {/* Normal Header Card */}
      <div className="sd-chart-card">
        <h3 className="sd-chart-title">Purchase Requisitions (PR)</h3>
        <p className="sd-chart-sub">
          Requisition status log tracking internal demand from request through approval to RFQ conversion.
        </p>

        {/* Status Filter Pills */}
        <div className="sd-theme-seg" style={{ marginTop: '0.5rem', padding: '0.25rem', flexWrap: 'wrap', gap: '0.35rem' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={filter === f ? 'active' : ''}
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem', borderRadius: '0.4rem', whiteSpace: 'nowrap', width: 'auto' }}
            >
              {f} ({f === 'All' ? prList.length : prList.filter((p) => p.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* PR List Table */}
      <div className="sd-chart-card">
        {filteredPrs.length === 0 ? (
          <p style={{ padding: '1rem 0', textAlign: 'center', fontSize: '0.85rem', color: MUTED }}>
            No purchase requisitions matching filter &ldquo;{filter}&rdquo;.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th align="left">PR ID</Th>
                  <Th align="left">Requester & Dept</Th>
                  <Th align="left">Item Description</Th>
                  <Th align="right">Est. Total</Th>
                  <Th align="center">Priority</Th>
                  <Th align="center">Status</Th>
                  <Th align="center">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredPrs.map((pr) => (
                  <tr key={pr.pr_number} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="px-3 py-2.5" style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 600, color: TEXT }}>{pr.pr_number}</td>
                    <td className="px-3 py-2.5">
                      <div style={{ fontWeight: 500, color: TEXT }}>{pr.requester}</div>
                      <div style={{ fontSize: '0.72rem', color: MUTED }}>{pr.department}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div style={{ fontWeight: 500, color: TEXT }}>{pr.item_description}</div>
                      {pr.justification && <div style={{ fontSize: '0.72rem', color: MUTED, fontStyle: 'italic' }}>&ldquo;{pr.justification}&rdquo;</div>}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ fontWeight: 600, color: TEXT }}>RM {(pr.estimated_amount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`sd-chip ${PRIORITY_STYLE[pr.priority] ?? 'muted'}`}>{pr.priority}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`sd-chip ${STATUS_STYLE[pr.status] ?? 'muted'}`}>{pr.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-1.5">
                        {pr.status === 'Pending Approval' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onAction?.('approve_pr', pr)}
                              className="sd-btn sd-btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => onAction?.('reject_pr', pr)}
                              className="sd-btn sd-btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: 'var(--samurai-danger)' }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {pr.status === 'Approved' && (
                          <button
                            type="button"
                            onClick={() => onAction?.('convert_to_rfq', pr)}
                            className="sd-btn sd-btn-primary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                          >
                            Send to RFQ
                          </button>
                        )}
                        {pr.status === 'Converted to RFQ/PO' && (
                          <span style={{ fontSize: '0.72rem', color: MUTED, fontStyle: 'italic' }}>Converted</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
