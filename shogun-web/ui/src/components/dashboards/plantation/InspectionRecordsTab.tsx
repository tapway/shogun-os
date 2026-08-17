import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, X, CheckCircle, Image as ImageIcon, Calendar, Home, Filter } from 'lucide-react';

interface Photo {
  path?: string;
  filename: string;
  url: string;
  room?: string;
  assessment?: string;
}

interface Inspection {
  id: number;
  unit_id: number;
  inspected_by: string;
  inspection_date: string;
  photos: Photo[];
  merged_assessment: Record<string, any> | null;
  furniture_count: string | null;
  cleanliness: string | null;
  site_condition: string | null;
  safety_hazards: string | null;
  overall_rating: string | null;
  priority_actions: string | null;
  created_at: string;
}

interface Unit {
  id: number;
  site_name: string;
  block_name: string;
  unit_number: string;
}

export function InspectionRecordsTab() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<Set<number>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Inspection | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const ratingColor = (rating: string) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('good')) return 'var(--samurai-ok)';
    if (r.includes('moderate') || r.includes('acceptable')) return 'var(--samurai-warning)';
    if (r.includes('poor') || r.includes('bad') || r.includes('uninhabitable') || r.includes('maintenance')) return 'var(--samurai-danger)';
    return 'var(--samurai-muted)';
  };

  useEffect(() => {
    fetch('/api/departments/facility/dashboard/site-units')
      .then((r) => r.json())
      .then((d) => setUnits(d.units || []))
      .catch(() => {});
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setDetail(null);
    try {
      const params = new URLSearchParams();
      if (selectedUnits.size > 0) {
        params.set('unit_ids', Array.from(selectedUnits).join(','));
      }
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const query = params.toString();
      const url = `/api/departments/facility/dashboard/inspections${query ? '?' + query : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setInspections(data.inspections || []);
    } catch { setInspections([]); }
    finally { setLoading(false); }
  }, [selectedUnits, dateFrom, dateTo]);

  // Auto-load on filter change
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const toggleUnit = (id: number) => {
    setSelectedUnits(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllUnits = () => {
    setSelectedUnits(new Set(units.map(u => u.id)));
  };

  const clearUnits = () => {
    setSelectedUnits(new Set());
  };

  const clearFilters = () => {
    setSelectedUnits(new Set());
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = selectedUnits.size > 0 || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--samurai-text)' }}>
            <Filter className="h-4 w-4" style={{ color: 'var(--samurai-text)' }} /> Filters
          </span>
          {hasFilters && (
            <button className="text-xs" style={{ color: 'var(--samurai-muted)' }} onClick={clearFilters}>Clear all</button>
          )}
        </div>

        {/* Date Range */}
        <div>
          <label className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--samurai-muted)' }}>
            <Calendar className="h-3 w-3" style={{ color: 'var(--samurai-text)' }} /> Date Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="sd-input flex-1 text-xs"
              style={{ background: 'var(--samurai-surface-2)', color: 'var(--samurai-text)' }}
              placeholder="From"
            />
            <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="sd-input flex-1 text-xs"
              style={{ background: 'var(--samurai-surface-2)', color: 'var(--samurai-text)' }}
              placeholder="To"
            />
            {/* Quick presets */}
            <button className="sd-btn sd-btn-ghost text-xs" onClick={() => { const d = new Date(); setDateTo(d.toISOString().split('T')[0]); d.setDate(d.getDate()-7); setDateFrom(d.toISOString().split('T')[0]); }} title="Last 7 days">7d</button>
            <button className="sd-btn sd-btn-ghost text-xs" onClick={() => { const d = new Date(); setDateTo(d.toISOString().split('T')[0]); d.setMonth(d.getMonth()-1); setDateFrom(d.toISOString().split('T')[0]); }} title="Last 30 days">30d</button>
          </div>
        </div>

        {/* Multi-check Hostel Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--samurai-muted)' }}>
              <Home className="h-3 w-3" style={{ color: 'var(--samurai-text)' }} /> Hostels ({selectedUnits.size}/{units.length} selected)
            </label>
            <div className="flex gap-2">
              <button className="text-xs" style={{ color: 'var(--samurai-muted)' }} onClick={selectAllUnits}>Select all</button>
              <button className="text-xs" style={{ color: 'var(--samurai-muted)' }} onClick={clearUnits}>Clear</button>
            </div>
          </div>
          {units.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>No hostels registered.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {units.map((u) => {
                const checked = selectedUnits.has(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition"
                    style={{
                      background: checked ? 'color-mix(in srgb, var(--samurai-accent-fill) 12%, transparent)' : 'var(--samurai-surface-2)',
                      border: `1px solid ${checked ? 'var(--samurai-accent-fill)' : 'var(--samurai-border)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUnit(u.id)}
                      className="h-3.5 w-3.5"
                      style={{ accentColor: 'var(--samurai-accent-fill)' }}
                    />
                    <span className="text-xs truncate" style={{ color: 'var(--samurai-text)' }}>
                      {u.site_name} — {u.block_name} — {u.unit_number}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>
          {loading ? 'Loading...' : `${inspections.length} record${inspections.length !== 1 ? 's' : ''} found`}
        </span>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--samurai-muted)' }} /></div>
      ) : inspections.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--samurai-muted)' }}>
          <FileText className="h-8 w-8 mx-auto mb-2" style={{ opacity: 0.3 }} />
          <p className="text-sm">{hasFilters ? 'No records match the selected filters.' : 'No inspection records yet.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map((insp) => {
            const unit = units.find((u) => u.id === insp.unit_id);
            const rc = ratingColor(insp.overall_rating || '');
            return (
              <button
                key={insp.id}
                onClick={() => setDetail(insp)}
                className="w-full text-left rounded-lg p-4 transition hover:filter brightness-105"
                style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)', cursor: 'pointer' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--samurai-text)' }}>
                    {unit ? `${unit.site_name} — ${unit.block_name} — ${unit.unit_number}` : `Unit #${insp.unit_id}`}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>
                    {new Date(insp.inspection_date).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--samurai-muted)' }}>
                  {insp.photos.length > 0 && (
                    <div className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> {insp.photos.length} photo{insp.photos.length > 1 ? 's' : ''}
                    </div>
                  )}
                  <span>By {insp.inspected_by}</span>
                  {insp.overall_rating && (
                    <span className="font-medium" style={{ color: rc }}>{insp.overall_rating}</span>
                  )}
                </div>
                {(insp.furniture_count || insp.cleanliness) && (
                  <div className="flex gap-4 text-xs mt-1" style={{ color: 'var(--samurai-muted)' }}>
                    {insp.furniture_count && <span>Furniture: {insp.furniture_count}</span>}
                    {insp.cleanliness && <span>Cleanliness: {insp.cleanliness}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setDetail(null)}>
          <div
            className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sticky top-0" style={{ background: 'var(--samurai-surface)', borderBottom: '1px solid var(--samurai-border)' }}>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: 'var(--samurai-muted)' }} />
                <span className="font-semibold" style={{ color: 'var(--samurai-text)' }}>
                  Inspection #{detail.id}
                </span>
              </div>
              <button onClick={() => setDetail(null)} className="sd-btn sd-btn-ghost">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Meta */}
              <div className="text-xs flex items-center gap-3" style={{ color: 'var(--samurai-muted)' }}>
                <span>{new Date(detail.inspection_date).toLocaleString()}</span>
                <span>By {detail.inspected_by}</span>
              </div>

              {/* New per_photo structure */}
              {detail.merged_assessment?.per_photo && Array.isArray(detail.merged_assessment.per_photo) && detail.merged_assessment.per_photo.length > 0 ? (
                detail.merged_assessment.per_photo.map((pr: any, pi: number) => (
                  <div key={pi} className="space-y-3">
                    {/* Photo header */}
                    <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: 'var(--samurai-border)' }}>
                      {pr.url ? (
                        <img
                          src={pr.url}
                          alt={pr.filename}
                          className="h-12 w-12 object-cover rounded-lg flex-shrink-0 cursor-pointer transition hover:opacity-80"
                          onClick={(e) => { e.stopPropagation(); setZoomImage(pr.url); }}
                        />
                      ) : (
                        <div className="h-12 w-12 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'var(--samurai-muted)', opacity: 0.3 }}>
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>{pr.filename}</span>
                    </div>

                    {/* Furniture */}
                    {pr.furniture_result && (
                      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold" style={{ background: 'var(--samurai-accent-fill)', color: 'var(--samurai-accent-button-text)' }}>1</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Furniture</span>
                          <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>— {pr.furniture_result.total_items ?? 0} items</span>
                        </div>
                        <div className="px-3 py-2">
                          {pr.furniture_result.furniture && Array.isArray(pr.furniture_result.furniture) && pr.furniture_result.furniture.length > 0 ? (
                            <table className="w-full text-xs">
                              <tbody>
                                {pr.furniture_result.furniture.map((f: any, i: number) => (
                                  <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--samurai-border)' }}>
                                    <td className="py-1.5 pr-3" style={{ color: 'var(--samurai-text)' }}>{f.quantity}× {f.item}</td>
                                    <td className="py-1.5 text-right" style={{ color: 'var(--samurai-muted)' }}>{f.condition}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>No furniture data.</p>
                          )}
                          {pr.furniture_result.summary && (
                            <p className="text-xs mt-2 pt-2 border-t" style={{ color: 'var(--samurai-muted)', borderColor: 'var(--samurai-border)' }}>{pr.furniture_result.summary}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cleanliness */}
                    {pr.cleanliness_result && (
                      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold" style={{ background: 'var(--samurai-accent-fill)', color: 'var(--samurai-accent-button-text)' }}>2</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Cleanliness</span>
                          <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>— {pr.cleanliness_result.cleanliness?.overall || '—'}</span>
                        </div>
                        <div className="px-3 py-2">
                          {pr.cleanliness_result.cleanliness && typeof pr.cleanliness_result.cleanliness === 'object' ? (
                            <table className="w-full text-xs">
                              <tbody>
                                {Object.entries(pr.cleanliness_result.cleanliness).filter(([k]: [string, any]) => k !== 'overall').map(([k, v]: [string, any]) => (
                                  <tr key={k} className="border-b last:border-0" style={{ borderColor: 'var(--samurai-border)' }}>
                                    <td className="py-1.5 pr-3 capitalize" style={{ color: 'var(--samurai-muted)' }}>{k}</td>
                                    <td className="py-1.5 text-right" style={{ color: 'var(--samurai-text)' }}>{v || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>No cleanliness data.</p>
                          )}
                          {pr.cleanliness_result.summary && (
                            <p className="text-xs mt-2 pt-2 border-t" style={{ color: 'var(--samurai-muted)', borderColor: 'var(--samurai-border)' }}>{pr.cleanliness_result.summary}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Site Condition */}
                    {pr.condition_result && (
                      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold" style={{ background: 'var(--samurai-accent-fill)', color: 'var(--samurai-accent-button-text)' }}>3</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Site Condition</span>
                          <span className="text-xs font-medium" style={{ color: ratingColor(pr.condition_result.overall_rating || '') }}>— {pr.condition_result.overall_rating || '—'}</span>
                        </div>
                        <div className="px-3 py-2 space-y-2">
                          {pr.condition_result.site_condition && typeof pr.condition_result.site_condition === 'object' ? (
                            <table className="w-full text-xs">
                              <tbody>
                                {Object.entries(pr.condition_result.site_condition).map(([k, v]: [string, any]) => (
                                  <tr key={k} className="border-b last:border-0" style={{ borderColor: 'var(--samurai-border)' }}>
                                    <td className="py-1.5 pr-3 capitalize" style={{ color: 'var(--samurai-muted)', whiteSpace: 'nowrap' }}>{k}</td>
                                    <td className="py-1.5" style={{ color: 'var(--samurai-text)' }}>{v || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>No condition data.</p>
                          )}
                          {pr.condition_result.safety_hazards && Array.isArray(pr.condition_result.safety_hazards) && pr.condition_result.safety_hazards.length > 0 && (
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--samurai-border)' }}>
                              <span className="text-xs font-medium" style={{ color: 'var(--samurai-danger)' }}>⚠ Safety Hazards</span>
                              <ul className="text-xs list-disc pl-5 mt-1" style={{ color: 'var(--samurai-text)' }}>
                                {pr.condition_result.safety_hazards.map((h: string, i: number) => <li key={i}>{h}</li>)}
                              </ul>
                            </div>
                          )}
                          {pr.condition_result.priority_actions && Array.isArray(pr.condition_result.priority_actions) && pr.condition_result.priority_actions.length > 0 && (
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--samurai-border)' }}>
                              <span className="text-xs font-medium" style={{ color: 'var(--samurai-warning)' }}>Priority Actions</span>
                              <ol className="text-xs list-decimal pl-5 mt-1" style={{ color: 'var(--samurai-text)' }}>
                                {pr.condition_result.priority_actions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                              </ol>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Fallback for old records without per_photo structure */
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detail.furniture_count && (
                    <div className="rounded-lg p-3" style={{ background: 'var(--samurai-surface-2)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--samurai-muted)' }}>Furniture Count</div>
                      <div style={{ color: 'var(--samurai-text)' }}>{detail.furniture_count}</div>
                    </div>
                  )}
                  {detail.cleanliness && (
                    <div className="rounded-lg p-3" style={{ background: 'var(--samurai-surface-2)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--samurai-muted)' }}>Cleanliness</div>
                      <div style={{ color: 'var(--samurai-text)' }}>{detail.cleanliness}</div>
                    </div>
                  )}
                  {detail.overall_rating && (
                    <div className="rounded-lg p-3" style={{ background: 'var(--samurai-surface-2)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--samurai-muted)' }}>Overall Rating</div>
                      <div style={{ color: 'var(--samurai-text)' }}>{detail.overall_rating}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Photos gallery (if no per_photo structure, show raw photos) */}
              {detail.photos.length > 0 && !detail.merged_assessment?.per_photo && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--samurai-text)' }}>
                    <ImageIcon className="h-4 w-4" /> Photos ({detail.photos.length})
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {detail.photos.map((p, i) => (
                      p.url ? <img key={i} src={p.url} alt={p.filename} className="h-16 w-16 object-cover rounded-lg cursor-pointer transition hover:opacity-80" onClick={() => setZoomImage(p.url)} /> : null
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sticky bottom-0 flex justify-end" style={{ background: 'var(--samurai-surface)', borderTop: '1px solid var(--samurai-border)' }}>
              <button className="sd-btn sd-btn-secondary" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom / Lightbox */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setZoomImage(null)}
        >
          <button
            className="absolute top-4 right-4 sd-btn sd-btn-ghost"
            onClick={() => setZoomImage(null)}
            style={{ color: '#fff' }}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={zoomImage}
            alt="Enlarged"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
