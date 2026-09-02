import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';

interface Props {
  dept: string;
  color: string;
  projectId: string;
  onClose: () => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const DANGER = 'var(--samurai-danger)';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRm(value?: number | null): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`;
  return `RM ${value.toFixed(0)}`;
}

function statusChipClass(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('complete') || s.includes('pass')) return 'ok';
  if (s.includes('progress')) return 'warn';
  if (s.includes('cancel') || s.includes('fail')) return 'bad';
  return 'muted';
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED, margin: '1rem 0 0.5rem' }}>
      {children}
    </div>
  );
}

export function ProjectDetailModal({ dept, color, projectId, onClose }: Props) {
  const query = useQuery({
    queryKey: ['project-detail', dept, projectId],
    queryFn: () => departmentsApi.projectDetail(dept, projectId),
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const project = query.data;

  const metaRows: [string, string][] = project ? [
    ['Client', project.client || '—'],
    ['PM', project.pm || '—'],
    ['Product', project.product || '—'],
    ['Value', fmtRm(project.valueRm)],
    ['Gate', project.gate != null ? `G${project.gate}${project.gateStatus ? ` — ${project.gateStatus}` : ''}` : '—'],
    ['Start', fmtDate(project.startDate)],
    ['Target End', fmtDate(project.targetEnd)],
    ['Actual End', fmtDate(project.actualEnd)],
  ] : [];

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'default' }}
        onClick={onClose}
        aria-label="Close"
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12" onClick={onClose}>
        <div
          className="sd-card relative z-50 w-full"
          style={{ maxWidth: '46rem', maxHeight: '85vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: MUTED, fontFamily: 'var(--font-mono, monospace)' }}>{projectId}</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: TEXT, margin: 0 }}>
                {project?.name ?? (query.isLoading ? 'Loading…' : 'Project not found')}
              </h2>
              {project?.status && (
                <span className={`sd-chip ${statusChipClass(project.status)}`} style={{ marginTop: '0.4rem', display: 'inline-block' }}>
                  {project.status}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="sd-btn sd-btn-ghost"
              style={{ padding: '0.3rem 0.5rem' }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {query.isLoading && (
            <div className="sd-empty" style={{ padding: '32px 0' }}>
              <div className="h-6 w-6 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
            </div>
          )}

          {query.isError && (
            <div className="px-5 py-6" style={{ color: MUTED, fontSize: '0.85rem' }}>
              Failed to load project details.
            </div>
          )}

          {project && (
            <div className="px-5 pb-5">
              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-4 md:grid-cols-4">
                {metaRows.map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.66rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>{label}</div>
                    <div style={{ fontSize: '0.82rem', color: TEXT, marginTop: '0.15rem' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Goals */}
              {project.goals.length > 0 && (
                <>
                  <SectionTitle>Goals ({project.goals.length})</SectionTitle>
                  <div className="sd-stack" style={{ gap: '0.5rem' }}>
                    {project.goals.map((g) => (
                      <div key={g.id} className="rounded-lg p-3" style={{ background: SURFACE_2 }}>
                        <div className="flex items-start justify-between gap-2">
                          <div style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 500 }}>{g.description || '—'}</div>
                          {g.status && <span className={`sd-chip ${statusChipClass(g.status)}`} style={{ flexShrink: 0 }}>{g.status.split('—')[0].trim()}</span>}
                        </div>
                        {(g.kpi || g.deadline) && (
                          <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.35rem' }}>
                            {g.kpi && <span>KPI: {g.kpi}</span>}
                            {g.kpi && g.deadline && <span> · </span>}
                            {g.deadline && <span>Due {fmtDate(g.deadline)}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Tasks */}
              <SectionTitle>Tasks ({project.tasks.length})</SectionTitle>
              {project.tasks.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: MUTED }}>No tasks recorded.</div>
              ) : (
                <div className="sd-stack" style={{ gap: '0.4rem', maxHeight: '260px', overflowY: 'auto' }}>
                  {project.tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: SURFACE_2 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: '0.8rem', color: TEXT }} title={t.title}>{t.title || t.id}</div>
                        <div style={{ fontSize: '0.68rem', color: MUTED }}>
                          {t.owner || 'Unassigned'}{t.deadline ? ` · due ${fmtDate(t.deadline)}` : ''}
                          {t.isOverdue && <span style={{ color: DANGER, fontWeight: 600 }}> · overdue</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                        {t.priority && <span className={`sd-chip ${t.priority.toLowerCase().includes('critical') || t.priority.toLowerCase().includes('high') ? 'bad' : 'muted'}`}>{t.priority}</span>}
                        <span className={`sd-chip ${statusChipClass(t.status)}`}>{t.status || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Risks */}
              {project.risks.length > 0 && (
                <>
                  <SectionTitle>Risks ({project.risks.length})</SectionTitle>
                  <div className="sd-stack" style={{ gap: '0.5rem' }}>
                    {project.risks.map((r) => (
                      <div key={r.id} className="rounded-lg p-3" style={{ background: SURFACE_2 }}>
                        <div style={{ fontSize: '0.82rem', color: TEXT }}>{r.description || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.25rem' }}>
                          {r.impact && <span>Impact: {r.impact}</span>}
                          {r.mitigation && <span> · Mitigation: {r.mitigation}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Team */}
              {project.teamMembers.length > 0 && (
                <>
                  <SectionTitle>Team ({project.teamMembers.length})</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {project.teamMembers.map((m) => (
                      <span key={m.id} className="sd-chip muted">
                        {m.name || 'Unknown'}{m.role ? ` — ${m.role}` : ''}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Definition of Done */}
              {project.dodItems.length > 0 && (
                <>
                  <SectionTitle>Definition of Done ({project.dodItems.filter((d) => d.passed).length}/{project.dodItems.length} passed)</SectionTitle>
                  <div className="sd-stack" style={{ gap: '0.4rem' }}>
                    {project.dodItems.map((d) => (
                      <div key={d.id} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: SURFACE_2 }}>
                        <span style={{ color: d.passed ? 'var(--samurai-success, #22c55e)' : MUTED, fontSize: '0.85rem', lineHeight: 1.4 }}>
                          {d.passed ? '✓' : '○'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', color: TEXT }}>{d.criteria || '—'}</div>
                          {d.acceptance && <div style={{ fontSize: '0.7rem', color: MUTED }}>{d.acceptance}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
