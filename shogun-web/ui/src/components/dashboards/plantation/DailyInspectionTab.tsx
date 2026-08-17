import { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, AlertTriangle, Camera, X, Bed, Sparkles, Building } from 'lucide-react';

interface Photo {
  path: string;
  filename: string;
  url: string;
  room: string;
}

interface PerPhotoResult {
  filename: string;
  url: string;
  path: string;
  furniture_result: {
    furniture: { item: string; quantity: number; condition: string }[];
    total_items: number;
    summary: string;
    raw_response?: string;
  };
  cleanliness_result: {
    cleanliness: { floor: string; walls: string; bedding: string; surfaces: string; overall: string };
    summary: string;
    raw_response?: string;
  };
  condition_result: {
    site_condition: { walls: string; ceiling: string; windows: string; lighting: string; ventilation: string };
    safety_hazards: string[];
    overall_rating: string;
    priority_actions: string[];
    raw_response?: string;
  };
}

interface AssessResult {
  unit_id: number;
  unit_label: string;
  photos: Photo[];
  per_photo: PerPhotoResult[];
  furniture_count: number;
  cleanliness: string;
  overall_rating: string;
  merged_assessment: { per_photo: PerPhotoResult[] };
}

export function DailyInspectionTab() {
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/departments/facility/dashboard/site-units')
      .then((r) => r.json())
      .then((d) => setUnits(d.units || []))
      .catch(() => {});
  }, []);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
    setResult(null);
    setError(null);
    setSavedMsg(null);
  };

  const handleAssess = async () => {
    if (!selectedUnit || files.length === 0) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setSavedMsg(null);
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    try {
      const res = await fetch(`/api/departments/facility/dashboard/site-units/${selectedUnit}/assess`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Assessment failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAndSave = async () => {
    if (!result || !selectedUnit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/departments/facility/dashboard/site-units/${selectedUnit}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: result.photos.map((p) => ({ path: p.path, filename: p.filename, url: p.url, room: p.room, assessment: '' })),
          furniture_count: String(result.furniture_count),
          cleanliness: result.cleanliness,
          site_condition: '',
          safety_hazards: '',
          overall_rating: result.overall_rating,
          priority_actions: '',
          merged_assessment: result.merged_assessment,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Save failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setSavedMsg(`Saved — inspection #${(await res.json()).id} recorded.`);
      setResult(null);
      setFiles([]);
      setPreviews([]);
      setSelectedUnit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDiscard = () => {
    setResult(null);
    setFiles([]);
    setPreviews([]);
    setError(null);
  };

  const ratingColor = (rating: string) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('good')) return 'var(--samurai-ok)';
    if (r.includes('moderate') || r.includes('acceptable')) return 'var(--samurai-warning)';
    if (r.includes('poor') || r.includes('bad') || r.includes('uninhabitable') || r.includes('maintenance')) return 'var(--samurai-danger)';
    return 'var(--samurai-muted)';
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Select unit */}
      <div>
        <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--samurai-text)' }}>1. Select Unit</label>
        {units.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--samurai-muted)' }}>No units registered. Go to Unit Registration tab first.</p>
        ) : (
          <select
            className="sd-input"
            style={{ background: 'var(--samurai-surface-2)', color: 'var(--samurai-text)' }}
            value={selectedUnit || ''}
            onChange={(e) => { setSelectedUnit(parseInt(e.target.value)); setResult(null); setSavedMsg(null); }}
          >
            <option value="">-- Select a unit --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.site_name} — {u.block_name} — {u.unit_number}</option>
            ))}
          </select>
        )}
      </div>

      {/* Step 2: Upload photos */}
      {selectedUnit && (
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--samurai-text)' }}>2. Upload Photos</label>
          <div className="rounded-lg border-2 border-dashed p-6 text-center" style={{ borderColor: 'var(--samurai-border)' }}>
            {files.length > 0 ? (
              <div className="flex flex-wrap gap-3 justify-center">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`Photo ${i + 1}`} className="h-24 w-24 object-cover rounded-lg" />
                ))}
                <label className="cursor-pointer flex items-center justify-center h-24 w-24 rounded-lg border" style={{ borderColor: 'var(--samurai-border)', color: 'var(--samurai-muted)' }}>
                  <Camera className="h-6 w-6" />
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8" style={{ color: 'var(--samurai-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--samurai-text)' }}>Upload photos of this unit</span>
                <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>Bedroom, bathroom, kitchen — multiple photos OK</span>
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Run assessment */}
      {selectedUnit && files.length > 0 && !result && (
        <button className="sd-btn sd-btn-primary" onClick={handleAssess} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Assessing ({files.length} photos)...</> : <><ImageIcon className="h-4 w-4" /> Run Assessment</>}
        </button>
      )}

      {savedMsg && (
        <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--samurai-ok) 12%, transparent)', color: 'var(--samurai-ok)' }}>
          <CheckCircle className="h-4 w-4" /><span className="text-sm">{savedMsg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-4 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--samurai-danger) 12%, transparent)', color: 'var(--samurai-danger)' }}>
          <AlertTriangle className="h-4 w-4" /><span className="text-sm">{error}</span>
        </div>
      )}

      {/* Results modal — grouped by photo, each photo shows 3 skill results */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sticky top-0 z-10" style={{ background: 'var(--samurai-surface)', borderBottom: '1px solid var(--samurai-border)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" style={{ color: 'var(--samurai-ok)' }} />
                <span className="font-semibold" style={{ color: 'var(--samurai-text)' }}>Inspection Result — {result.unit_label}</span>
              </div>
              <button onClick={handleCloseDiscard} className="sd-btn sd-btn-ghost" disabled={saving}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {result.per_photo.map((pr, pi) => (
                <div key={pi} className="space-y-3">
                  {/* Photo header */}
                  <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: 'var(--samurai-border)' }}>
                    {pr.url ? (
                      <img src={pr.url} alt={pr.filename} className="h-12 w-12 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="h-12 w-12 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'var(--samurai-muted)', opacity: 0.3 }}>
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                    <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>{pr.filename}</span>
                  </div>

                  {/* Skill 1: Furniture Count */}
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                      <Bed className="h-4 w-4" style={{ color: 'var(--samurai-accent)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Furniture</span>
                      <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>— {pr.furniture_result?.total_items ?? 0} items</span>
                    </div>
                    <div className="px-3 py-2">
                      {pr.furniture_result?.furniture && pr.furniture_result.furniture.length > 0 ? (
                        <table className="w-full text-xs">
                          <tbody>
                            {pr.furniture_result.furniture.map((f, i) => (
                              <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--samurai-border)' }}>
                                <td className="py-1.5 pr-3" style={{ color: 'var(--samurai-text)' }}>{f.quantity}× {f.item}</td>
                                <td className="py-1.5 text-right" style={{ color: 'var(--samurai-muted)' }}>{f.condition}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs" style={{ color: 'var(--samurai-muted)' }}>No furniture detected.</p>
                      )}
                      {pr.furniture_result?.summary && (
                        <p className="text-xs mt-2 pt-2 border-t" style={{ color: 'var(--samurai-muted)', borderColor: 'var(--samurai-border)' }}>{pr.furniture_result.summary}</p>
                      )}
                    </div>
                  </div>

                  {/* Skill 2: Cleanliness */}
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                      <Sparkles className="h-4 w-4" style={{ color: 'var(--samurai-accent)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Cleanliness</span>
                      <span className="text-xs" style={{ color: 'var(--samurai-muted)' }}>— {pr.cleanliness_result?.cleanliness?.overall || '—'}</span>
                    </div>
                    <div className="px-3 py-2">
                      {pr.cleanliness_result?.cleanliness ? (
                        <table className="w-full text-xs">
                          <tbody>
                            {Object.entries(pr.cleanliness_result.cleanliness).filter(([k]) => k !== 'overall').map(([k, v]) => (
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
                      {pr.cleanliness_result?.summary && (
                        <p className="text-xs mt-2 pt-2 border-t" style={{ color: 'var(--samurai-muted)', borderColor: 'var(--samurai-border)' }}>{pr.cleanliness_result.summary}</p>
                      )}
                    </div>
                  </div>

                  {/* Skill 3: Site Condition */}
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--samurai-border)' }}>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--samurai-surface-2)' }}>
                      <Building className="h-4 w-4" style={{ color: 'var(--samurai-accent)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Site Condition</span>
                      <span className="text-xs font-medium" style={{ color: ratingColor(pr.condition_result?.overall_rating || '') }}>— {pr.condition_result?.overall_rating || '—'}</span>
                    </div>
                    <div className="px-3 py-2 space-y-2">
                      {pr.condition_result?.site_condition && typeof pr.condition_result.site_condition === 'object' ? (
                        <table className="w-full text-xs">
                          <tbody>
                            {Object.entries(pr.condition_result.site_condition).map(([k, v]) => (
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
                      {pr.condition_result?.safety_hazards && Array.isArray(pr.condition_result.safety_hazards) && pr.condition_result.safety_hazards.length > 0 && (
                        <div className="pt-2 border-t" style={{ borderColor: 'var(--samurai-border)' }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--samurai-danger)' }}>⚠ Safety Hazards</span>
                          <ul className="text-xs list-disc pl-5 mt-1" style={{ color: 'var(--samurai-text)' }}>
                            {pr.condition_result.safety_hazards.map((h, i) => <li key={i}>{h}</li>)}
                          </ul>
                        </div>
                      )}
                      {pr.condition_result?.priority_actions && Array.isArray(pr.condition_result.priority_actions) && pr.condition_result.priority_actions.length > 0 && (
                        <div className="pt-2 border-t" style={{ borderColor: 'var(--samurai-border)' }}>
                          <span className="text-xs font-medium" style={{ color: 'var(--samurai-warning)' }}>Priority Actions</span>
                          <ol className="text-xs list-decimal pl-5 mt-1" style={{ color: 'var(--samurai-text)' }}>
                            {pr.condition_result.priority_actions.map((a, i) => <li key={i}>{a}</li>)}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer — Close = save to DB */}
            <div className="p-4 sticky bottom-0 flex justify-end gap-2 z-10" style={{ background: 'var(--samurai-surface)', borderTop: '1px solid var(--samurai-border)' }}>
              <button className="sd-btn sd-btn-secondary" onClick={handleCloseDiscard} disabled={saving}>
                Discard
              </button>
              <button className="sd-btn sd-btn-primary" onClick={handleCloseAndSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <>Close & Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
