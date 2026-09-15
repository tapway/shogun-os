import { useState, useMemo } from 'react';
import { MOCK_PROJECTS, MOCK_ACTIVITIES, MOCK_DEV_METRICS, QUALITY_METRICS } from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';
const SURFACE_2 = 'var(--samurai-surface-2)';

interface Props {
  dept: string;
  color: string;
  onNavigateTab: (tab: string) => void;
}

// ── Stable heatmap generator seeded by project id — 365 days ──
function generateHeatmapData(seedStr: string) {
  const data: { date: string; count: number; dayOfWeek: number }[] = [];
  const base = new Date('2026-09-14');
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  for (let i = 364; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const v = ((d.getDate() * 7 + d.getMonth() * 13 + seed + i * 3) % 17);
    const count = isWeekend
      ? (v <= 2 ? 1 : v <= 5 ? v : v <= 9 ? v + 1 : v + 3)
      : (v <= 1 ? 2 : v <= 5 ? v + 3 : v <= 10 ? v + 5 : v + 8);
    data.push({ date: d.toISOString().slice(0, 10), count, dayOfWeek: d.getDay() });
  }
  return data;
}

export function CodingOverviewTab({ dept, color, onNavigateTab }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [heatmapHover, setHeatmapHover] = useState<{ date: string; count: number; x: number; y: number } | null>(null);
  const [heatmapMonthFilter, setHeatmapMonthFilter] = useState<string>('all'); // 'all' or 'YYYY-MM'

  // Project colors for multi-project radar view
  const projectColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const selectedProject = useMemo(() =>
    selectedProjectId === 'all' ? null : MOCK_PROJECTS.find(p => p.id === selectedProjectId) || null,
  [selectedProjectId]);

  // ── Filtered data based on selected project ──
  const filteredActivities = useMemo(() => {
    const acts = selectedProjectId === 'all'
      ? MOCK_ACTIVITIES
      : MOCK_ACTIVITIES.filter(a => a.projectId === selectedProjectId);
    return [...acts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedProjectId]);

  const filteredTeamMembers = useMemo(() => {
    if (!selectedProject) return Array.from(new Set(MOCK_PROJECTS.flatMap(p => p.team)));
    return selectedProject.team;
  }, [selectedProject]);

  const filteredWorkload = useMemo(() => {
    const members = filteredTeamMembers;
    return MOCK_DEV_METRICS
      .filter(d => members.includes(d.name))
      .map(d => ({ name: d.name, commits: d.commits, prs: d.prsOpened, reviews: d.prsReviewed, total: d.commits + d.prsOpened + d.prsReviewed }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTeamMembers]);

  const maxWorkload = useMemo(() => Math.max(...filteredWorkload.map(w => w.total), 1), [filteredWorkload]);

  const heatmapData = useMemo(() => generateHeatmapData(selectedProjectId), [selectedProjectId]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    if (selectedProject) {
      const projActivities = MOCK_ACTIVITIES.filter(a => a.projectId === selectedProject.id);
      return [
        { label: 'Progress', value: `${selectedProject.progress}%`, sub: `Target: ${selectedProject.targetDate || 'TBD'}`, c: selectedProject.progress >= 70 ? '#10b981' : selectedProject.progress >= 30 ? '#f59e0b' : '#ef4444' },
        { label: 'Team Size', value: selectedProject.team.length, sub: `Lead: ${selectedProject.lead}`, c: '#3b82f6' },
        { label: 'Status', value: selectedProject.status.toUpperCase(), sub: `Since ${selectedProject.startDate}`, c: selectedProject.status === 'active' ? '#10b981' : selectedProject.status === 'pending' ? '#f59e0b' : '#6b7280' },
        { label: 'Updates', value: projActivities.length, sub: 'Recent activity', c: '#8b5cf6' },
      ];
    }
    const active = MOCK_PROJECTS.filter(p => p.status === 'active');
    const avgProg = active.length > 0 ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length) : 0;
    return [
      { label: 'Active Projects', value: active.length, sub: `${MOCK_PROJECTS.filter(p => p.status === 'pending').length} pending`, c: '#10b981' },
      { label: 'Avg Progress', value: `${avgProg}%`, sub: `Across ${active.length} active`, c: color },
      { label: 'Team Members', value: Array.from(new Set(MOCK_PROJECTS.flatMap(p => p.team))).length, sub: `${MOCK_PROJECTS.length} projects`, c: '#3b82f6' },
      { label: 'Recent Updates', value: MOCK_ACTIVITIES.length, sub: 'Last 7 days', c: '#8b5cf6' },
    ];
  }, [selectedProject, color]);

  // ── Radar axes (project-specific or dept-wide) ──
  const radarAxes = useMemo(() => {
    const progress = selectedProject ? selectedProject.progress : (() => {
      const active = MOCK_PROJECTS.filter(p => p.status === 'active');
      return active.length > 0 ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length) : 0;
    })();
    // Vary quality metrics slightly per project using seed
    const seed = selectedProjectId === 'all' ? 0 : selectedProjectId.charCodeAt(selectedProjectId.length - 1);
    const vary = (base: number, range: number) => Math.min(100, Math.max(0, base + ((seed * 3) % range) - range / 2));
    return [
      { label: 'Progress', value: progress, max: 100 },
      { label: 'Coverage', value: vary(QUALITY_METRICS[0].value, 10), max: 100 },
      { label: 'Low Debt', value: vary(Math.max(0, 100 - (QUALITY_METRICS[4].value / QUALITY_METRICS[4].target) * 50), 15), max: 100 },
      { label: 'Low Smells', value: vary(Math.max(0, 100 - (QUALITY_METRICS[1].value / QUALITY_METRICS[1].target) * 50), 15), max: 100 },
      { label: 'PR Speed', value: vary(Math.max(0, 100 - (QUALITY_METRICS[5].value / QUALITY_METRICS[5].target) * 50), 15), max: 100 },
      { label: 'Security', value: vary(Math.max(0, 100 - QUALITY_METRICS[2].value * 20), 10), max: 100 },
    ];
  }, [selectedProject, selectedProjectId]);

  // ── Progress bars (project list or single project detail) ──
  const progressBars = useMemo(() => {
    if (selectedProject) {
      // Show sub-progress breakdown for single project (mock milestones)
      const milestones = [
        { name: 'Design & Planning', progress: Math.min(100, selectedProject.progress + 20) },
        { name: 'Core Development', progress: selectedProject.progress },
        { name: 'Testing & QA', progress: Math.max(0, selectedProject.progress - 15) },
        { name: 'Documentation', progress: Math.max(0, selectedProject.progress - 25) },
        { name: 'Deployment Prep', progress: Math.max(0, selectedProject.progress - 35) },
      ];
      return milestones;
    }
    return [...MOCK_PROJECTS].filter(p => p.status !== 'inactive').sort((a, b) => b.progress - a.progress).map(p => ({ name: p.name, progress: p.progress, lead: p.lead, teamSize: p.team.length, status: p.status }));
  }, [selectedProject]);

  const isSingleProject = selectedProject !== null;

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Project Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT }}>Project:</span>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          style={{ background: 'var(--samurai-surface-2)', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', minWidth: 220 }}
        >
          <option value="all">All Projects</option>
          {MOCK_PROJECTS.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
          ))}
        </select>
        {selectedProject && (
          <span className="sd-badge" style={{ background: `${selectedProject.status === 'active' ? '#10b981' : selectedProject.status === 'pending' ? '#f59e0b' : '#6b7280'}20`, color: selectedProject.status === 'active' ? '#10b981' : selectedProject.status === 'pending' ? '#f59e0b' : '#6b7280', borderColor: selectedProject.status === 'active' ? '#10b981' : selectedProject.status === 'pending' ? '#f59e0b' : '#6b7280' }}>
            {selectedProject.status.toUpperCase()}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} className="sd-card interactive" onClick={() => onNavigateTab('projects')} style={{ padding: '14px 16px', cursor: 'pointer' }}>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: kpi.c }}>{kpi.value}</div>
            <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 1: Progress + Team Workload */}
      <div className="sd-row">
        {/* Chart 1: Progress Comparison / Milestones */}
        <div className="sd-card" style={{ flex: '1 1 0', minWidth: 280, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{isSingleProject ? 'Milestone Progress' : 'Project Progress'}</span>
            {!isSingleProject && <button className="sd-btn sd-btn-ghost" style={{ fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => onNavigateTab('projects')}>Details →</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {progressBars.map((item: any) => {
              const barColor = item.progress >= 70 ? '#10b981' : item.progress >= 30 ? '#f59e0b' : '#ef4444';
              return (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{item.name}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: barColor }}>{item.progress}%</span>
                  </div>
                  <div style={{ height: 8, background: SURFACE_2, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, item.progress))}%`, background: barColor, borderRadius: 99, transition: 'width 600ms ease' }} />
                  </div>
                  {!isSingleProject && item.lead && (
                    <div style={{ fontSize: '0.62rem', color: MUTED, marginTop: 2 }}>{item.lead} · {item.teamSize} members · {item.status}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Dept Health Radar (moved from Row 2) */}
        <div className="sd-card" style={{ flex: '1 1 0', minWidth: 240, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{isSingleProject ? 'Project Health' : 'Dept Health'}</span>
            <span style={{ fontSize: '0.65rem', color: MUTED }}>6 dimensions</span>
          </div>
          <svg viewBox="0 0 220 200" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
            {(() => {
              const cx = 110, cy = 95, r = 70, n = radarAxes.length;
              const angleStep = (2 * Math.PI) / n, startAngle = -Math.PI / 2;
              
              const rings = [0.25, 0.5, 0.75, 1].map(frac => {
                const pts = Array.from({ length: n }, (_, i) => { const a = startAngle + i * angleStep; return `${cx + r * frac * Math.cos(a)},${cy + r * frac * Math.sin(a)}`; }).join(' ');
                return <polygon key={`ring-${frac}`} points={pts} fill="none" stroke={BORDER} strokeWidth={0.5} />;
              });
              
              const axes = radarAxes.map((axis, i) => {
                const a = startAngle + i * angleStep;
                return (
                  <g key={`axis-${i}`}>
                    <line x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke={BORDER} strokeWidth={0.5} />
                    <text x={cx + (r + 16) * Math.cos(a)} y={cy + (r + 16) * Math.sin(a) + 3} textAnchor="middle" fontSize={7} fill={MUTED} fontFamily="var(--font-body)">{axis.label}</text>
                  </g>
                );
              });
              
              const getProjectRadarData = (projId: string, projProgress: number) => {
                const seed = projId.charCodeAt(projId.length - 1);
                const vary = (base: number, range: number) => Math.min(100, Math.max(0, base + ((seed * 3) % range) - range / 2));
                return [
                  { label: 'Progress', value: projProgress, max: 100 },
                  { label: 'Coverage', value: vary(QUALITY_METRICS[0].value, 10), max: 100 },
                  { label: 'Low Debt', value: vary(Math.max(0, 100 - (QUALITY_METRICS[4].value / QUALITY_METRICS[4].target) * 50), 15), max: 100 },
                  { label: 'Low Smells', value: vary(Math.max(0, 100 - (QUALITY_METRICS[1].value / QUALITY_METRICS[1].target) * 50), 15), max: 100 },
                  { label: 'PR Speed', value: vary(Math.max(0, 100 - (QUALITY_METRICS[5].value / QUALITY_METRICS[5].target) * 50), 15), max: 100 },
                  { label: 'Security', value: vary(Math.max(0, 100 - QUALITY_METRICS[2].value * 20), 10), max: 100 },
                ];
              };
              
              if (!isSingleProject) {
                const activeProjects = MOCK_PROJECTS.filter(p => p.status === 'active');
                const polygons = activeProjects.map((proj, idx) => {
                  const projColor = projectColors[idx % projectColors.length];
                  const projData = getProjectRadarData(proj.id, proj.progress);
                  const dataPts = projData.map((axis, i) => { 
                    const a = startAngle + i * angleStep; 
                    const f = Math.min(1, Math.max(0, axis.value / axis.max)); 
                    return `${cx + r * f * Math.cos(a)},${cy + r * f * Math.sin(a)}`; 
                  }).join(' ');
                  return (
                    <g key={proj.id}>
                      <polygon points={dataPts} fill={projColor} fillOpacity={0.1} stroke={projColor} strokeWidth={1.5} />
                      {projData.map((axis, i) => {
                        const a = startAngle + i * angleStep;
                        const f = Math.min(1, Math.max(0, axis.value / axis.max));
                        return <circle key={`${proj.id}-dot-${i}`} cx={cx + r * f * Math.cos(a)} cy={cy + r * f * Math.sin(a)} r={2} fill={projColor} stroke="var(--samurai-surface)" strokeWidth={1} />;
                      })}
                    </g>
                  );
                });
                return <>{rings}{axes}{polygons}</>;
              } else {
                const dataPts = radarAxes.map((axis, i) => { const a = startAngle + i * angleStep; const f = Math.min(1, Math.max(0, axis.value / axis.max)); return `${cx + r * f * Math.cos(a)},${cy + r * f * Math.sin(a)}`; }).join(' ');
                const dots = radarAxes.map((axis, i) => {
                  const a = startAngle + i * angleStep;
                  const f = Math.min(1, Math.max(0, axis.value / axis.max));
                  const dx = cx + r * f * Math.cos(a);
                  const dy = cy + r * f * Math.sin(a);
                  return (
                    <g key={`dot-${i}`} style={{ cursor: 'pointer' }}>
                      <circle cx={dx} cy={dy} r={12} fill="transparent"
                        onMouseEnter={e => { const g = e.currentTarget.parentNode as SVGGElement; const vis = g.querySelector('.radar-vis') as SVGCircleElement; const tip = g.querySelector('.radar-tip') as SVGGElement; if (vis) vis.setAttribute('r', '6'); if (tip) tip.style.opacity = '1'; }}
                        onMouseLeave={e => { const g = e.currentTarget.parentNode as SVGGElement; const vis = g.querySelector('.radar-vis') as SVGCircleElement; const tip = g.querySelector('.radar-tip') as SVGGElement; if (vis) vis.setAttribute('r', '3.5'); if (tip) tip.style.opacity = '0'; }}
                      />
                      <circle className="radar-vis" cx={dx} cy={dy} r={3.5} fill={color} stroke="var(--samurai-surface)" strokeWidth={1.5} style={{ transition: 'r 150ms ease', pointerEvents: 'none' }} />
                      <g className="radar-tip" style={{ opacity: 0, transition: 'opacity 150ms', pointerEvents: 'none' }}>
                        <rect x={dx + 8} y={dy - 22} width={Math.max(70, axis.label.length * 7 + 40)} height={22} rx={4} fill="var(--samurai-surface-2)" stroke={BORDER} strokeWidth={1} />
                        <text x={dx + 14} y={dy - 8} fontSize={9} fontWeight={600} fill={TEXT} fontFamily="var(--font-body)">{axis.label}: {Math.round(axis.value)}</text>
                      </g>
                    </g>
                  );
                });
                return <>{rings}{axes}<polygon points={dataPts} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} />{dots}</>;
              }
            })()}
          </svg>
          {!isSingleProject && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8, fontSize: '0.6rem' }}>
              {MOCK_PROJECTS.filter(p => p.status === 'active').map((proj, idx) => (
                <span key={proj.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: projectColors[idx % projectColors.length] }} />
                  <span style={{ color: MUTED }}>{proj.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Activity Heatmap + Health Radar */}
      <div className="sd-row">
        {/* Chart 3: Activity Heatmap (GitHub-style) */}
        <div className="sd-card" style={{ flex: '2 1 0', minWidth: 300, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>Activity Heatmap</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={heatmapMonthFilter}
                onChange={e => setHeatmapMonthFilter(e.target.value)}
                style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT, fontSize: '0.65rem', padding: '2px 6px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Last 12 months</option>
                {(() => {
                  const opts: { val: string; label: string }[] = [];
                  const base = new Date('2026-09-14');
                  for (let i = 0; i < 12; i++) {
                    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    opts.push({ val, label });
                  }
                  return opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>);
                })()}
              </select>
            </div>
          </div>
          
          {/* Build GitHub-style heatmap grid */}
          {(() => {
            // Filter data by month if needed
            const filtered = heatmapMonthFilter === 'all'
              ? heatmapData
              : heatmapData.filter(d => d.date.startsWith(heatmapMonthFilter));
            
            if (filtered.length === 0) return <div style={{ padding: '2rem 0', textAlign: 'center', color: MUTED, fontSize: '0.75rem' }}>No activity data for selected period</div>;
            
            // Organize into weeks (columns), each column has 7 rows (Sun=0 to Sat=6)
            const cellSize = 11;
            const gap = 2;
            const step = cellSize + gap;
            const leftPad = 30; // space for day labels
            const topPad = 18;  // space for month labels
            
            // Group days into week columns
            // Find the first Sunday on or before the first data point
            const firstDate = new Date(filtered[0].date);
            const startDow = firstDate.getDay(); // 0=Sun
            // Pad back to previous Sunday
            const gridStart = new Date(firstDate);
            gridStart.setDate(gridStart.getDate() - startDow);
            
            // Build week columns
            const weeks: ({ date: string; count: number; dayOfWeek: number } | null)[][] = [];
            const lastDate = new Date(filtered[filtered.length - 1].date);
            const cur = new Date(gridStart);
            
            while (cur <= lastDate) {
              const week: ({ date: string; count: number; dayOfWeek: number } | null)[] = [];
              for (let dow = 0; dow < 7; dow++) {
                const dateStr = cur.toISOString().slice(0, 10);
                const match = filtered.find(d => d.date === dateStr);
                week.push(match || null);
                cur.setDate(cur.getDate() + 1);
              }
              weeks.push(week);
            }
            
            const numWeeks = weeks.length;
            const svgWidth = leftPad + numWeeks * step + 10;
            const svgHeight = topPad + 7 * step + 20;
            
            // Month label positions: find first column of each month
            const monthLabels: { label: string; x: number }[] = [];
            let lastMonth = -1;
            weeks.forEach((week, wi) => {
              for (const day of week) {
                if (day) {
                  const m = new Date(day.date).getMonth();
                  if (m !== lastMonth) {
                    monthLabels.push({
                      label: new Date(day.date).toLocaleDateString('en-US', { month: 'short' }),
                      x: leftPad + wi * step + step / 2,
                    });
                    lastMonth = m;
                  }
                  break;
                }
              }
            });
            
            // Total contributions
            const totalContributions = filtered.reduce((s, d) => s + d.count, 0);
            
            return (
              <>
                <div style={{ fontSize: '0.65rem', color: MUTED, marginBottom: 6 }}>
                  {totalContributions.toLocaleString()} activities{heatmapMonthFilter !== 'all' ? ` in ${new Date(heatmapMonthFilter + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ' in the last year'}
                </div>
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
                  {/* Day-of-week labels (left side, alternating: Mon/Wed/Fri) */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => {
                    if (i % 2 === 0 && i !== 0) return null; // Only show Mon(1), Wed(3), Fri(5)
                    return (
                      <text key={`dow-${i}`} x={leftPad - 4} y={topPad + i * step + cellSize - 1} fontSize={7} fill={MUTED} fontFamily="var(--font-body)" textAnchor="end">{label}</text>
                    );
                  })}
                  
                  {/* Month labels (top) */}
                  {monthLabels.map((ml, i) => (
                    <text key={`month-${i}`} x={ml.x} y={topPad - 5} fontSize={7} fill={MUTED} fontFamily="var(--font-body)" textAnchor="middle">{ml.label}</text>
                  ))}
                  
                  {/* Grid cells */}
                  {weeks.map((week, wi) => (
                    <g key={`week-${wi}`}>
                      {week.map((day, dow) => {
                        if (!day) return null;
                        const x = leftPad + wi * step;
                        const y = topPad + dow * step;
                        const intensity = day.count === 0 ? 0 : day.count <= 3 ? 0.25 : day.count <= 6 ? 0.5 : day.count <= 9 ? 0.75 : 1;
                        const isHovered = heatmapHover?.date === day.date;
                        return (
                          <rect
                            key={day.date}
                            x={x} y={y} width={cellSize} height={cellSize} rx={2}
                            fill={day.count === 0 ? SURFACE_2 : color}
                            opacity={day.count === 0 ? 0.15 : isHovered ? 1 : intensity}
                            stroke={isHovered ? TEXT : 'none'}
                            strokeWidth={isHovered ? 1.5 : 0}
                            style={{ cursor: 'pointer', transition: 'opacity 100ms ease' }}
                            onMouseEnter={() => setHeatmapHover({ date: day.date, count: day.count, x, y })}
                            onMouseLeave={() => setHeatmapHover(null)}
                          />
                        );
                      })}
                    </g>
                  ))}
                  
                  {/* Hover tooltip */}
                  {heatmapHover && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect
                        x={Math.min(heatmapHover.x + cellSize + 4, svgWidth - 140)} y={Math.max(heatmapHover.y - 10, 2)}
                        width={130} height={22} rx={4}
                        fill="var(--samurai-surface-2)" stroke={BORDER} strokeWidth={1}
                      />
                      <text
                        x={Math.min(heatmapHover.x + cellSize + 10, svgWidth - 134)} y={Math.max(heatmapHover.y - 10, 2) + 15}
                        fontSize={9} fontWeight={600} fill={TEXT} fontFamily="var(--font-body)"
                      >
                        {heatmapHover.date}: {heatmapHover.count} activities
                      </text>
                    </g>
                  )}
                </svg>
              </>
            );
          })()}
          
          {/* Legend */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6, fontSize: '0.6rem', color: MUTED, alignItems: 'center' }}>
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map(op => (
              <span key={op} style={{ width: 10, height: 10, borderRadius: 2, background: op === 0 ? SURFACE_2 : color, opacity: op === 0 ? 0.15 : op }} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Chart 4: Team Workload (moved from Row 1) */}
        <div className="sd-card" style={{ flex: '1 1 0', minWidth: 280, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>Team Workload</span>
            <span style={{ fontSize: '0.65rem', color: MUTED }}>{isSingleProject ? selectedProject!.name : 'All projects'}</span>
          </div>
          {filteredWorkload.length === 0 ? (
            <div className="sd-empty" style={{ padding: '2rem 0' }}>No team data available</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredWorkload.map(dev => (
                  <div key={dev.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 45, fontSize: '0.75rem', fontWeight: 600, color: TEXT, flexShrink: 0 }}>{dev.name}</span>
                    <div style={{ flex: 1, display: 'flex', height: 18, borderRadius: 99, background: SURFACE_2, position: 'relative' }}>
                      <div 
                        style={{ width: `${Math.max((dev.commits / maxWorkload) * 100, 2)}%`, background: color, transition: 'width 400ms ease', cursor: 'pointer', borderRadius: '99px 0 0 99px', position: 'relative' }}
                        title={`${dev.commits} commits`}
                        onMouseEnter={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = '1'; }}
                        onMouseLeave={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = '0'; }}
                      />
                      <div style={{ position: 'absolute', left: `${(dev.commits / maxWorkload) * 100}%`, top: '-28px', transform: 'translateX(-50%)', background: 'var(--samurai-surface-2)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '3px 8px', fontSize: '0.65rem', color: TEXT, whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 150ms', pointerEvents: 'none', zIndex: 20 }}>
                        {dev.commits} commits
                      </div>
                      <div 
                        style={{ width: `${Math.max((dev.prs / maxWorkload) * 100, 2)}%`, background: '#3b82f6', transition: 'width 400ms ease', cursor: 'pointer', position: 'relative' }}
                        title={`${dev.prs} PRs opened`}
                        onMouseEnter={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = '1'; }}
                        onMouseLeave={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = '0'; }}
                      />
                      <div style={{ position: 'absolute', left: `${((dev.commits + dev.prs) / maxWorkload) * 100}%`, top: '-28px', transform: 'translateX(-50%)', background: 'var(--samurai-surface-2)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '3px 8px', fontSize: '0.65rem', color: TEXT, whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 150ms', pointerEvents: 'none', zIndex: 20 }}>
                        {dev.prs} PRs
                      </div>
                      <div 
                        style={{ width: `${Math.max((dev.reviews / maxWorkload) * 100, 2)}%`, background: '#8b5cf6', transition: 'width 400ms ease', cursor: 'pointer', borderRadius: '0 99px 99px 0', position: 'relative' }}
                        title={`${dev.reviews} reviews`}
                        onMouseEnter={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = '1'; }}
                        onMouseLeave={e => { const tip = e.currentTarget.nextElementSibling as HTMLElement; if (tip) tip.style.opacity = '0'; }}
                      />
                      <div style={{ position: 'absolute', right: '0', top: '-28px', transform: 'translateX(50%)', background: 'var(--samurai-surface-2)', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '3px 8px', fontSize: '0.65rem', color: TEXT, whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 150ms', pointerEvents: 'none', zIndex: 20 }}>
                        {dev.reviews} reviews
                      </div>
                    </div>
                    <span style={{ width: 28, fontSize: '0.68rem', color: MUTED, textAlign: 'right', flexShrink: 0 }}>{dev.total}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10, fontSize: '0.65rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: color }} /> Commits</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#3b82f6' }} /> PRs</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#8b5cf6' }} /> Reviews</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="sd-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{isSingleProject ? `Activity — ${selectedProject!.name}` : 'Recent Activity Across Projects'}</span>
          <button className="sd-btn sd-btn-ghost" style={{ fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => onNavigateTab('projects')}>All Activity →</button>
        </div>
        {filteredActivities.length === 0 ? (
          <div className="sd-empty" style={{ padding: '2rem 0' }}>No activity found</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {filteredActivities.slice(0, 6).map(activity => {
              const project = MOCK_PROJECTS.find(p => p.id === activity.projectId);
              const TYPE_ICONS: Record<string, string> = { commit: '🔵', push: '📤', pr: '🔀', deploy: '🚀', comment: '💬', doc: '📄' };
              return (
                <div key={activity.id} className="interactive" onClick={() => onNavigateTab('projects')}
                  style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = SURFACE_2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: '1rem', flexShrink: 0 }}>{TYPE_ICONS[activity.type] || '📋'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.title}</div>
                    <div style={{ fontSize: '0.68rem', color: MUTED, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.summary}</div>
                    <div style={{ fontSize: '0.62rem', color: MUTED, marginTop: 3 }}>
                      {activity.author} · {project?.name || activity.projectId} · {new Date(activity.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
