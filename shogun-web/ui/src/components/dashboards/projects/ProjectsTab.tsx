import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '../../../lib/api';

interface Props {
  dept: string;
  color: string;
  onOpenProject: (projectId: string) => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE = 'var(--samurai-surface)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const NAVY = '#1e3a5f';
const GREEN = '#10b981';
const ORANGE = '#f59e0b';
const RED = '#ef4444';
const BLUE = '#3b82f6';

function healthDotColor(health?: string): string {
  const h = (health || '').toLowerCase();
  if (h.includes('track') || h.includes('done') || h.includes('complete') || h.includes('commission')) return GREEN;
  if (h.includes('risk') || h.includes('hold')) return ORANGE;
  if (h.includes('block') || h.includes('cancel')) return RED;
  return BLUE;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRm(value?: number | null): string {
  if (value == null || value === 0) return 'TBD';
  return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProjectsTab({ dept, color, onOpenProject }: Props) {
  const [tab, setTab] = useState<'all' | 'active'>('all');
  const [search, setSearch] = useState('');
  const [pmFilter, setPmFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [sortBy, setSortBy] = useState('dateRegistered');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedPm, setAppliedPm] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedHealth, setAppliedHealth] = useState('');
  const [appliedSort, setAppliedSort] = useState('dateRegistered');

  const query = useQuery({
    queryKey: ['projects-list', dept],
    queryFn: () => departmentsApi.projectsList(dept),
    refetchInterval: 120_000,
  });

  const allProjects = query.data?.projects ?? [];

  const pms = useMemo(() => {
    const set = new Set(allProjects.map((p) => p.pm).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allProjects]);

  const statuses = useMemo(() => {
    const set = new Set(allProjects.map((p) => p.status).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allProjects]);

  const healths = useMemo(() => {
    const set = new Set(allProjects.map((p) => p.overallHealth).filter(Boolean) as string[]);
    return [...set].sort();
  }, [allProjects]);

  const filtered = useMemo(() => {
    let list = allProjects;
    if (tab === 'active') list = list.filter(p => (p.status || '').toLowerCase().includes('active'));
    const q = appliedSearch.trim().toLowerCase();
    if (q) list = list.filter(p => `${p.id} ${p.name} ${p.client ?? ''}`.toLowerCase().includes(q));
    if (appliedPm) list = list.filter(p => p.pm === appliedPm);
    if (appliedStatus) list = list.filter(p => p.status === appliedStatus);
    if (appliedHealth) list = list.filter(p => p.overallHealth === appliedHealth);

    // Sort
    list = [...list].sort((a, b) => {
      if (appliedSort === 'dateRegistered') {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return db - da; // Latest first
      }
      if (appliedSort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (appliedSort === 'value') return (b.valueRm ?? 0) - (a.valueRm ?? 0);
      return 0;
    });

    return list;
  }, [allProjects, tab, appliedSearch, appliedPm, appliedStatus, appliedHealth, appliedSort]);

  function handleApply() {
    setAppliedSearch(search);
    setAppliedPm(pmFilter);
    setAppliedStatus(statusFilter);
    setAppliedHealth(healthFilter);
    setAppliedSort(sortBy);
  }

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading projects…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="sd-empty">
        <h2>No project data available</h2>
        <p>Check mock data configuration.</p>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.8rem',
    minWidth: '140px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <div className="sd-stack">
      {/* Page heading */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: TEXT, margin: 0 }}>All Projects</h2>
        <p style={{ fontSize: '0.78rem', color: MUTED, margin: '4px 0 0' }}>{filtered.length} of {allProjects.length} projects</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
        <button
          onClick={() => setTab('all')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: tab === 'all' ? '#fff' : 'transparent',
            color: tab === 'all' ? NAVY : MUTED,
            boxShadow: tab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          All
        </button>
        <button
          onClick={() => setTab('active')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: tab === 'active' ? '#fff' : 'transparent',
            color: tab === 'active' ? NAVY : MUTED,
            boxShadow: tab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Active
        </button>
      </div>

      {/* Filter panel */}
      <div className="sd-chart-card" style={{ padding: '16px 20px' }}>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label style={labelStyle}>Search</label>
            <input
              type="text"
              placeholder="Name, ID, client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...selectStyle, minWidth: '200px' }}
            />
          </div>
          <div>
            <label style={labelStyle}>PM</label>
            <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)} style={selectStyle}>
              <option value="">All PMs</option>
              {pms.map((pm) => <option key={pm} value={pm}>{pm}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">All Status</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Health</label>
            <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)} style={selectStyle}>
              <option value="">All Health</option>
              {healths.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
              <option value="dateRegistered">Date Registered</option>
              <option value="name">Name</option>
              <option value="value">Value</option>
            </select>
          </div>
          <button
            onClick={handleApply}
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: NAVY,
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Project cards grid */}
      {filtered.length === 0 ? (
        <div className="sd-empty" style={{ padding: '32px 0' }}>
          <p>No projects match the current filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((project) => {
            const dotColor = healthDotColor(project.overallHealth || project.status);
            const progress = project.tasks && project.tasks.length > 0
              ? Math.round((project.tasks.filter(t => t.status === 'done').length / project.tasks.length) * 100)
              : 0;
            const gateLabel = project.gate != null ? `G${project.gate}: ${project.gateStatus || ''}` : null;
            return (
              <div
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                className="sd-chart-card"
                style={{ cursor: 'pointer', padding: '18px', position: 'relative' }}
              >
                {/* Health dot */}
                <span style={{
                  position: 'absolute', top: '16px', right: '16px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: dotColor, display: 'inline-block',
                }} />

                {/* Title */}
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: TEXT, margin: '0 0 6px', paddingRight: '20px' }}>
                  {project.name}
                </h4>

                {/* ID + badges */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: MUTED }}>{project.id}</span>
                  {project.status && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 600, padding: '2px 10px', borderRadius: '10px',
                      background: (project.status || '').toLowerCase().includes('active') ? BLUE : NAVY,
                      color: '#fff',
                    }}>
                      {project.status}
                    </span>
                  )}
                  {gateLabel && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 600, padding: '2px 10px', borderRadius: '10px',
                      background: RED, color: '#fff',
                    }}>
                      {gateLabel}
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div style={{ fontSize: '0.75rem', color: MUTED, display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
                  <div><strong style={{ color: TEXT }}>PM:</strong> {project.pm || '—'}</div>
                </div>

                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: MUTED }}>Progress</span>
                  <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: SURFACE_2 }}>
                    <div style={{ width: `${progress}%`, height: '100%', borderRadius: '3px', background: ORANGE }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: ORANGE }}>{progress}%</span>
                </div>

                {/* Dates */}
                <div style={{ fontSize: '0.72rem', color: MUTED, display: 'flex', gap: '16px', marginBottom: '6px' }}>
                  <span><strong style={{ color: TEXT }}>Start:</strong> {fmtDate(project.startDate)}</span>
                  <span><strong style={{ color: TEXT }}>End:</strong> {fmtDate(project.targetEnd)}</span>
                </div>

                {/* Client + Value */}
                <div style={{ fontSize: '0.72rem', color: MUTED }}>
                  <div><strong style={{ color: TEXT }}>Client:</strong> {project.client || '—'}</div>
                  <div><strong style={{ color: TEXT }}>Value:</strong> {fmtRm(project.valueRm)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
