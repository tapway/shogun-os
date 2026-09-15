import { useState } from 'react';
import { Sliders, Plus, X } from 'lucide-react';
import type { FacilityStats, FacilityTemplate } from '../../../lib/types';
import { MOCK_TEMPLATES } from '../../../lib/facilityMockData';

interface Props {
  stats: FacilityStats;
  color: string;
  department: string;
  onChanged: () => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';

export function FacilitySettingsTab({ stats, color, department, onChanged }: Props) {
  const [templates] = useState(MOCK_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<FacilityTemplate | null>(null);

  return (
    <div className="sd-stack">
      {/* ── Inspection Templates ── */}
      <div className="sd-stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: TEXT }}>Templates ({templates.length})</h3>
          <button className="sd-btn sd-btn-primary" onClick={() => console.log('New template')}>
            <Plus className="h-4 w-4" /> New Template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="sd-empty">
            <Sliders className="h-8 w-8" style={{ color: MUTED }} />
            <p>No inspection templates configured.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                style={{
                  padding: '1rem', borderRadius: '0.75rem',
                  background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)',
                  cursor: 'pointer', transition: 'filter 0.15s',
                }}
                className="hover:brightness-105"
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: TEXT, marginBottom: '0.35rem' }}>{tpl.display_name}</div>
                <div style={{ fontSize: '0.75rem', color: MUTED, marginBottom: '0.5rem' }}>
                  Type: {tpl.location_type} · {tpl.checklist.length} items
                </div>
                {tpl.expected_assets.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {tpl.expected_assets.slice(0, 5).map((a, i) => (
                      <span key={i} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '9999px', background: 'var(--samurai-surface-2)', color: MUTED }}>
                        {a}
                      </span>
                    ))}
                    {tpl.expected_assets.length > 5 && (
                      <span style={{ fontSize: '0.65rem', color: MUTED }}>+{tpl.expected_assets.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Template Detail Modal ── */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sticky top-0 z-10" style={{ background: 'var(--samurai-surface)', borderBottom: '1px solid var(--samurai-border)' }}>
              <div>
                <h3 style={{ fontWeight: 600, color: TEXT }}>{selectedTemplate.display_name}</h3>
                <p style={{ fontSize: '0.78rem', color: MUTED }}>Location Type: {selectedTemplate.location_type} · {selectedTemplate.checklist.length} checklist items</p>
              </div>
              <button className="sd-btn sd-btn-ghost" onClick={() => setSelectedTemplate(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Checklist */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: '0.5rem' }}>Checklist Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {selectedTemplate.checklist.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--samurai-surface-2)', border: '1px solid var(--samurai-border)' }}>
                      <span style={{ fontSize: '0.82rem', color: TEXT, flex: 1 }}>{item.item}</span>
                      {item.critical && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--samurai-danger)', textTransform: 'uppercase' }}>Critical</span>
                      )}
                      <span style={{ fontSize: '0.65rem', color: MUTED }}>{item.category}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Assets */}
              {selectedTemplate.expected_assets.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: MUTED, marginBottom: '0.5rem' }}>Expected Assets</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {selectedTemplate.expected_assets.map((asset, i) => (
                      <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'var(--samurai-surface-2)', color: TEXT, border: '1px solid var(--samurai-border)' }}>
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div style={{ fontSize: '0.75rem', color: MUTED, paddingTop: '0.5rem', borderTop: '1px solid var(--samurai-border)' }}>
                Min Photos: {selectedTemplate.min_photos} · Photo Guidance: {selectedTemplate.photo_guidance}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
