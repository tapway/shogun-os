import { useState, useMemo } from 'react';
import { MapPin, Building2, Warehouse, Briefcase, TreePine, Factory, Plus, Search, Filter, Clock, AlertTriangle, ChevronRight, X, User } from 'lucide-react';
import type { FacilityStats, FacilityLocation } from '../../../lib/types';
import { MOCK_LOCATIONS, computeMockStats } from '../../../lib/facilityMockData';

interface Props {
  stats: FacilityStats;
  color: string;
  department: string;
  onInspect: (locationId: string) => void;
  onChanged: () => void;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const DANGER = 'var(--samurai-danger)';
const OK = 'var(--samurai-ok)';
const WARNING = 'var(--samurai-warning)';

const LOCATION_TYPES = ['all', 'factory_floor', 'hostel', 'canteen', 'toilet', 'warehouse', 'workshop', 'parking', 'construction', 'office', 'clinic'] as const;
const STATUS_FILTERS = ['all', 'active', 'inactive', 'archived'] as const;

const TYPE_ICONS: Record<string, typeof MapPin> = {
  factory_floor: Factory,
  hostel: Building2,
  canteen: Briefcase,
  toilet: MapPin,
  warehouse: Warehouse,
  workshop: Factory,
  parking: MapPin,
  construction: TreePine,
  office: Briefcase,
  clinic: Building2,
  other: MapPin,
};

function scoreColor(score: number): string {
  if (score >= 80) return OK;
  if (score >= 60) return WARNING;
  return DANGER;
}

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function FacilityLocationsTab({ stats, color, department, onInspect, onChanged }: Props) {
  const [locations] = useState(MOCK_LOCATIONS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<FacilityLocation | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<string>('quarters');
  const [formFreq, setFormFreq] = useState('30');
  const [formResponsible, setFormResponsible] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return locations.filter((loc) => {
      if (typeFilter !== 'all' && loc.location_type !== typeFilter) return false;
      if (statusFilter !== 'all' && loc.status !== statusFilter) return false;
      if (search && !loc.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [locations, typeFilter, statusFilter, search]);

  function openAdd() {
    setEditingLocation(null);
    setFormName('');
    setFormType('quarters');
    setFormFreq('30');
    setFormResponsible('');
    setFormAddress('');
    setFormNotes('');
    setShowModal(true);
  }

  function openEdit(loc: FacilityLocation) {
    setEditingLocation(loc);
    setFormName(loc.name);
    setFormType(loc.location_type);
    setFormFreq(String(loc.inspection_frequency === 'daily' ? 1 : loc.inspection_frequency === 'weekly' ? 7 : loc.inspection_frequency === 'biweekly' ? 14 : loc.inspection_frequency === 'monthly' ? 30 : 90));
    setFormResponsible(loc.responsible_person || '');
    setFormAddress('');
    setFormNotes(loc.notes || '');
    setShowModal(true);
  }

  async function handleSave() {
    // No-op for mock data - just close modal
    console.log('Mock save:', { formName, formType, formFreq });
    setShowModal(false);
  }

  return (
    <div className="sd-stack">
      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search className="h-4 w-4" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: MUTED }} />
          <input
            className="sd-input"
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
        <select
          className="sd-input"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ minWidth: '130px' }}
        >
          {LOCATION_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <select
          className="sd-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: '130px' }}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
        <button className="sd-btn sd-btn-primary" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Location
        </button>
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div className="sd-empty">
          <MapPin className="h-10 w-10" style={{ color: MUTED }} />
          <h2>No Locations Found</h2>
          <p>Add your first facility location to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {filtered.map((loc) => {
            const Icon = TYPE_ICONS[loc.location_type as keyof typeof TYPE_ICONS] || MapPin;
            const freqDays: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };
            const isOverdue = loc.last_inspection_date
              ? (Date.now() - new Date(loc.last_inspection_date).getTime()) / 86400000 > (freqDays[loc.inspection_frequency] || 30)
              : true;

            return (
              <div
                key={loc.id}
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  background: 'var(--samurai-surface)',
                  border: '1px solid var(--samurai-border)',
                  cursor: 'pointer',
                  transition: 'filter 0.15s',
                }}
                className="hover:brightness-105"
                onClick={() => openEdit(loc)}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: TEXT }}>{loc.name}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      background: `color-mix(in srgb, ${scoreColor(loc.last_overall_score || 0)} 15%, transparent)`,
                      color: scoreColor(loc.last_overall_score || 0),
                    }}
                  >
                    {loc.last_overall_score != null ? Math.round(loc.last_overall_score) : 'N/A'}%
                  </span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: MUTED }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock className="h-3 w-3" />
                    <span>Last inspected: {relativeTime(loc.last_inspection_date)}</span>
                    {isOverdue && (
                      <span style={{ color: DANGER, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <AlertTriangle className="h-3 w-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Frequency: {loc.inspection_frequency}</span>
                  </div>
                  {loc.responsible_person && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User className="h-3 w-3" />
                      <span>{loc.responsible_person}</span>
                    </div>
                  )}
                </div>

                {/* Inspect Button */}
                <button
                  className="sd-btn sd-btn-secondary"
                  style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.78rem', justifyContent: 'center' }}
                  onClick={(e) => { e.stopPropagation(); onInspect(String(loc.id)); }}
                >
                  Inspect →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-xl w-full max-w-lg"
            style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--samurai-border)' }}>
              <h3 style={{ fontWeight: 600, color: TEXT }}>{editingLocation ? 'Edit Location' : 'Add Location'}</h3>
              <button className="sd-btn sd-btn-ghost" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: MUTED }}>Name</label>
                <input className="sd-input w-full" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Block A Quarters" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="text-xs font-medium" style={{ color: MUTED }}>Type</label>
                  <select className="sd-input w-full" value={formType} onChange={(e) => setFormType(e.target.value)}>
                    {LOCATION_TYPES.filter((t) => t !== 'all').map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: MUTED }}>Inspection Frequency (days)</label>
                  <input className="sd-input w-full" type="number" value={formFreq} onChange={(e) => setFormFreq(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: MUTED }}>Responsible Person</label>
                <input className="sd-input w-full" value={formResponsible} onChange={(e) => setFormResponsible(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: MUTED }}>Address</label>
                <input className="sd-input w-full" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: MUTED }}>Notes</label>
                <textarea className="sd-input w-full" rows={2} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="p-4 flex justify-end gap-2" style={{ borderTop: '1px solid var(--samurai-border)' }}>
              <button className="sd-btn sd-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="sd-btn sd-btn-primary" disabled={saving || !formName.trim()} onClick={handleSave}>
                {saving ? 'Saving…' : editingLocation ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
