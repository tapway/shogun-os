import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Save, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import type { FacilityInspectionPhoto, FacilityActionItem } from '../../../lib/types';

/** A single checklist result from the inspection-level checklist_results array */
interface ChecklistResult {
  item: string;
  pass: boolean;
  evidence?: string;
  critical?: boolean;
  category?: string;
}

interface Props {
  photos: FacilityInspectionPhoto[];
  checklistResults?: ChecklistResult[] | null;
  overallScore?: number | null;
  onSave: (checklistOverrides: ChecklistResult[], actionItems: Partial<FacilityActionItem>[]) => void;
  saving: boolean;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const DANGER = 'var(--samurai-danger)';
const OK = 'var(--samurai-ok)';
const WARNING = 'var(--samurai-warning)';

export function FacilityInspectionReview({ photos, checklistResults, overallScore: storedScore, onSave, saving }: Props) {
  // Local state for overrides
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [overrideNotes, setOverrideNotes] = useState<Record<number, string>>({});
  const [actionItems, setActionItems] = useState<Partial<FacilityActionItem>[]>([]);
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionPriority, setNewActionPriority] = useState<FacilityActionItem['priority']>('medium');
  const [expandedPhoto, setExpandedPhoto] = useState<number | null>(0);

  const items = checklistResults || [];

  function toggleOverride(index: number, originalPassed: boolean) {
    setOverrides((prev) => ({ ...prev, [index]: !originalPassed }));
  }

  function getEffectivePassed(item: ChecklistResult, index: number): boolean {
    if (index in overrides) return overrides[index];
    return item.pass;
  }

  function addActionItem() {
    if (!newActionDesc.trim()) return;
    setActionItems((prev) => [...prev, { description: newActionDesc.trim(), priority: newActionPriority, status: 'open' }]);
    setNewActionDesc('');
  }

  function removeActionItem(index: number) {
    setActionItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    // Build final checklist results with overrides applied
    const finalResults: ChecklistResult[] = items.map((item, i) => ({
      ...item,
      pass: getEffectivePassed(item, i),
    }));
    onSave(finalResults, actionItems);
  }

  // Use stored overall_score if available, otherwise compute from checklist
  const totalItems = items.length;
  const passedCount = items.reduce((sum, item, i) => sum + (getEffectivePassed(item, i) ? 1 : 0), 0);
  const computedScore = totalItems > 0 ? Math.round((passedCount / totalItems) * 100) : 0;
  const displayScore = storedScore != null ? Math.round(storedScore) : computedScore;

  return (
    <div className="sd-stack">
      {/* Overall Score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '0.75rem', background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: displayScore >= 80 ? OK : displayScore >= 60 ? WARNING : DANGER }}>
          {displayScore}%
        </div>
        <div>
          <div style={{ fontWeight: 600, color: TEXT }}>Overall Compliance Score</div>
          <div style={{ fontSize: '0.78rem', color: MUTED }}>
            {storedScore != null 
              ? `${totalItems} checklist items · ${photos.length} photo(s)` 
              : `${passedCount}/${totalItems} checks passed across ${photos.length} photo(s)`}
          </div>
        </div>
      </div>

      {/* Photo gallery (read-only previews) */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
          {photos.map((photo, pi) => (
            <div key={pi} style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--samurai-border)' }}>
              <img src={photo.url} alt={photo.filename} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
              <div style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {photo.room ? `${photo.room} — ` : ''}{photo.filename}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist items */}
      {items.length > 0 && (
        <div style={{ borderRadius: '0.75rem', border: '1px solid var(--samurai-border)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.75rem 1rem', background: 'var(--samurai-surface-2)', cursor: 'pointer',
            }}
            onClick={() => setExpandedPhoto(expandedPhoto === null ? 0 : null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: MUTED }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>Checklist Results ({items.length} items)</span>
            </div>
            {expandedPhoto !== null ? <ChevronUp className="h-4 w-4" style={{ color: MUTED }} /> : <ChevronDown className="h-4 w-4" style={{ color: MUTED }} />}
          </div>

          {expandedPhoto !== null && (
            <div style={{ padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.map((item, i) => {
                  const effectivePassed = getEffectivePassed(item, i);
                  const isOverridden = i in overrides;

                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--samurai-surface)', border: `1px solid ${isOverridden ? WARNING : 'var(--samurai-border)'}` }}>
                      <button
                        onClick={() => toggleOverride(i, item.pass)}
                        style={{ marginTop: '2px', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                      >
                        {effectivePassed ? (
                          <CheckCircle2 className="h-5 w-5" style={{ color: OK }} />
                        ) : (
                          <XCircle className="h-5 w-5" style={{ color: DANGER }} />
                        )}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: TEXT }}>
                          {item.item}
                          {item.critical && <span style={{ fontSize: '0.65rem', color: DANGER, marginLeft: '0.5rem', fontWeight: 700 }}>CRITICAL</span>}
                          {item.category && <span style={{ fontSize: '0.65rem', color: MUTED, marginLeft: '0.5rem' }}>({item.category})</span>}
                          {isOverridden && <span style={{ fontSize: '0.7rem', color: WARNING, marginLeft: '0.5rem' }}>(overridden)</span>}
                        </div>
                        {item.evidence && (
                          <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.2rem' }}>{item.evidence}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No data fallback */}
      {items.length === 0 && photos.length === 0 && (
        <div style={{ padding: '1rem', textAlign: 'center', color: MUTED, fontSize: '0.85rem' }}>
          No checklist results or photos available.
        </div>
      )}

      {/* Action Items Panel */}
      <div style={{ borderRadius: '0.75rem', border: '1px solid var(--samurai-border)', padding: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT, marginBottom: '0.75rem' }}>Action Items</h3>

        {actionItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
            {actionItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', background: 'var(--samurai-surface-2)', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.1rem 0.35rem', borderRadius: '0.25rem',
                    color: item.priority === 'urgent' ? '#fff' : TEXT,
                    background: item.priority === 'urgent' ? DANGER : item.priority === 'high' ? WARNING : 'var(--samurai-surface)',
                  }}>
                    {item.priority}
                  </span>
                  <span style={{ color: TEXT }}>{item.description}</span>
                </div>
                <button onClick={() => removeActionItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="sd-input"
            placeholder="Add action item…"
            value={newActionDesc}
            onChange={(e) => setNewActionDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addActionItem()}
            style={{ flex: 1 }}
          />
          <select className="sd-input" value={newActionPriority} onChange={(e) => setNewActionPriority(e.target.value as any)} style={{ minWidth: '100px' }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button className="sd-btn sd-btn-secondary" onClick={addActionItem} disabled={!newActionDesc.trim()}>Add</button>
        </div>
      </div>

      {/* Save Button */}
      <button className="sd-btn sd-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={saving} onClick={handleSave}>
        {saving ? 'Saving…' : <><Save className="h-4 w-4" /> Save Inspection</>}
      </button>
    </div>
  );
}
