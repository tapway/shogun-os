import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle2, XCircle, ChevronRight, ChevronLeft, Loader2, MapPin, Save, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import type { FacilityStats, FacilityLocation, FacilityInspectionPhoto, FacilityActionItem } from '../../../lib/types';
import { FacilityInspectionReview } from './FacilityInspectionReview';
import { MOCK_LOCATIONS, MOCK_INSPECTIONS, MOCK_ACTION_ITEMS } from '../../../lib/facilityMockData';

interface Props {
  stats: FacilityStats;
  color: string;
  department: string;
  preselectedLocationId: string | null;
  onClearPreselect: () => void;
  onSaved: () => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const DANGER = 'var(--samurai-danger)';
const OK = 'var(--samurai-ok)';

const STEPS = [
  { id: 'select', label: 'Select Location' },
  { id: 'photos', label: 'Upload Photos' },
  { id: 'assess', label: 'AI Assessment' },
  { id: 'review', label: 'Review & Save' },
] as const;

type StepId = typeof STEPS[number]['id'];

export function FacilityInspectTab({ stats, color, department, preselectedLocationId, onClearPreselect, onSaved }: Props) {
  const [locations] = useState(MOCK_LOCATIONS);
  const [inspections] = useState(MOCK_INSPECTIONS);
  const [step, setStep] = useState<StepId>('select');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [assessing, setAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<{ photos: FacilityInspectionPhoto[]; checklist_results?: Array<{ item: string; pass: boolean; evidence?: string; critical?: boolean; category?: string }> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select if pre-selected from Locations tab
  useEffect(() => {
    if (preselectedLocationId) {
      setSelectedLocationId(preselectedLocationId);
      setStep('photos');
      onClearPreselect();
    }
  }, [preselectedLocationId, onClearPreselect]);

  const selectedLocation = locations.find((l) => String(l.id) === selectedLocationId);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotos((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setPhotoPreviews((prev) => [...prev, ...previews]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function runAssessment() {
    if (!selectedLocationId || photos.length === 0) return;
    setAssessing(true);
    setError(null);
    // Mock assessment - simulate AI processing
    setTimeout(() => {
      const mockResult = {
        photos: photos.map((f, i) => ({ url: URL.createObjectURL(f), filename: f.name })),
        checklist_results: [
          { item: 'Fire extinguisher visible and accessible', pass: Math.random() > 0.3, critical: true, category: 'safety' },
          { item: 'Floor clean and free of debris', pass: Math.random() > 0.4, category: 'cleanliness' },
          { item: 'Emergency exit signs illuminated', pass: Math.random() > 0.2, critical: true, category: 'safety' },
          { item: 'Tools/equipment stored properly', pass: Math.random() > 0.5, category: 'assets' },
        ],
      };
      setAssessmentResult(mockResult);
      setStep('review');
      setAssessing(false);
    }, 1500);
  }

  async function saveInspection(checklistOverrides: Array<{ item: string; pass: boolean; evidence?: string; critical?: boolean; category?: string }>, actionItems: Partial<FacilityActionItem>[]) {
    // Mock save - just call callback
    console.log('Mock save inspection:', { selectedLocationId, checklistOverrides, actionItems });
    onSaved();
  }

  function goBack() {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  }

  function goNext() {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
  }

  return (
    <div className="sd-stack">
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        {STEPS.map((s, i) => {
          const isActive = s.id === step;
          const isDone = STEPS.findIndex((x) => x.id === step) > i;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isActive ? color : isDone ? OK : 'var(--samurai-surface-2)',
                  color: isActive || isDone ? '#0a0a0a' : MUTED,
                  border: `1px solid ${isActive ? color : 'var(--samurai-border)'}`,
                }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.78rem', color: isActive ? TEXT : MUTED, fontWeight: isActive ? 600 : 400 }}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div style={{ width: '24px', height: '1px', background: 'var(--samurai-border)' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--samurai-danger) 12%, transparent)', color: DANGER }}>
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step 1: Select Location */}
      {step === 'select' && (
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT, marginBottom: '0.75rem' }}>Choose a location to inspect</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => { setSelectedLocationId(String(loc.id)); goNext(); }}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  background: selectedLocationId === String(loc.id) ? `color-mix(in srgb, ${color} 15%, transparent)` : 'var(--samurai-surface)',
                  border: `1px solid ${selectedLocationId === String(loc.id) ? color : 'var(--samurai-border)'}`,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT }}>{loc.name}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>{loc.location_type} · Score: {loc.last_overall_score != null ? Math.round(loc.last_overall_score) : 'N/A'}%</div>
                </div>
                <ChevronRight className="h-4 w-4" style={{ color: MUTED }} />
              </button>
            ))}
          </div>
          {locations.length === 0 && (
            <div className="sd-empty">
              <MapPin className="h-8 w-8" style={{ color: MUTED }} />
              <p>No locations registered. Add locations first.</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Upload Photos */}
      {step === 'photos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>
              Upload photos for {selectedLocation?.name || 'selected location'}
            </h3>
            <span style={{ fontSize: '0.78rem', color: MUTED }}>{photos.length} photo(s)</span>
          </div>

          {/* Drop zone */}
          <div
            className="rounded-lg border-2 border-dashed p-6 text-center"
            style={{ borderColor: 'var(--samurai-border)', cursor: 'pointer' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: MUTED }} />
            <p style={{ fontSize: '0.85rem', color: TEXT }}>Click or drag photos here</p>
            <p style={{ fontSize: '0.72rem', color: MUTED }}>JPG, PNG supported</p>
          </div>

          {/* Previews */}
          {photoPreviews.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
              {photoPreviews.map((url, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--samurai-border)' }}>
                  <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                  <button
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      background: 'rgba(0,0,0,0.6)', borderRadius: '50%',
                      width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    <XCircle className="h-3 w-3" style={{ color: '#fff' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="sd-btn sd-btn-secondary" onClick={goBack}>← Back</button>
            <button
              className="sd-btn sd-btn-primary"
              disabled={photos.length === 0}
              onClick={goNext}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: AI Assessment */}
      {step === 'assess' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {!assessing ? (
            <>
              <Camera className="h-12 w-12 mx-auto mb-3" style={{ color }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: TEXT, marginBottom: '0.5rem' }}>Ready to assess</h3>
              <p style={{ fontSize: '0.85rem', color: MUTED, marginBottom: '1.5rem' }}>
                AI will analyze {photos.length} photo(s) for {selectedLocation?.name || 'the selected location'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button className="sd-btn sd-btn-secondary" onClick={goBack}>← Back</button>
                <button className="sd-btn sd-btn-primary" onClick={runAssessment}>
                  Run AI Assessment
                </button>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3" style={{ color }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: TEXT }}>Analyzing photos…</h3>
              <p style={{ fontSize: '0.85rem', color: MUTED }}>This may take a moment</p>
            </>
          )}
        </div>
      )}

      {/* Step 4: Review & Save */}
      {step === 'review' && assessmentResult && (
        <div>
          <FacilityInspectionReview
            photos={assessmentResult.photos}
            checklistResults={assessmentResult.checklist_results}
            overallScore={null}
            onSave={saveInspection}
            saving={saving}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="sd-btn sd-btn-secondary" onClick={goBack}>← Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
