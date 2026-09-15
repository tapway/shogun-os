import { useState, useMemo } from 'react';
import {
  MOCK_PROJECTS, MOCK_ACTIVITIES, MOCK_TASKS, MOCK_PRS, MOCK_RELEASES,
  QUALITY_METRICS, MOCK_DEV_METRICS, CURRENT_SPRINT,
  type ProjectItem, type ActivityUpdate, type TaskItem, type PrItem,
} from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const SURFACE_2 = 'var(--samurai-surface-2)';

interface Props {
  dept: string;
  color: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981', pending: '#f59e0b', inactive: '#6b7280',
};

const TYPE_ICONS: Record<string, string> = {
  commit: '🔵', push: '📤', pr: '🔀', deploy: '🚀', comment: '💬', doc: '📄',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280',
};

const CI_COLORS: Record<string, string> = {
  passing: '#10b981', failing: '#ef4444', pending: '#f59e0b', skipped: '#6b7280',
};

const PR_STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6', approved: '#10b981', changes_requested: '#f59e0b', merged: '#6b7280', draft: '#9ca3af',
};

type DetailSection = 'activity' | 'tasks' | 'prs' | 'quality' | 'releases' | 'team';

export function ProjectsTab({ dept, color }: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [detailSection, setDetailSection] = useState<DetailSection>('activity');

  // ── Filtered project list ──
  const filteredProjects = useMemo(() => {
    if (statusFilter === 'all') return MOCK_PROJECTS;
    return MOCK_PROJECTS.filter(p => p.status === statusFilter);
  }, [statusFilter]);

  const stats = useMemo(() => ({
    active: MOCK_PROJECTS.filter(p => p.status === 'active').length,
    pending: MOCK_PROJECTS.filter(p => p.status === 'pending').length,
    inactive: MOCK_PROJECTS.filter(p => p.status === 'inactive').length,
  }), []);

  // ── Per-project data lookups ──
  const projectActivities = useMemo(() => {
    if (!selectedProject) return [];
    return MOCK_ACTIVITIES.filter(a => a.projectId === selectedProject.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedProject]);

  // Map tasks to projects by matching labels/sprint context
  const projectTasks = useMemo((): TaskItem[] => {
    if (!selectedProject) return [];
    const techLower = selectedProject.techStack.map(t => t.toLowerCase());
    const nameLower = selectedProject.name.toLowerCase();
    return MOCK_TASKS.filter(t => {
      const labelMatch = t.labels.some(l => techLower.some(tl => l.toLowerCase().includes(tl)) || nameLower.includes(l.toLowerCase()));
      const assigneeMatch = selectedProject.team.includes(t.assignee);
      return labelMatch || assigneeMatch;
    });
  }, [selectedProject]);

  // Map PRs to projects by branch/label relevance
  const projectPrs = useMemo((): PrItem[] => {
    if (!selectedProject) return [];
    const techLower = selectedProject.techStack.map(t => t.toLowerCase());
    const nameLower = selectedProject.name.toLowerCase();
    return MOCK_PRS.filter(pr => {
      const labelMatch = pr.labels.some(l => techLower.some(tl => l.toLowerCase().includes(tl)) || nameLower.includes(l.toLowerCase()));
      const branchMatch = pr.branch.toLowerCase().includes(nameLower.split(' ')[0].toLowerCase());
      return labelMatch || branchMatch;
    });
  }, [selectedProject]);

  // Map releases to projects
  const projectReleases = useMemo(() => {
    if (!selectedProject) return [];
    return MOCK_RELEASES.filter(r => r.deployedBy && selectedProject.team.includes(r.deployedBy));
  }, [selectedProject]);

  // ── PROJECT LIST VIEW ──
  if (!selectedProject) {
    return (
      <div className="sd-stack" style={{ gap: 16 }}>
        {/* Stats + Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Active', value: stats.active, c: '#10b981' },
              { label: 'Pending', value: stats.pending, c: '#f59e0b' },
              { label: 'Inactive', value: stats.inactive, c: '#6b7280' },
            ].map(s => (
              <div key={s.label} className="sd-stat" style={{ padding: '10px 16px' }}>
                <div style={{ fontSize: '0.65rem', color: MUTED }}>{s.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.c }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'active', 'pending', 'inactive'] as const).map(s => (
              <button
                key={s}
                className={`sd-btn ${statusFilter === s ? 'sd-btn-primary' : 'sd-btn-secondary'}`}
                onClick={() => setStatusFilter(s)}
                style={{ fontSize: '0.8rem', padding: '6px 12px', backgroundColor: statusFilter === s ? color : undefined }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {s !== 'all' && <span style={{ marginLeft: 6, opacity: 0.7 }}>({MOCK_PROJECTS.filter(p => p.status === s).length})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Project Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className="sd-card interactive"
              onClick={() => { setSelectedProject(project); setDetailSection('activity'); }}
              style={{ padding: '16px 18px', cursor: 'pointer', border: `1px solid ${BORDER}`, transition: 'border-color 150ms ease, transform 150ms ease' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, margin: 0, flex: 1 }}>{project.name}</h3>
                <span className="sd-badge" style={{ background: `${STATUS_COLORS[project.status]}20`, color: STATUS_COLORS[project.status], borderColor: STATUS_COLORS[project.status], fontSize: '0.65rem', padding: '2px 6px', flexShrink: 0, marginLeft: 8 }}>
                  {project.status.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: MUTED, lineHeight: 1.4, marginBottom: 12, minHeight: '2.8rem' }}>{project.description}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${MUTED})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
                  {project.lead.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: MUTED }}>Lead</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT }}>{project.lead}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: MUTED }}>Team</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT }}>{project.team.length} members</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: MUTED }}>Progress</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: TEXT }}>{project.progress}%</span>
                </div>
                <div style={{ height: 6, background: SURFACE_2, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? '#10b981' : project.progress > 50 ? color : '#f59e0b', borderRadius: 99, transition: 'width 600ms ease' }} />
                </div>
              </div>

              {/* Tech Stack */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {project.techStack.slice(0, 4).map(tech => (
                  <span key={tech} className="sd-badge" style={{ background: SURFACE_2, color: MUTED, borderColor: BORDER, fontSize: '0.65rem', padding: '2px 6px' }}>{tech}</span>
                ))}
                {project.techStack.length > 4 && (
                  <span className="sd-badge" style={{ background: SURFACE_2, color: MUTED, borderColor: BORDER, fontSize: '0.65rem', padding: '2px 6px' }}>+{project.techStack.length - 4}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="sd-empty" style={{ padding: '3rem 0' }}>No projects found with status "{statusFilter}"</div>
        )}
      </div>
    );
  }

  // ── PROJECT DETAIL VIEW ──
  const sections: { id: DetailSection; label: string; icon: string; count?: number }[] = [
    { id: 'activity', label: 'Activity Feed', icon: '📋', count: projectActivities.length },
    { id: 'tasks', label: 'Tasks', icon: '✅', count: projectTasks.length },
    { id: 'prs', label: 'Pull Requests', icon: '🔀', count: projectPrs.length },
    { id: 'quality', label: 'Code Quality', icon: '🛡️' },
    { id: 'releases', label: 'Releases', icon: '🚀', count: projectReleases.length },
    { id: 'team', label: 'Team', icon: '👥', count: selectedProject.team.length },
  ];

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="sd-btn sd-btn-ghost" onClick={() => setSelectedProject(null)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>← Back</button>
        <span style={{ fontSize: '0.7rem', color: MUTED }}>|</span>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: TEXT, margin: 0 }}>{selectedProject.name}</h2>
        <span className="sd-badge" style={{ background: `${STATUS_COLORS[selectedProject.status]}20`, color: STATUS_COLORS[selectedProject.status], borderColor: STATUS_COLORS[selectedProject.status] }}>
          {selectedProject.status.toUpperCase()}
        </span>
      </div>

      {/* Project Summary Card */}
      <div className="sd-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <div><div style={{ fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Lead</div><div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{selectedProject.lead}</div></div>
          <div><div style={{ fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Team</div><div style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>{selectedProject.team.join(', ')}</div></div>
          <div><div style={{ fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Progress</div><div style={{ fontSize: '0.9rem', fontWeight: 700, color }}>{selectedProject.progress}%</div></div>
          <div><div style={{ fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Target</div><div style={{ fontSize: '0.9rem', color: TEXT }}>{selectedProject.targetDate || 'TBD'}</div></div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: '0.7rem', color: MUTED, marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: '0.85rem', color: TEXT, lineHeight: 1.5 }}>{selectedProject.description}</div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: MUTED, marginRight: 4 }}>Tech:</span>
          {selectedProject.techStack.map(tech => (
            <span key={tech} className="sd-badge" style={{ background: SURFACE_2, color: TEXT, borderColor: BORDER, fontSize: '0.72rem' }}>{tech}</span>
          ))}
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {sections.map(sec => (
          <button
            key={sec.id}
            onClick={() => setDetailSection(sec.id)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: '0.78rem', cursor: 'pointer',
              border: `1px solid ${detailSection === sec.id ? color : BORDER}`,
              background: detailSection === sec.id ? `${color}18` : 'transparent',
              color: detailSection === sec.id ? color : MUTED,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>{sec.icon}</span>
            {sec.label}
            {sec.count !== undefined && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({sec.count})</span>}
          </button>
        ))}
      </div>

      {/* ── ACTIVITY FEED ── */}
      {detailSection === 'activity' && (
        <div className="sd-card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, margin: '0 0 14px' }}>Recent Team Activity</h3>
          {projectActivities.length === 0 ? (
            <div className="sd-empty" style={{ padding: '2rem 0' }}>No recent activity for this project</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projectActivities.map(activity => (
                <div key={activity.id} className="interactive" style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, transition: 'background 150ms ease, border-color 150ms ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = SURFACE_2; e.currentTarget.style.borderColor = color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = BORDER; }}
                >
                  <div style={{ fontSize: '1.1rem', flexShrink: 0 }}>{TYPE_ICONS[activity.type]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: TEXT }}>{activity.title}</span>
                      <span className="sd-badge" style={{ fontSize: '0.62rem', padding: '2px 6px', background: SURFACE_2, color: MUTED }}>{activity.type.toUpperCase()}</span>
                      {activity.branch && <span style={{ fontSize: '0.65rem', color: MUTED, fontFamily: 'monospace' }}>{activity.branch}</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: TEXT, lineHeight: 1.4, marginBottom: 4 }}>{activity.summary}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.65rem', color: MUTED }}>
                      <span>{activity.author}</span>
                      <span>·</span>
                      <span>{new Date(activity.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {(activity.filesChanged ?? 0) > 0 && (
                        <>
                          <span>·</span>
                          <span>{activity.filesChanged} files</span>
                          {(activity.additions ?? 0) > 0 && <span style={{ color: '#10b981' }}>+{activity.additions}</span>}
                          {(activity.deletions ?? 0) > 0 && <span style={{ color: '#ef4444' }}>−{activity.deletions}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TASKS ── */}
      {detailSection === 'tasks' && (
        <div className="sd-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['ID', 'Task', 'Assignee', 'Priority', 'Status', 'Points'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: MUTED, fontWeight: 600, fontSize: '0.7rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectTasks.map(task => (
                <tr key={task.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: MUTED }}>{task.id}</td>
                  <td style={{ padding: '10px 12px', color: TEXT }}>{task.title}</td>
                  <td style={{ padding: '10px 12px', color: MUTED }}>{task.assignee}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: PRIORITY_COLORS[task.priority] }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS[task.priority] }} />
                      {task.priority}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="sd-badge" style={{ fontSize: '0.65rem', background: SURFACE_2, color: TEXT }}>{task.status.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color }}>{task.points}pt</td>
                </tr>
              ))}
            </tbody>
          </table>
          {projectTasks.length === 0 && <div className="sd-empty" style={{ padding: '2rem' }}>No tasks linked to this project</div>}
        </div>
      )}

      {/* ── PULL REQUESTS ── */}
      {detailSection === 'prs' && (
        <div className="sd-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {['PR', 'Title', 'Author', 'CI', 'Status', '+/-'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: MUTED, fontWeight: 600, fontSize: '0.7rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectPrs.map(pr => (
                <tr key={pr.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: MUTED }}>#{pr.id}</td>
                  <td style={{ padding: '10px 12px', color: TEXT, maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.title}</td>
                  <td style={{ padding: '10px 12px', color: MUTED }}>{pr.author}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: CI_COLORS[pr.ciStatus] }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: CI_COLORS[pr.ciStatus] }} />
                      {pr.ciStatus}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, background: `${PR_STATUS_COLORS[pr.status]}20`, color: PR_STATUS_COLORS[pr.status], fontWeight: 600 }}>
                      {pr.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    <span style={{ color: '#10b981' }}>+{pr.additions}</span> <span style={{ color: '#ef4444' }}>-{pr.deletions}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projectPrs.length === 0 && <div className="sd-empty" style={{ padding: '2rem' }}>No pull requests linked to this project</div>}
        </div>
      )}

      {/* ── CODE QUALITY ── */}
      {detailSection === 'quality' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
          {QUALITY_METRICS.map(m => {
            const goodUp = ['Test Coverage', 'Duplication'];
            const atTarget = goodUp.includes(m.label) ? m.value >= m.target : m.value <= m.target;
            const pct = Math.min(100, Math.round((m.value / m.target) * 100));
            return (
              <div key={m.label} className="sd-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: MUTED }}>{m.label}</span>
                  <span style={{ fontSize: '0.72rem', color: m.trend === 'up' ? (goodUp.includes(m.label) ? '#10b981' : '#ef4444') : m.trend === 'down' ? (goodUp.includes(m.label) ? '#ef4444' : '#10b981') : MUTED, fontWeight: 600 }}>
                    {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: TEXT }}>{m.value}{m.unit}</div>
                <div style={{ fontSize: '0.65rem', color: atTarget ? '#10b981' : '#f59e0b', marginTop: 4 }}>Target: {m.target}{m.unit} {atTarget ? '✓' : '⚠'}</div>
                <div style={{ height: 3, background: SURFACE_2, borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: atTarget ? '#10b981' : '#f59e0b', transition: 'width 400ms ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RELEASES ── */}
      {detailSection === 'releases' && (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: BORDER, borderRadius: 99 }} />
          {projectReleases.length === 0 ? (
            <div className="sd-empty" style={{ padding: '2rem 0' }}>No releases linked to this project</div>
          ) : projectReleases.map((release, idx) => (
            <div key={`${release.version}-${idx}`} className="sd-card" style={{ marginBottom: 10, padding: '12px 16px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: -19, top: 16, width: 12, height: 12, borderRadius: '50%', background: release.status === 'deployed' ? '#10b981' : release.status === 'failed' ? '#ef4444' : '#f59e0b', border: '2px solid var(--samurai-bg)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace', color: TEXT }}>{release.version}</span>
                <span className="sd-badge" style={{ fontSize: '0.62rem', background: release.environment === 'production' ? '#3b82f620' : '#f59e0b20', color: release.environment === 'production' ? '#3b82f6' : '#f59e0b' }}>{release.environment}</span>
                <span className="sd-badge" style={{ fontSize: '0.62rem', background: `${release.status === 'deployed' ? '#10b981' : '#f59e0b'}20`, color: release.status === 'deployed' ? '#10b981' : '#f59e0b' }}>{release.status}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: MUTED }}>{release.date} · {release.deployedBy} · {release.prCount} PRs</div>
            </div>
          ))}
        </div>
      )}

      {/* ── TEAM ── */}
      {detailSection === 'team' && (
        <div className="sd-stack" style={{ gap: 14 }}>
          {/* Team Members */}
          <div className="sd-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, margin: '0 0 14px' }}>Project Team</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {selectedProject.team.map(member => {
                const metrics = MOCK_DEV_METRICS.find(d => d.name === member);
                return (
                  <div key={member} className="sd-card" style={{ padding: '14px 16px', minWidth: 180, flex: '1 1 180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${MUTED})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 700 }}>
                        {member.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: TEXT }}>{member}</div>
                        <div style={{ fontSize: '0.65rem', color: MUTED }}>{member === selectedProject.lead ? 'Project Lead' : 'Contributor'}</div>
                      </div>
                    </div>
                    {metrics && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.72rem' }}>
                        <div><span style={{ color: MUTED }}>Commits:</span> <span style={{ color: TEXT, fontWeight: 600 }}>{metrics.commits}</span></div>
                        <div><span style={{ color: MUTED }}>PRs:</span> <span style={{ color: TEXT, fontWeight: 600 }}>{metrics.prsOpened}</span></div>
                        <div><span style={{ color: MUTED }}>Reviews:</span> <span style={{ color: TEXT, fontWeight: 600 }}>{metrics.prsReviewed}</span></div>
                        <div><span style={{ color: MUTED }}>Cov Δ:</span> <span style={{ color: metrics.coverageDelta >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{metrics.coverageDelta > 0 ? '+' : ''}{metrics.coverageDelta}%</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sprint Context */}
          <div className="sd-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT, margin: '0 0 10px' }}>Current Sprint</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, fontSize: '0.8rem' }}>
              <div><span style={{ color: MUTED }}>Sprint:</span> <span style={{ color: TEXT, fontWeight: 600 }}>{CURRENT_SPRINT.name}</span></div>
              <div><span style={{ color: MUTED }}>Progress:</span> <span style={{ color: TEXT, fontWeight: 600 }}>{Math.round((CURRENT_SPRINT.completedPoints / CURRENT_SPRINT.totalPoints) * 100)}%</span></div>
              <div><span style={{ color: MUTED }}>Days Left:</span> <span style={{ color: TEXT, fontWeight: 600 }}>{CURRENT_SPRINT.totalDays - CURRENT_SPRINT.daysElapsed}</span></div>
              <div><span style={{ color: MUTED }}>End Date:</span> <span style={{ color: TEXT, fontWeight: 600 }}>{CURRENT_SPRINT.endDate}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
