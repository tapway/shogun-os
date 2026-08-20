import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, X, LoaderCircle } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { BevZone } from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
  initial: BevZone | null;
  onClose: () => void;
  onSaved: () => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8,
  border: `1px solid ${BORDER}`, outline: 'none', color: TEXT, background: 'var(--samurai-surface)',
};

export function BevZoneFormModal({ dept, color, initial, onClose, onSaved }: Props) {
  const isUpdate = !!initial;
  const [name, setName] = useState(initial?.name || '');
  const [calType, setCalType] = useState(initial?.calibrationType || 'cartesian');
  const [camInput, setCamInput] = useState('');
  const [cameras, setCameras] = useState<string[]>(initial?.cameraIds || []);
  const [xMin, setXMin] = useState(String(initial?.bounds?.xMin ?? 0));
  const [yMin, setYMin] = useState(String(initial?.bounds?.yMin ?? 0));
  const [xMax, setXMax] = useState(String(initial?.bounds?.xMax ?? 50));
  const [yMax, setYMax] = useState(String(initial?.bounds?.yMax ?? 30));
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const bounds = {
        xMin: parseFloat(xMin) || 0, yMin: parseFloat(yMin) || 0,
        xMax: parseFloat(xMax) || 0, yMax: parseFloat(yMax) || 0,
      };
      if (bounds.xMax <= bounds.xMin || bounds.yMax <= bounds.yMin) {
        throw new Error('Max bounds must be greater than min bounds');
      }
      const payload = {
        name: name.trim(), calibrationType: calType, cameraIds: cameras, bounds,
        origin: { x: 'east', y: 'north' },
      };
      if (isUpdate && initial?.zoneId) {
        return departmentsApi.bevZoneUpdate(dept, initial.zoneId, payload);
      }
      return departmentsApi.bevZoneCreate(dept, { ...payload, rois: initial?.rois || [], tripwires: initial?.tripwires || [] });
    },
    onSuccess: () => onSaved(),
    onError: (e: Error) => setError(e.message || 'Failed to save zone'),
  });

  const addCamera = () => {
    const c = camInput.trim();
    if (c && !cameras.includes(c)) {
      setCameras([...cameras, c]);
      setCamInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Zone name is required'); return; }
    if (cameras.length === 0) { setError('At least one camera is required'); return; }
    mut.mutate();
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.8rem', fontWeight: 500, color: MUTED, marginBottom: 6,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--samurai-surface)', borderRadius: 16, maxWidth: 480, width: '100%',
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: TEXT }}>{isUpdate ? 'Edit Zone' : 'Create Zone'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div style={{
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--samurai-danger)', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Zone Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Zone Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse A, Jaya Checkout" style={inputStyle} required />
          </div>

          {/* Calibration Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Calibration Type</label>
            <select value={calType} onChange={(e) => setCalType(e.target.value as 'cartesian' | 'geo')} style={inputStyle}>
              <option value="cartesian">Cartesian (indoor, metres)</option>
              <option value="geo">Geo (outdoor, lat/lon) — Phase 2</option>
            </select>
          </div>

          {/* Cameras */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Cameras</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={camInput}
                onChange={(e) => setCamInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCamera(); } }}
                placeholder="Camera ID (e.g. cam-001)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={addCamera} style={{
                padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`,
                background: 'var(--samurai-surface-2)', color: TEXT, cursor: 'pointer',
              }}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {cameras.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {cameras.map((cam) => (
                  <span key={cam} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem',
                    fontFamily: 'monospace', padding: '3px 8px', borderRadius: 6, color,
                    background: `${color}1a`, border: `1px solid ${color}33`,
                  }}>
                    {cam}
                    <button type="button" onClick={() => setCameras(cameras.filter((c) => c !== cam))} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color, padding: 0, display: 'flex',
                    }}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bounds */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Zone Bounds (metres)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: MUTED }}>X Min</span>
                <input type="number" step="0.1" value={xMin} onChange={(e) => setXMin(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: MUTED }}>Y Min</span>
                <input type="number" step="0.1" value={yMin} onChange={(e) => setYMin(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: MUTED }}>X Max</span>
                <input type="number" step="0.1" value={xMax} onChange={(e) => setXMax(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: MUTED }}>Y Max</span>
                <input type="number" step="0.1" value={yMax} onChange={(e) => setYMax(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px 16px', fontSize: '0.85rem', borderRadius: 8,
              border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={mut.isPending} style={{
              flex: 1, padding: '10px 16px', fontSize: '0.85rem', borderRadius: 8, border: 'none',
              background: color, color: '#fff', cursor: 'pointer', fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: mut.isPending ? 0.6 : 1,
            }}>
              {mut.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isUpdate ? 'Save Changes' : 'Create Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
