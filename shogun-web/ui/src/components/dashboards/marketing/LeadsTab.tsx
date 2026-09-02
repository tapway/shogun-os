import { useState } from 'react';
import type { MarketingDashboardStats } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';
const CARD = 'var(--samurai-card)';

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th className="px-3 py-2.5" style={{ fontSize: '0.72rem', fontWeight: 500, color: MUTED, textAlign: align || 'left' }}>{children}</th>;
}

export function LeadsTab({ stats, color }: Props) {
  const [searchContact, setSearchContact] = useState('');
  const [searchDeal, setSearchDeal] = useState('');
  const [searchCompany, setSearchCompany] = useState('');
  const [filterSource, setFilterSource] = useState('All');
  const [filterEvent, setFilterEvent] = useState('All');
  const [filterIndustry, setFilterIndustry] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  const sources = ['All', ...Array.from(new Set(stats.leadsDeals.map((d) => d.source)))];
  const events = ['All', ...Array.from(new Set(stats.leadsDeals.map((d) => d.event)))];
  const industries = ['All', ...Array.from(new Set(stats.leadsDeals.map((d) => d.industry)))];
  const stages = ['All', ...Array.from(new Set(stats.leadsDeals.map((d) => d.stage)))];

  const filtered = stats.leadsDeals.filter((d) => {
    if (searchContact && !d.contact.toLowerCase().includes(searchContact.toLowerCase())) return false;
    if (searchDeal && !d.deal.toLowerCase().includes(searchDeal.toLowerCase())) return false;
    if (searchCompany && !d.company.toLowerCase().includes(searchCompany.toLowerCase())) return false;
    if (filterSource !== 'All' && d.source !== filterSource) return false;
    if (filterEvent !== 'All' && d.event !== filterEvent) return false;
    if (filterIndustry !== 'All' && d.industry !== filterIndustry) return false;
    if (filterStage !== 'All' && d.stage !== filterStage) return false;
    if (minValue && (d.value === null || d.value < Number(minValue))) return false;
    if (maxValue && (d.value === null || d.value > Number(maxValue))) return false;
    return true;
  });

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${BORDER}`,
    background: CARD,
    color: TEXT,
    fontSize: '0.78rem',
    width: '100%',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'auto',
  };

  return (
    <div className="sd-stack">
      {/* Header KPIs */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: MUTED }}>Deals</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT }}>{stats.leadsTotal}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: MUTED }}>Pipeline</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT }}>RM {(stats.leadsPipelineValue / 1000).toFixed(0)}K</div>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: MUTED }}>Contacts</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: TEXT }}>{stats.leadsContacts} <span style={{ fontSize: '0.85rem', color: MUTED }}>/ {stats.leadsDeals.length}</span></div>
        </div>
      </div>

      {/* Filter row 1: text searches */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        <input style={inputStyle} placeholder="Search contact..." value={searchContact} onChange={(e) => setSearchContact(e.target.value)} />
        <input style={inputStyle} placeholder="Search deal..." value={searchDeal} onChange={(e) => setSearchDeal(e.target.value)} />
        <input style={inputStyle} placeholder="Search company..." value={searchCompany} onChange={(e) => setSearchCompany(e.target.value)} />
      </div>

      {/* Filter row 2: dropdowns + value range */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        <select style={selectStyle} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
          {events.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)}>
          {industries.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input style={inputStyle} placeholder="Min value" type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
        <input style={inputStyle} placeholder="Max value" type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
      </div>

      {/* Deals table — CRM-style */}
      <div className="sd-chart-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Th align="left">#</Th>
                <Th align="left">Contact</Th>
                <Th align="left">Deal</Th>
                <Th align="left">Company</Th>
                <Th align="left">Owner</Th>
                <Th align="left">Source</Th>
                <Th align="left">Event</Th>
                <Th align="left">Industry</Th>
                <Th align="left">Stage</Th>
                <Th align="right">Value</Th>
                <Th align="left">Date</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 1 ? SURFACE_2 : undefined }}>
                  <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.78rem' }}>{i + 1}</td>
                  <td className="px-3 py-2.5" style={{ fontWeight: 600, color: TEXT }}>{d.contact}</td>
                  <td className="px-3 py-2.5 max-w-[220px] truncate" style={{ color: TEXT }} title={d.deal}>{d.deal}</td>
                  <td className="px-3 py-2.5 max-w-[180px] truncate" style={{ color: TEXT }} title={d.company}>{d.company}</td>
                  <td className="px-3 py-2.5" style={{ color: MUTED }}>{d.owner}</td>
                  <td className="px-3 py-2.5">
                    <span className="sd-chip muted" style={{ fontSize: '0.72rem' }}>{d.source}</span>
                  </td>
                  <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.78rem' }}>{d.event}</td>
                  <td className="px-3 py-2.5 max-w-[160px] truncate" style={{ color: MUTED, fontSize: '0.75rem' }} title={d.industry}>{d.industry}</td>
                  <td className="px-3 py-2.5">
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                      background: d.stage === 'Lead' ? '#6366f120' : '#22c55e20',
                      color: d.stage === 'Lead' ? '#6366f1' : '#22c55e',
                    }}>
                      {d.stage}
                    </span>
                  </td>
                  <td className="px-3 py-2.5" style={{ textAlign: 'right', color: TEXT, fontWeight: 500 }}>
                    {d.value !== null ? `RM ${d.value.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ color: MUTED, fontSize: '0.78rem' }}>{d.date}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-6" style={{ textAlign: 'center', color: MUTED }}>No deals match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
