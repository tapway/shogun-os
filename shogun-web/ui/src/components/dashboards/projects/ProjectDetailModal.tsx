import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ArrowLeft, Pencil, CheckCircle2, AlertTriangle, User } from 'lucide-react';
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
const SUCCESS = 'var(--samurai-success, #22c55e)';
const CARD_BG = 'var(--samurai-card)';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRm(value?: number | null): string {
  if (value == null) return '—';
  return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type TabId = 'overview' | 'diagrams' | 'timeline' | 'tasks' | 'budget' | 'team' | 'reports' | 'gates' | 'uat';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'diagrams', label: 'Diagrams' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'budget', label: 'Budget' },
  { id: 'team', label: 'Team' },
  { id: 'reports', label: 'Reports' },
  { id: 'gates', label: 'Gates' },
  { id: 'uat', label: 'UAT' },
];

export function ProjectDetailModal({ dept, color, projectId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const query = useQuery({
    queryKey: ['project-detail', dept, projectId],
    queryFn: () => departmentsApi.projectDetail(dept, projectId),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const project = query.data;

  // Parse scope into in/out arrays
  const parseScope = (scope?: string) => {
    if (!scope) return { inScope: [] as string[], outScope: [] as string[] };
    const lines = scope.split('\n').map(l => l.trim()).filter(Boolean);
    const inScope: string[] = [];
    const outScope: string[] = [];
    let currentSection: 'in' | 'out' | null = null;
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('in scope') || lower.includes('included')) { currentSection = 'in'; continue; }
      if (lower.includes('out of scope') || lower.includes('excluded')) { currentSection = 'out'; continue; }
      const cleaned = line.replace(/^[-•*]\s*/, '');
      if (currentSection === 'out') outScope.push(cleaned);
      else inScope.push(cleaned);
    }
    return { inScope, outScope };
  };

  const healthColor = (h?: string) => {
    const s = (h || '').toLowerCase();
    if (s.includes('block')) return DANGER;
    if (s.includes('risk') || s.includes('warn')) return '#f59e0b';
    if (s.includes('good') || s.includes('ok') || s.includes('green')) return SUCCESS;
    return TEXT;
  };

  // Compute progress from tasks
  const progressPct = useMemo(() => {
    if (!project || project.tasks.length === 0) return 0;
    const done = project.tasks.filter(t => (t.status || '').toLowerCase().includes('done') || (t.status || '').toLowerCase().includes('complete')).length;
    return Math.round((done / project.tasks.length) * 100);
  }, [project]);

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

      {/* Full-page detail view */}
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--samurai-bg, #f5f5f5)' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: CARD_BG, borderBottom: `1px solid ${BORDER}` }}>
          <button
            type="button"
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: '0.8rem' }}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </button>
          <button type="button" onClick={onClose} className="sd-btn sd-btn-ghost" style={{ padding: '0.3rem 0.5rem' }} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {query.isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div className="h-6 w-6 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
            </div>
          )}

          {query.isError && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED }}>Failed to load project details.</div>
          )}

          {project && (
            <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
              {/* ── Project Header ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: TEXT, margin: 0 }}>
                      {project.name}
                    </h1>
                    <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 4, fontFamily: 'var(--font-mono, monospace)' }}>{projectId}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {project.status && (
                      <span style={{
                        padding: '4px 14px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                        background: project.status.toLowerCase().includes('active') ? '#2563eb' : SURFACE_2,
                        color: project.status.toLowerCase().includes('active') ? '#fff' : TEXT,
                      }}>
                        {project.status}
                      </span>
                    )}
                    {(project.pm || project.fde) && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: 8, fontSize: '0.78rem',
                        border: `1px solid ${BORDER}`, color: TEXT,
                      }}>
                        <User className="h-3.5 w-3.5" />
                        PM: {project.pm || '—'} · FDE: {project.fde || '—'}
                        <Pencil className="h-3 w-3" style={{ color: MUTED, cursor: 'pointer' }} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Charter Approved banner */}
                {project.charterStatus && project.charterStatus.toLowerCase().includes('approved') && (
                  <div style={{
                    marginTop: 12, padding: '10px 16px', borderRadius: 8,
                    background: '#22c55e15', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: SUCCESS }} />
                    <div>
                      <span style={{ fontWeight: 700, color: SUCCESS }}>Charter Approved</span>
                      <span style={{ fontSize: '0.8rem', color: MUTED, marginLeft: 8 }}>
                        Signed off by "{project.pm || 'PM'}" on {fmtDate(project.sourceLastUpdated)} — project is unlocked for the team.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── KPI Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                {/* Health */}
                <div className="sd-chart-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>Health</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: healthColor(project.overallHealth) }} />
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT }}>{project.overallHealth || '—'}</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="sd-chart-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>Progress</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>{progressPct}%</div>
                  <div style={{ height: 6, borderRadius: 3, background: BORDER, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 3, background: '#f59e0b', transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* Budget */}
                <div className="sd-chart-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>Budget</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>{project.budgetStatus || '—'}</div>
                  {project.valueRm != null && <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 2 }}>{fmtRm(project.valueRm)}</div>}
                </div>

                {/* Target End */}
                <div className="sd-chart-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>Target End</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>{fmtDate(project.targetEnd)}</div>
                </div>

                {/* Risks */}
                <div className="sd-chart-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED }}>Risks</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: project.risks.length > 0 ? DANGER : TEXT, marginTop: 4 }}>
                    {project.risks.length} open
                  </div>
                </div>
              </div>

              {/* ── Tabbed Panel ── */}
              <div className="sd-chart-card" style={{ padding: 0 }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: `1px solid ${BORDER}`, padding: '0 20px' }}>
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '12px 16px', fontSize: '0.82rem', fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer',
                        background: 'none', border: 'none',
                        color: activeTab === tab.id ? '#2563eb' : MUTED,
                        borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ padding: 20 }}>
                  {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* SMART Goals */}
                      {project.goals.length > 0 && (
                        <div>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>SMART Goals</h3>
                          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                              <thead>
                                <tr style={{ background: SURFACE_2 }}>
                                  {['ID', 'Goal', 'KPI', 'Measure', 'Deadline', 'Status'].map((h) => (
                                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: MUTED, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {project.goals.map((g, i) => (
                                  <tr key={g.id} style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : undefined }}>
                                    <td style={{ padding: '10px 12px', color: '#2563eb', fontWeight: 600, whiteSpace: 'nowrap' }}>{g.goalRef || g.id}</td>
                                    <td style={{ padding: '10px 12px', color: TEXT }}>{g.description || '—'}</td>
                                    <td style={{ padding: '10px 12px', color: MUTED }}>{g.kpi || '—'}</td>
                                    <td style={{ padding: '10px 12px', color: MUTED }}>{g.measure || '—'}</td>
                                    <td style={{ padding: '10px 12px', color: TEXT, whiteSpace: 'nowrap' }}>{fmtDate(g.deadline)}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a78bfa' }} title={g.status || ''} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Project Scope */}
                      {project.scope && (() => {
                        const { inScope, outScope } = parseScope(project.scope);
                        if (inScope.length === 0 && outScope.length === 0) return null;
                        return (
                          <div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>Project Scope</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: SUCCESS, marginBottom: 8 }}>In Scope</div>
                                {inScope.map((item, i) => (
                                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: TEXT, marginBottom: 6 }}>
                                    <span style={{ color: SUCCESS, flexShrink: 0 }}>•</span> {item}
                                  </div>
                                ))}
                                {inScope.length === 0 && <div style={{ fontSize: '0.8rem', color: MUTED }}>None specified</div>}
                              </div>
                              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: DANGER, marginBottom: 8 }}>Out of Scope</div>
                                {outScope.map((item, i) => (
                                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: TEXT, marginBottom: 6 }}>
                                    <span style={{ color: DANGER, flexShrink: 0 }}>•</span> {item}
                                  </div>
                                ))}
                                {outScope.length === 0 && <div style={{ fontSize: '0.8rem', color: MUTED }}>None specified</div>}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Definition of Done */}
                      {project.dodItems.length > 0 && (
                        <div>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>Definition of Done</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {project.dodItems.map((d) => (
                              <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: SURFACE_2 }}>
                                <div style={{
                                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                                  border: `2px solid ${d.passed ? SUCCESS : BORDER}`,
                                  background: d.passed ? SUCCESS : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {d.passed && <CheckCircle2 className="h-3 w-3" style={{ color: '#fff' }} />}
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.82rem', color: TEXT }}>{d.criteria || '—'}</div>
                                  {d.acceptance && <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 2 }}>Acceptance: {d.acceptance}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes / Decisions */}
                      {(project.decisions?.length ?? 0) > 0 && (
                        <div>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>Notes</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {project.decisions!.map((dec, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: TEXT }}>
                                <span style={{ color: MUTED, flexShrink: 0 }}>•</span>
                                <span>
                                  {dec.date && <span style={{ color: MUTED }}>{fmtDate(dec.date)} — </span>}
                                  {dec.decision || dec.rationale || '—'}
                                  {dec.madeBy && <span style={{ color: MUTED }}> ({dec.madeBy})</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'tasks' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, margin: 0 }}>Tasks ({project.tasks.length})</h3>
                        <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: '0.78rem' }}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      </div>
                      {project.tasks.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: MUTED }}>No tasks recorded.</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                                {[
                                  { label: 'ID', width: '60px' },
                                  { label: 'Title' },
                                  { label: 'Owner', width: '80px' },
                                  { label: 'Start', width: '90px' },
                                  { label: 'Deadline ▲', width: '100px' },
                                  { label: 'Priority', width: '90px' },
                                  { label: 'Status', width: '80px' },
                                  { label: 'Deps', width: '50px' },
                                  { label: '', width: '40px' },
                                ].map((col, i) => (
                                  <th key={i} style={{
                                    padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: MUTED,
                                    fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                    width: col.width, whiteSpace: 'nowrap',
                                  }}>{col.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {project.tasks.map((t, i) => {
                                const prioColor = (t.priority || '').toLowerCase().includes('critical') ? '#dc2626'
                                  : (t.priority || '').toLowerCase().includes('high') ? '#f59e0b'
                                  : (t.priority || '').toLowerCase().includes('medium') ? '#3b82f6'
                                  : null;
                                const statusLower = (t.status || '').toLowerCase();
                                const statusColor = statusLower.includes('done') || statusLower.includes('complete') ? SUCCESS
                                  : statusLower.includes('progress') ? '#f59e0b'
                                  : MUTED;
                                return (
                                  <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                                    <td style={{ padding: '10px', color: MUTED, fontSize: '0.75rem', fontFamily: 'var(--font-mono, monospace)' }}>{t.taskRef || t.id}</td>
                                    <td style={{ padding: '10px', color: TEXT, fontWeight: 500 }}>{t.title || '—'}</td>
                                    <td style={{ padding: '10px', color: TEXT }}>{t.owner || '—'}</td>
                                    <td style={{ padding: '10px', color: MUTED }}>{t.start ? fmtDate(t.start) : 'TBD'}</td>
                                    <td style={{ padding: '10px', color: MUTED }}>{t.deadline ? fmtDate(t.deadline) : 'TBD'}</td>
                                    <td style={{ padding: '10px' }}>
                                      {prioColor ? (
                                        <span style={{
                                          display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                                          fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                                          background: prioColor, color: '#fff',
                                        }}>{t.priority}</span>
                                      ) : (
                                        <span style={{ color: MUTED }}>{t.priority || '—'}</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                                        <span style={{ color: MUTED, fontSize: '0.78rem' }}>{t.status || '—'}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '10px', color: MUTED }}>{t.dependsOn?.length ? t.dependsOn.join(', ') : '–'}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>
                                      <Pencil className="h-3.5 w-3.5" style={{ color: MUTED, cursor: 'pointer' }} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'team' && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>Team ({project.teamMembers.length})</h3>
                      {project.teamMembers.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', color: MUTED }}>No team members assigned.</div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {project.teamMembers.map((m) => (
                            <span key={m.id} className="sd-chip muted">{m.name || 'Unknown'}{m.role ? ` — ${m.role}` : ''}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'budget' && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>Budget</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="sd-chart-card" style={{ padding: 16 }}>
                          <div style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase' }}>Value</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>{fmtRm(project.valueRm)}</div>
                        </div>
                        <div className="sd-chart-card" style={{ padding: 16 }}>
                          <div style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase' }}>Status</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>{project.budgetStatus || '—'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'gates' && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>Gate Status</h3>
                      <div style={{ fontSize: '0.82rem', color: TEXT }}>
                        Gate: {project.gate != null ? `G${project.gate}` : '—'}{project.gateStatus ? ` — ${project.gateStatus}` : ''}
                      </div>
                    </div>
                  )}

                  {activeTab === 'reports' && (
                    <div style={{ fontSize: '0.82rem', color: MUTED, textAlign: 'center', padding: '40px 0' }}>Reports coming soon</div>
                  )}

                  {activeTab === 'diagrams' && (
                    <div style={{ fontSize: '0.82rem', color: MUTED, textAlign: 'center', padding: '40px 0' }}>Diagrams coming soon</div>
                  )}

                  {activeTab === 'timeline' && (
                    <div style={{ fontSize: '0.82rem', color: MUTED, textAlign: 'center', padding: '40px 0' }}>Timeline coming soon</div>
                  )}

                  {activeTab === 'uat' && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>UAT</h3>
                      <div style={{ fontSize: '0.82rem', color: MUTED, textAlign: 'center', padding: '40px 0' }}>UAT test cases coming soon</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
