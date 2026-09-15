import { useState, useMemo } from 'react';
import { FileBarChart, ClipboardList, ListChecks, GitCompareArrows, Search, Filter, X, ChevronRight, CheckCircle2, AlertTriangle, Clock, Plus, Building2 } from 'lucide-react';
import { DashboardSubNav } from '../DashboardSubNav';
import { BarChart } from '../charts';
import type { DashboardTab, FacilityStats, FacilityInspection } from '../../../lib/types';
import { FacilityInspectionReview } from './FacilityInspectionReview';
import { MOCK_INSPECTIONS, MOCK_ACTION_ITEMS, MOCK_LOCATIONS } from '../../../lib/facilityMockData';

interface Props {
  stats: FacilityStats;
  color: string;
  department: string;
  onChanged: () => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const DANGER = 'var(--samurai-danger)';
const OK = 'var(--samurai-ok)';
const WARNING = 'var(--samurai-warning)';

const REPORT_TABS: DashboardTab[] = [
  { id: 'history', label: 'Inspection History', icon: 'ClipboardList' },
  { id: 'actions', label: 'Action Items', icon: 'ListChecks' },
  { id: 'compare', label: 'Compare', icon: 'GitCompareArrows' },
];

export function FacilityReportsTab({ stats, color, department, onChanged }: Props) {
  const [inspections] = useState(MOCK_INSPECTIONS);
  const [actionItems, setActionItems] = useState(MOCK_ACTION_ITEMS);
  const [locations] = useState(MOCK_LOCATIONS);
  const [subTab, setSubTab] = useState('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailInspection, setDetailInspection] = useState<FacilityInspection | null>(null);
  const [compareLocations, setCompareLocations] = useState<string[]>([]);
  const [showAddAction, setShowAddAction] = useState(false);
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionPriority, setNewActionPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [selectedLocationForCalendar, setSelectedLocationForCalendar] = useState<number | null>(null);
  const [selectedDayForDetail, setSelectedDayForDetail] = useState<{ day: number; month: number; year: number; inspections: typeof MOCK_INSPECTIONS } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // ── Inspection History ──
  const filteredInspections = useMemo(() => {
    const all = inspections || [];
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter((i) =>
      String(i.location_id).toLowerCase().includes(q) ||
      (i.inspected_by || '').toLowerCase().includes(q)
    );
  }, [inspections, searchQuery]);

  // ── Action Items (filtered to demo locations) ──
  const DEMO_LOCATION_IDS = [1, 2, 4, 6];
  const allActions = useMemo(() => {
    return (actionItems || []).filter(a => DEMO_LOCATION_IDS.includes(a.location_id));
  }, [actionItems]);

  const actionsByPriority = useMemo(() => {
    const groups: Record<string, typeof allActions> = { urgent: [], high: [], medium: [], low: [] };
    for (const a of allActions) {
      if (a.priority) groups[a.priority]?.push(a);
    }
    return groups;
  }, [allActions]);

  async function updateActionStatus(actionId: number, newStatus: string) {
    setActionItems((prev) => prev.map(a => a.id === actionId ? { ...a, status: newStatus as any } : a));
  }

  function addActionItem() {
    if (!newActionDesc.trim()) return;
    const newItem = {
      id: Date.now(),
      tenant_id: 1,
      location_id: 1,
      priority: newActionPriority,
      category: 'general',
      description: newActionDesc.trim(),
      status: 'open' as const,
      assigned_to: null,
      created_at: new Date().toISOString(),
    };
    setActionItems((prev) => [newItem, ...prev]);
    setNewActionDesc('');
  }

  // ── Compare data ──
  const compareData = useMemo(() => {
    if (compareLocations.length < 2) return [];
    return locations
      .filter((l) => compareLocations.includes(String(l.id)))
      .map((l) => ({ name: l.name, score: Math.round(l.last_overall_score || 0), actions: 0 }));
  }, [compareLocations, locations]);

  function toggleCompareLocation(id: string) {
    setCompareLocations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  }

  return (
    <div className="sd-stack">
      <DashboardSubNav tabs={REPORT_TABS} active={subTab} onChange={setSubTab} compact />

      {/* ── Inspection History ── */}
      {subTab === 'history' && (
        <div className="sd-stack">
          {/* Search */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 250px' }}>
              <Search className="h-4 w-4" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
              <input 
                type="text"
                placeholder="Search locations…" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                style={{ 
                  paddingLeft: '2.25rem', 
                  width: '100%',
                  padding: '0.6rem 0.8rem 0.6rem 2.25rem',
                  background: 'var(--samurai-bg)',
                  border: '1px solid var(--samurai-border)',
                  borderRadius: '8px',
                  color: TEXT,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }} 
              />
            </div>
          </div>

          {/* Group inspections by location */}
          {(() => {
            const groupedByLocation: Record<number, typeof filteredInspections> = {};
            for (const insp of filteredInspections) {
              if (!groupedByLocation[insp.location_id]) groupedByLocation[insp.location_id] = [];
              groupedByLocation[insp.location_id].push(insp);
            }
            
            const locationEntries = Object.entries(groupedByLocation)
              .map(([locId, insps]) => ({
                location: locations.find(l => l.id === Number(locId)),
                inspections: insps.sort((a, b) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime()),
              }))
              .filter(entry => entry.location && (!searchQuery || entry.location.name.toLowerCase().includes(searchQuery.toLowerCase())))
              .sort((a, b) => (a.location?.name || '').localeCompare(b.location?.name || ''));

            if (locationEntries.length === 0) {
              return (
                <div className="sd-empty">
                  <ClipboardList className="h-8 w-8" style={{ color: MUTED }} />
                  <p>No inspections found.</p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {locationEntries.map(({ location, inspections }) => {
                  if (!location) return null;
                  const latestScore = inspections[0]?.overall_score;
                  const scoreColor = latestScore != null ? (latestScore >= 80 ? OK : latestScore >= 60 ? WARNING : DANGER) : MUTED;
                  
                  return (
                    <div
                      key={location.id}
                      onClick={() => setSelectedLocationForCalendar(location.id)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: 'var(--samurai-surface)',
                        border: '1px solid var(--samurai-border)',
                        cursor: 'pointer',
                        transition: 'filter 0.15s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      className="hover:brightness-105"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '8px',
                          background: `color-mix(in srgb, ${color} 15%, transparent)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Building2 className="h-5 w-5" style={{ color }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: TEXT }}>{location.name}</div>
                          <div style={{ fontSize: '0.72rem', color: MUTED }}>
                            {inspections.length} inspection{inspections.length !== 1 ? 's' : ''} · Last: {new Date(inspections[0].inspection_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {latestScore != null && (
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: scoreColor }}>
                            {Math.round(latestScore)}%
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4" style={{ color: MUTED }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Calendar View Modal ── */}
      {selectedLocationForCalendar && (() => {
        const loc = locations.find(l => l.id === selectedLocationForCalendar);
        if (!loc) return null;
        
        const locInspections = inspections.filter(i => i.location_id === selectedLocationForCalendar);
        
        // Build calendar data for current month
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();
        
        // Map inspection dates to days
        const inspectionDays: Record<number, typeof locInspections> = {};
        for (const insp of locInspections) {
          const d = new Date(insp.inspection_date);
          if (d.getFullYear() === year && d.getMonth() === month) {
            const day = d.getDate();
            if (!inspectionDays[day]) inspectionDays[day] = [];
            inspectionDays[day].push(insp);
          }
        }

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedLocationForCalendar(null)}
          >
            <div
              className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
              style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sticky top-0 z-10" style={{ background: 'var(--samurai-surface)', borderBottom: '1px solid var(--samurai-border)' }}>
                <div>
                  <h3 style={{ fontWeight: 600, color: TEXT }}>{loc.name}</h3>
                  <p style={{ fontSize: '0.78rem', color: MUTED }}>{now.toLocaleString('default', { month: 'long', year: 'numeric' })} · {locInspections.length} total inspections</p>
                </div>
                <button className="sd-btn sd-btn-ghost" onClick={() => setSelectedLocationForCalendar(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="p-4">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: MUTED, padding: '0.25rem' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                  {/* Empty cells before first day */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ aspectRatio: '1' }} />
                  ))}
                  {/* Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const hasInspection = inspectionDays[day];
                    const isSelected = selectedDayForDetail?.day === day && selectedDayForDetail?.month === month;
                    
                    return (
                      <div
                        key={day}
                        onClick={() => hasInspection && setSelectedDayForDetail({ day, month, year, inspections: hasInspection })}
                        style={{
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          cursor: hasInspection ? 'pointer' : 'default',
                          background: isSelected ? `color-mix(in srgb, ${color} 20%, transparent)` : hasInspection ? 'var(--samurai-surface-2)' : 'transparent',
                          border: isSelected ? `2px solid ${color}` : hasInspection ? '1px solid var(--samurai-border)' : '1px solid transparent',
                          transition: 'all 0.15s',
                        }}
                        className={hasInspection ? 'hover:brightness-110' : ''}
                      >
                        <span style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: hasInspection ? 700 : 400, 
                          color: hasInspection ? TEXT : MUTED 
                        }}>
                          {day}
                        </span>
                        {hasInspection && (
                          <div style={{ 
                            width: '6px', height: '6px', borderRadius: '50%', 
                            background: color, marginTop: '2px' 
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Day Detail Modal ── */}
      {selectedDayForDetail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSelectedDayForDetail(null)}
        >
          <div
            className="rounded-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sticky top-0 z-10" style={{ background: 'var(--samurai-surface)', borderBottom: '1px solid var(--samurai-border)' }}>
              <div>
                <h3 style={{ fontWeight: 600, color: TEXT }}>
                  {new Date(selectedDayForDetail.year, selectedDayForDetail.month, selectedDayForDetail.day).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <p style={{ fontSize: '0.78rem', color: MUTED }}>{selectedDayForDetail.inspections.length} inspection{selectedDayForDetail.inspections.length !== 1 ? 's' : ''}</p>
              </div>
              <button className="sd-btn sd-btn-ghost" onClick={() => setSelectedDayForDetail(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {selectedDayForDetail.inspections.map((insp) => (
                <div key={insp.id} style={{ borderRadius: '0.75rem', border: '1px solid var(--samurai-border)', overflow: 'hidden' }}>
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--samurai-surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT }}>
                        {insp.inspected_by || 'Unknown Inspector'} · {new Date(insp.inspection_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: MUTED }}>{insp.photos?.length || 0} photos</div>
                    </div>
                    <span style={{
                      fontWeight: 700, fontSize: '1rem',
                      color: (insp.overall_score ?? 0) >= 80 ? OK : (insp.overall_score ?? 0) >= 60 ? WARNING : DANGER,
                    }}>
                      {insp.overall_score != null ? `${Math.round(insp.overall_score)}%` : 'N/A'}
                    </span>
                  </div>
                  
                  {/* Photos */}
                  {insp.photos && insp.photos.length > 0 && (
                    <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                      {insp.photos.map((photo, pi) => (
                        <div 
                          key={pi} 
                          onClick={() => setLightboxImage(photo.url)}
                          style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--samurai-border)', cursor: 'pointer' }}
                          className="hover:brightness-110"
                        >
                          <img src={photo.url} alt={photo.filename} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                          <div style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {photo.filename}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Checklist Summary */}
                  {insp.checklist_results && insp.checklist_results.length > 0 && (
                    <div style={{ padding: '0.75rem', borderTop: '1px solid var(--samurai-border)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: MUTED, marginBottom: '0.5rem' }}>Checklist Results</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {insp.checklist_results.map((item, i) => (
                          <span key={i} style={{
                            fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '9999px',
                            background: item.pass ? `color-mix(in srgb, ${OK} 15%, transparent)` : `color-mix(in srgb, ${DANGER} 15%, transparent)`,
                            color: item.pass ? OK : DANGER,
                          }}>
                            {item.pass ? '✓' : '✗'} {item.item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Action Items ── */}
      {subTab === 'actions' && (
        <div className="sd-stack">
          {/* Header with Add button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>Action Items ({allActions.length})</h3>
            <button className="sd-btn sd-btn-primary" onClick={() => setShowAddAction(true)}>
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>

          {/* Add Action Item Form */}
          {showAddAction && (
            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="text-xs font-medium" style={{ color: MUTED, display: 'block', marginBottom: '0.25rem' }}>Description</label>
                  <input 
                    type="text"
                    value={newActionDesc} 
                    onChange={(e) => setNewActionDesc(e.target.value)} 
                    placeholder="Describe the issue..."
                    style={{ 
                      width: '100%', 
                      padding: '0.6rem 0.8rem',
                      background: 'var(--samurai-bg)',
                      border: '1px solid var(--samurai-border)',
                      borderRadius: '8px',
                      color: TEXT,
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label className="text-xs font-medium" style={{ color: MUTED, display: 'block', marginBottom: '0.25rem' }}>Priority</label>
                    <select 
                      value={newActionPriority} 
                      onChange={(e) => setNewActionPriority(e.target.value as any)}
                      style={{ 
                        width: '100%', 
                        padding: '0.6rem 0.8rem',
                        background: 'var(--samurai-bg)',
                        border: '1px solid var(--samurai-border)',
                        borderRadius: '8px',
                        color: TEXT,
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <button 
                    className="sd-btn sd-btn-primary" 
                    disabled={!newActionDesc.trim()} 
                    onClick={() => { addActionItem(); setShowAddAction(false); }}
                    style={{ height: '38px', whiteSpace: 'nowrap', minWidth: '80px' }}
                  >
                    Add
                  </button>
                  <button 
                    className="sd-btn sd-btn-secondary" 
                    onClick={() => setShowAddAction(false)}
                    style={{ height: '38px', whiteSpace: 'nowrap', minWidth: '80px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {allActions.length === 0 ? (
            <div className="sd-empty">
              <ListChecks className="h-8 w-8" style={{ color: MUTED }} />
              <p>No action items found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => {
              const items = actionsByPriority[priority] || [];
              if (items.length === 0) return null;
              const priorityColor = priority === 'urgent' ? DANGER : priority === 'high' ? WARNING : priority === 'medium' ? TEXT : MUTED;
              return (
                <div key={priority}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: priorityColor, marginBottom: '0.5rem' }}>
                    {priority} ({items.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {items.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}>
                        <div>
                          <div style={{ fontSize: '0.82rem', color: TEXT }}>{item.description}</div>
                          <div style={{ fontSize: '0.7rem', color: MUTED }}>
                            Location #{item.location_id} · {item.status.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <select
                          value={item.status}
                          onChange={(e) => updateActionStatus(item.id, e.target.value as any)}
                          style={{ 
                            minWidth: '130px',
                            padding: '0.4rem 0.6rem',
                            background: 'var(--samurai-bg)',
                            border: '1px solid var(--samurai-border)',
                            borderRadius: '6px',
                            color: TEXT,
                            fontSize: '0.75rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* ── Compare ── */}
      {subTab === 'compare' && (
        <div className="sd-stack">
          <p style={{ fontSize: '0.82rem', color: MUTED, marginBottom: '0.5rem' }}>Select 2–5 locations to compare side by side</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
            {locations.map((loc) => {
              const selected = compareLocations.includes(String(loc.id));
              return (
                <button
                  key={loc.id}
                  onClick={() => toggleCompareLocation(String(loc.id))}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem',
                    background: selected ? `color-mix(in srgb, ${color} 20%, transparent)` : 'var(--samurai-surface-2)',
                    border: `1px solid ${selected ? color : 'var(--samurai-border)'}`,
                    color: selected ? TEXT : MUTED, cursor: 'pointer', fontWeight: selected ? 600 : 400,
                  }}
                >
                  {loc.name}
                </button>
              );
            })}
          </div>

          {compareData.length >= 2 ? (
            <div className="sd-chart-card">
              <h3 className="sd-chart-title">Score Comparison</h3>
              <BarChart data={compareData} xKey="name" yKey="score" color={color} xAngle={-15} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: MUTED, fontSize: '0.85rem' }}>
              Select at least 2 locations to compare
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailInspection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDetailInspection(null)}
        >
          <div
            className="rounded-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sticky top-0 z-10" style={{ background: 'var(--samurai-surface)', borderBottom: '1px solid var(--samurai-border)' }}>
              <div>
                <h3 style={{ fontWeight: 600, color: TEXT }}>Location #{detailInspection.location_id}</h3>
                <p style={{ fontSize: '0.78rem', color: MUTED }}>{new Date(detailInspection.inspection_date).toLocaleString()} · Score: {detailInspection.overall_score != null ? `${Math.round(detailInspection.overall_score)}%` : 'N/A'}</p>
              </div>
              <button className="sd-btn sd-btn-ghost" onClick={() => setDetailInspection(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <FacilityInspectionReview
                photos={detailInspection.photos || []}
                checklistResults={detailInspection.checklist_results}
                overallScore={detailInspection.overall_score}
                onSave={() => {}}
                saving={false}
              />

              {/* Action Items for this inspection */}
              {(() => {
                const inspActions = actionItems.filter(a => a.inspection_id === detailInspection.id);
                if (inspActions.length === 0) return null;
                return (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT, marginBottom: '0.75rem' }}>
                      Action Items ({inspActions.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {inspActions.map((item) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}>
                          <div>
                            <div style={{ fontSize: '0.82rem', color: TEXT }}>{item.description}</div>
                            <div style={{ fontSize: '0.7rem', color: MUTED }}>
                              <span style={{ 
                                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', marginRight: '0.35rem',
                                color: item.priority === 'urgent' ? '#fff' : TEXT,
                                background: item.priority === 'urgent' ? DANGER : item.priority === 'high' ? WARNING : 'var(--samurai-surface-2)',
                              }}>{item.priority}</span>
                              {item.status.replace(/_/g, ' ')}
                              {item.assigned_to && ` · ${item.assigned_to}`}
                            </div>
                          </div>
                          <select
                            value={item.status}
                            onChange={(e) => updateActionStatus(item.id, e.target.value as any)}
                            style={{ 
                              minWidth: '130px',
                              padding: '0.4rem 0.6rem',
                              background: 'var(--samurai-bg)',
                              border: '1px solid var(--samurai-border)',
                              borderRadius: '6px',
                              color: TEXT,
                              fontSize: '0.75rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Enlarged" 
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="sd-btn sd-btn-ghost" 
            onClick={() => setLightboxImage(null)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', color: '#fff' }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
