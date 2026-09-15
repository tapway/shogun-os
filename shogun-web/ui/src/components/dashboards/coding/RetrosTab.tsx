import { useState } from 'react';
import { MOCK_RETRO_ITEMS, type RetroItem } from './mockData';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  well: { label: 'Went Well', emoji: '✅', color: '#10b981' },
  improve: { label: 'Needs Improvement', emoji: '⚠️', color: '#f59e0b' },
  action: { label: 'Action Items', emoji: '🎯', color: '#3b82f6' },
};

interface Props {
  dept: string;
  color: string;
}

export function RetrosTab({ dept, color }: Props) {
  const [items, setItems] = useState(MOCK_RETRO_ITEMS);
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<RetroItem['category']>('well');
  const [filterCategory, setFilterCategory] = useState<'all' | RetroItem['category']>('all');

  const filtered = items.filter(i => filterCategory === 'all' || i.category === filterCategory);

  const addVote = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, votes: item.votes + 1 } : item));
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItem: RetroItem = {
      id: `r${Date.now()}`,
      category: newItemCategory,
      text: newItemText.trim(),
      votes: 0,
      sprint: 'SP-24',
    };
    setItems(prev => [...prev, newItem]);
    setNewItemText('');
  };

  const groupedByCategory = (['well', 'improve', 'action'] as const).map(cat => ({
    ...CATEGORY_CONFIG[cat],
    id: cat,
    items: filtered.filter(i => i.category === cat).sort((a, b) => b.votes - a.votes),
  }));

  return (
    <div className="sd-stack" style={{ gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: TEXT }}>Sprint 23 Retrospective</h3>
          <div style={{ fontSize: '0.72rem', color: MUTED }}>Aug 18 – Aug 31, 2026</div>
        </div>
        <button className="sd-btn sd-btn-secondary" style={{ fontSize: '0.75rem' }}>📄 Export to gbrain</button>
      </div>

      {/* Add New Item */}
      <div className="sd-card" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={newItemCategory}
          onChange={e => setNewItemCategory(e.target.value as RetroItem['category'])}
          style={{ background: 'var(--samurai-surface-2)', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
        >
          <option value="well">✅ Went Well</option>
          <option value="improve">⚠️ Improve</option>
          <option value="action">🎯 Action</option>
        </select>
        <input
          type="text"
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add a retro item..."
          style={{ flex: 1, minWidth: 150, background: 'var(--samurai-surface-2)', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 10px', fontSize: '0.78rem' }}
        />
        <button className="sd-btn sd-btn-primary" style={{ fontSize: '0.75rem' }} onClick={addItem} disabled={!newItemText.trim()}>Add</button>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => setFilterCategory('all')}
          style={{
            padding: '4px 12px', borderRadius: 999, fontSize: '0.72rem', cursor: 'pointer',
            border: `1px solid ${filterCategory === 'all' ? color : BORDER}`,
            background: filterCategory === 'all' ? `${color}18` : 'transparent',
            color: filterCategory === 'all' ? color : MUTED,
          }}
        >
          All
        </button>
        {(Object.entries(CATEGORY_CONFIG) as [RetroItem['category'], typeof CATEGORY_CONFIG[string]][]).map(([id, cfg]) => (
          <button
            key={id}
            onClick={() => setFilterCategory(id)}
            style={{
              padding: '4px 12px', borderRadius: 999, fontSize: '0.72rem', cursor: 'pointer',
              border: `1px solid ${filterCategory === id ? cfg.color : BORDER}`,
              background: filterCategory === id ? `${cfg.color}18` : 'transparent',
              color: filterCategory === id ? cfg.color : MUTED,
            }}
          >
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>

      {/* Retro Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {groupedByCategory.map(group => (
          <div key={group.id} className="sd-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '1rem' }}>{group.emoji}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: group.color }}>{group.label}</span>
              <span style={{ fontSize: '0.68rem', color: MUTED, marginLeft: 'auto' }}>{group.items.length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.items.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '8px 10px', borderRadius: 6,
                    background: 'var(--samurai-surface-2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8,
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: TEXT, lineHeight: 1.4, flex: 1 }}>{item.text}</span>
                  <button
                    onClick={() => addVote(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 99,
                      padding: '2px 8px', cursor: 'pointer', fontSize: '0.68rem',
                      color: MUTED, transition: 'all 150ms', flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}
                  >
                    👍 {item.votes}
                  </button>
                </div>
              ))}
              {group.items.length === 0 && (
                <div style={{ padding: 12, textAlign: 'center', fontSize: '0.72rem', color: MUTED, fontStyle: 'italic' }}>
                  No items yet
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
