import { useState } from 'react';
import type { MarketingDashboardStats, MarketingLeadDeal } from '../../../lib/types';

interface Props { stats: MarketingDashboardStats; color: string }

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

  // Extract unique filter options
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

  const inputStyle = {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid var(--samurai-border)',
    background: 'var(--samurai-card)',
    color: 'var(--samurai-text)',
    fontSize: '0.78rem',
    width: '100%',
  };

  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  return (
    <div className="sd-stack">
      {/* Header KPIs */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>Deals</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.leadsTotal}</div>
        </div>
        <div>
          <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>Pipeline</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>RM {(stats.leadsPipelineValue / 1000).toFixed(0)}K</div>
        </div>
        <div>
          <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>Contacts</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.leadsContacts} / {stats.leadsDeals.length}</div>
        </div>
      </div>

      {/* Filter row 1: text searches */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <input style={inputStyle} placeholder="Search contact..." value={searchContact} onChange={(e) => setSearchContact(e.target.value)} />
        <input style={inputStyle} placeholder="Search deal..." value={searchDeal} onChange={(e) => setSearchDeal(e.target.value)} />
        <input style={inputStyle} placeholder="Search company..." value={searchCompany} onChange={(e) => setSearchCompany(e.target.value)} />
      </div>

      {/* Filter row 2: dropdowns + value range */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <select style={selectStyle} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          {sources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)}>
          {events.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)}>
          {industries.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          {stages.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input style={inputStyle} placeholder="Min value" type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
        <input style={inputStyle} placeholder="Max value" type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
      </div>

      {/* Deals table */}
      <div className="sd-chart-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="sd-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Contact</th>
                <th>Deal</th>
                <th>Company</th>
                <th>Owner</th>
                <th>Source</th>
                <th>Event</th>
                <th>Industry</th>
                <th>Stage</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id}>
                  <td style={{ opacity: 0.5 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{d.contact}</td>
                  <td>{d.deal}</td>
                  <td>{d.company}</td>
                  <td>{d.owner}</td>
                  <td>{d.source}</td>
                  <td>{d.event}</td>
                  <td style={{ fontSize: '0.75rem' }}>{d.industry}</td>
                  <td>
                    <span style={{
                      padding: '2px 6px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                      background: d.stage === 'Lead' ? '#6366f120' : '#22c55e20',
                      color: d.stage === 'Lead' ? '#6366f1' : '#22c55e',
                    }}>
                      {d.stage}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{d.value !== null ? `RM ${d.value.toLocaleString()}` : '—'}</td>
                  <td style={{ fontSize: '0.78rem', opacity: 0.7 }}>{d.date}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', opacity: 0.5 }}>No deals match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
