import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { SupportTicketItem } from '../../../lib/types';

interface Props {
  ticket: SupportTicketItem;
  onClose: () => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, margin: '1rem 0 0.5rem' }}>
      {children}
    </div>
  );
}

export function TicketDetailModal({ ticket, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const metaRows: [string, string][] = [
    ['Customer', ticket.customer || '—'],
    ['Linked Project', ticket.linkedProject || '—'],
    ['Priority', ticket.priorityLabel || ticket.priority || '—'],
    ['Category', ticket.category || '—'],
    ['Tier', ticket.tier || '—'],
    ['Assigned To', ticket.assignedTo || '—'],
    ['Status', ticket.status || '—'],
    ['Source', ticket.source || '—'],
    ['Opened', fmtDateTime(ticket.opened)],
    ['Target Resolve', fmtDateTime(ticket.targetResolve)],
    ['Resolved By', ticket.resolvedBy || '—'],
    ['Resolved Date', fmtDateTime(ticket.resolvedDate)],
  ];

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'default' }}
        onClick={onClose}
        aria-label="Close"
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12" onClick={onClose}>
        <div
          className="sd-card relative z-50 w-full"
          style={{ maxWidth: '46rem', maxHeight: '85vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: MUTED, fontFamily: 'var(--font-mono, monospace)' }}>{ticket.id}</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: TEXT, margin: 0 }}>
                {ticket.title || 'Untitled ticket'}
              </h2>
              <div className="flex items-center gap-2" style={{ marginTop: '0.4rem' }}>
                {ticket.status && (
                  <span className={`sd-chip ${ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'ok' : ticket.status === 'Open' || ticket.status === 'In Progress' ? 'warn' : 'muted'}`}>
                    {ticket.status}
                  </span>
                )}
                {ticket.priority && <span className={`sd-chip ${ticket.priority === 'P1' || ticket.priority === 'P2' ? 'bad' : 'muted'}`}>{ticket.priorityLabel || ticket.priority}</span>}
                {ticket.newReply && <span className="sd-chip bad">New reply</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="sd-btn sd-btn-ghost" style={{ padding: '0.3rem 0.5rem' }} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 pb-5">
            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-4 md:grid-cols-3">
              {metaRows.map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.66rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>{label}</div>
                  <div style={{ fontSize: '0.8rem', color: TEXT, marginTop: '0.15rem', wordBreak: 'break-word' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {ticket.description && (
              <>
                <SectionTitle>Description</SectionTitle>
                <div className="rounded-lg p-3" style={{ background: SURFACE_2, fontSize: '0.82rem', color: TEXT, whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </div>
              </>
            )}

            {/* Reporter */}
            {ticket.reporter && (
              <>
                <SectionTitle>Reporter</SectionTitle>
                <div style={{ fontSize: '0.8rem', color: TEXT }}>{ticket.reporter}</div>
              </>
            )}

            {/* Ticket tasks */}
            {ticket.ticketTasks.length > 0 && (
              <>
                <SectionTitle>Ticket Tasks ({ticket.ticketTasks.length})</SectionTitle>
                <div className="sd-stack" style={{ gap: '0.4rem' }}>
                  {ticket.ticketTasks.map((tt, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: SURFACE_2 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: '0.8rem', color: TEXT }}>{tt.task || `Task ${tt.num ?? i + 1}`}</div>
                        <div style={{ fontSize: '0.68rem', color: MUTED }}>
                          {tt.assignedTo || 'Unassigned'}{tt.due ? ` · due ${tt.due}` : ''}
                        </div>
                      </div>
                      {tt.status && <span className={`sd-chip ${(tt.status || '').toLowerCase().includes('done') ? 'ok' : 'muted'}`} style={{ flexShrink: 0 }}>{tt.status}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Timeline */}
            {ticket.timeline.length > 0 && (
              <>
                <SectionTitle>Timeline ({ticket.timeline.length})</SectionTitle>
                <div className="sd-stack" style={{ gap: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {ticket.timeline.map((entry, i) => (
                    <div key={i} className="flex gap-3 rounded-lg px-3 py-2" style={{ background: SURFACE_2 }}>
                      <div style={{ fontSize: '0.72rem', color: MUTED, whiteSpace: 'nowrap', minWidth: '92px' }}>{entry.dateTime || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: TEXT }}>
                        {entry.action || '—'}
                        {entry.by && entry.by !== 'auto' && <span style={{ color: MUTED }}> — {entry.by}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Resolution */}
            {(ticket.resolutionNotes || ticket.rootCause || ticket.preventive) && (
              <>
                <SectionTitle>Resolution</SectionTitle>
                <div className="sd-stack" style={{ gap: '0.5rem' }}>
                  {ticket.resolutionNotes && (
                    <div className="rounded-lg p-3" style={{ background: SURFACE_2 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: MUTED, marginBottom: '0.2rem' }}>Notes</div>
                      <div style={{ fontSize: '0.8rem', color: TEXT, whiteSpace: 'pre-wrap' }}>{ticket.resolutionNotes}</div>
                    </div>
                  )}
                  {ticket.rootCause && (
                    <div className="rounded-lg p-3" style={{ background: SURFACE_2 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: MUTED, marginBottom: '0.2rem' }}>Root Cause</div>
                      <div style={{ fontSize: '0.8rem', color: TEXT, whiteSpace: 'pre-wrap' }}>{ticket.rootCause}</div>
                    </div>
                  )}
                  {ticket.preventive && (
                    <div className="rounded-lg p-3" style={{ background: SURFACE_2 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: MUTED, marginBottom: '0.2rem' }}>Preventive Action</div>
                      <div style={{ fontSize: '0.8rem', color: TEXT, whiteSpace: 'pre-wrap' }}>{ticket.preventive}</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
