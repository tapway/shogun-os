import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, SquarePen, Trash2, LoaderCircle, X } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type { BevZone } from '../../../lib/types';
import { BevZoneFormModal } from './BevZoneFormModal';

interface Props {
  dept: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const DANGER = 'var(--samurai-danger)';

export function BevZonesTab({ dept, color }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editZone, setEditZone] = useState<BevZone | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['bev-zones', dept],
    queryFn: () => departmentsApi.bevZonesList(dept),
    refetchInterval: 60_000,
  });

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMut = useMutation({
    mutationFn: (zone: BevZone) => departmentsApi.bevZoneDelete(dept, zone.zoneId),
    onSuccess: () => {
      setDeleteError(null);
      qc.invalidateQueries({ queryKey: ['bev-zones', dept] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Delete failed. Please try again.';
      setDeleteError(msg);
    },
  });

  const zones = query.data?.zones ?? [];

  const handleDelete = (zone: BevZone) => {
    if (!confirm(`Delete zone "${zone.name}"? This cannot be undone.`)) return;
    deleteMut.mutate(zone);
  };

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <LoaderCircle className="h-7 w-7 animate-spin" style={{ color: MUTED }} />
        <p>Loading zones…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="sd-empty">
        <MapPin className="h-10 w-10" style={{ color: MUTED }} />
        <h2>BEV service unavailable</h2>
        <p>Cannot connect to the BEV microservice. Check that it is running.</p>
      </div>
    );
  }

  return (
    <div className="sd-stack">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 className="sd-chart-title" style={{ fontSize: '1.1rem' }}>BEV Zones</h3>
          <p className="sd-chart-sub">Configure zones, floor plans, ROIs, and tripwires for Bird's Eye View</p>
        </div>
        <button
          onClick={() => { setEditZone(null); setShowModal(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.85rem',
            borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500,
            background: color, color: '#fff', transition: 'opacity 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Plus className="h-4 w-4" />
          New Zone
        </button>
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem',
          background: 'var(--samurai-danger-bg, #fee2e2)', color: DANGER,
          border: `1px solid ${DANGER}`, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <X className="h-4 w-4" style={{ flexShrink: 0 }} />
          {deleteError}
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: DANGER, display: 'flex' }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Zone cards */}
      {zones.length === 0 ? (
        <div className="sd-empty" style={{ padding: '40px 0' }}>
          <MapPin className="h-12 w-12" style={{ color: MUTED, opacity: 0.5 }} />
          <p>No zones configured yet.</p>
          <button
            onClick={() => { setEditZone(null); setShowModal(true); }}
            style={{ marginTop: 8, fontSize: '0.85rem', background: 'none', border: 'none', color, cursor: 'pointer', fontWeight: 500 }}
          >
            Create your first zone
          </button>
        </div>
      ) : (
        <div className="sd-stack" style={{ gap: 8 }}>
          {zones.map((zone: BevZone) => (
            <div
              key={zone.zoneId}
              className="sd-chart-card"
              style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: TEXT, fontSize: '0.95rem' }}>{zone.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span className="sd-chip muted" style={{ fontSize: '0.65rem' }}>
                    {zone.calibrationType || 'cartesian'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: MUTED }}>
                    {zone.cameraIds?.length || 0} cameras
                  </span>
                  <span style={{ fontSize: '0.65rem', color: MUTED, fontFamily: 'monospace', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {zone.zoneId}
                  </span>
                </div>
                {zone.cameraIds && zone.cameraIds.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {zone.cameraIds.map((cam) => (
                      <span
                        key={cam}
                        style={{
                          fontSize: '0.6rem', fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
                          background: SURFACE_2, color: MUTED, border: `1px solid ${BORDER}`,
                        }}
                      >
                        {cam}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => { setEditZone(zone); setShowModal(true); }}
                  title="Edit zone"
                  style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: MUTED }}
                  onMouseOver={(e) => { e.currentTarget.style.background = SURFACE_2; e.currentTarget.style.color = color; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = MUTED; }}
                >
                  <SquarePen className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(zone)}
                  title="Delete zone"
                  disabled={deleteMut.isPending}
                  style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: MUTED }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--samurai-danger-bg, rgba(220,38,38,0.1))'; e.currentTarget.style.color = DANGER; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = MUTED; }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <BevZoneFormModal
          dept={dept}
          color={color}
          initial={editZone}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ['bev-zones', dept] });
          }}
        />
      )}
    </div>
  );
}
