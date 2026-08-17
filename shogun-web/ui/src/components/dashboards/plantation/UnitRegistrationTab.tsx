import { useState } from 'react';
import { Plus, Trash2, Loader2, Home } from 'lucide-react';

export function UnitRegistrationTab() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ site_name: '', block_name: '', unit_number: '', capacity: 1, unit_type: 'single' });

  const loadUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/departments/facility/dashboard/site-units');
      const data = await res.json();
      setUnits(data.units || []);
    } catch { setUnits([]); }
    finally { setLoading(false); }
  };

  useState(() => { loadUnits(); });

  const handleCreate = async () => {
    if (!form.site_name || !form.block_name || !form.unit_number) return;
    try {
      const res = await fetch('/api/departments/facility/dashboard/site-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowForm(false); setForm({ site_name: '', block_name: '', unit_number: '', capacity: 1, unit_type: 'single' }); loadUnits(); }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this unit and all its inspection records?')) return;
    await fetch(`/api/departments/facility/dashboard/site-units/${id}`, { method: 'DELETE' });
    loadUnits();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>Registered Units</h3>
        <button className="sd-btn sd-btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Unit
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--samurai-surface)', border: '1px solid var(--samurai-border)' }}>
          <div className="grid grid-cols-3 gap-3">
            <input className="sd-input" style={{ background: 'var(--samurai-surface-2)', color: 'var(--samurai-text)' }} placeholder="Site name" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
            <input className="sd-input" style={{ background: 'var(--samurai-surface-2)', color: 'var(--samurai-text)' }} placeholder="Block" value={form.block_name} onChange={(e) => setForm({ ...form, block_name: e.target.value })} />
            <input className="sd-input" style={{ background: 'var(--samurai-surface-2)', color: 'var(--samurai-text)' }} placeholder="Unit #" value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="sd-input" style={{ background: 'var(--samurai-surface-2)', color: 'var(--samurai-text)' }} type="number" min={1} placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })} />
            <select className="sd-input" style={{ background: 'var(--samurai-surface-2)', color: 'var(--samurai-text)' }} value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value })}>
              <option value="single">Single</option>
              <option value="family">Family</option>
              <option value="dormitory">Dormitory</option>
            </select>
          </div>
          <button className="sd-btn sd-btn-primary" onClick={handleCreate}>Register Unit</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--samurai-muted)' }} /></div>
      ) : units.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--samurai-muted)' }}>
          <Home className="h-8 w-8 mx-auto mb-2" style={{ opacity: 0.3 }} />
          <p className="text-sm">No units registered yet. Click "Add Unit" to start.</p>
        </div>
      ) : (
        <div className="sd-grid sd-dept-grid">
          {units.map((u) => (
            <div key={u.id} className="sd-card" style={{ background: 'var(--samurai-surface)' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--samurai-text)' }}>{u.block_name} — {u.unit_number}</div>
                  <div className="text-xs" style={{ color: 'var(--samurai-muted)' }}>{u.site_name}</div>
                </div>
                <button onClick={() => handleDelete(u.id)} className="text-xs" style={{ color: 'var(--samurai-danger)' }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-2 text-xs" style={{ color: 'var(--samurai-muted)' }}>
                <span className="sd-chip muted">Cap: {u.capacity}</span>
                <span className="sd-chip muted">{u.unit_type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
