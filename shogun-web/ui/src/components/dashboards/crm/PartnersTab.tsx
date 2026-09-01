import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type {
  CrmDealListItem,
  PartnerSphereData,
  PartnerSphereOverview,
  PartnerSphereProfile,
  PartnerSphereCommandCenter,
  PartnerSphereProtection,
  PartnerSphereOnboarding,
  PartnerSphereQbr,
  PartnerSphereCeoDigest,
  PartnerSpherePricing,
} from '../../../lib/types';

interface Props {
  dept: string;
  color: string;
}

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const SURFACE = 'var(--samurai-surface)';
const SURFACE_2 = 'var(--samurai-surface-2)';
const BORDER = 'var(--samurai-border)';

/* ------------------------------------------------------------------ */
/* tiny primitives                                                     */
/* ------------------------------------------------------------------ */

const TIER_TONES: Record<string, string> = {
  PLATINUM: 'var(--samurai-accent, #c9a24b)',
  GOLD: '#d4a017',
  SILVER: '#8a94a6',
  REFERRAL: '#5a9bd4',
  'NEW — ONBOARDING': '#e0a83f',
};

function PillarRow({ label, value, color, max = 100 }: { label: string; value?: number | null; color: string; max?: number }) {
  if (value === undefined || value === null) {
    return <span>{label} <b style={{ color: MUTED, float: 'right' }}>—</b></span>;
  }
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  return (
    <span>
      {label} <b style={{ color: TEXT, float: 'right' }}>{value}{max !== 100 ? `/${max}` : ''}</b>
      <span style={{ display: 'block', height: 4, background: SURFACE_2, borderRadius: 3, overflow: 'hidden', clear: 'both' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </span>
    </span>
  );
}

function heatCell(v: number, max: number, color: string): React.CSSProperties {
  const alpha = 0.18 + 0.82 * Math.min(v / Math.max(max, 1), 1);
  return {
    textAlign: 'center',
    padding: '9px 4px',
    borderRadius: 6,
    background: `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, var(--samurai-surface-2, #1b2438))`,
    color: alpha > 0.45 ? '#fff' : TEXT,
    fontWeight: 600,
  };
}

function Card({ title, subtitle, children, pad = 20 }: {
  title?: string; subtitle?: string; children: React.ReactNode; pad?: number;
}) {
  return (
    <div className="sd-card" style={{ padding: pad }}>
      {title && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: TEXT }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.76rem', color: MUTED, marginTop: 2 }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Kpi({ label, value, note, accent }: {
  label: string; value: string; note?: string; accent?: string;
}) {
  return (
    <div className="sd-kpi-card" style={{ padding: 14 }}>
      <div className="sd-kpi-value" style={{ color: accent || TEXT }}>{value}</div>
      <div className="sd-kpi-label" style={{ marginTop: 4 }}>{label}</div>
      {note && <div className="sd-kpi-sub" style={{ marginTop: 3 }}>{note}</div>}
    </div>
  );
}

function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent' }) {
  const bg: Record<string, string> = {
    neutral: SURFACE_2, good: 'rgba(52,199,123,0.14)', warn: 'rgba(255,179,64,0.16)',
    bad: 'rgba(255,69,58,0.16)', accent: 'rgba(0,122,255,0.14)',
  };
  const fg: Record<string, string> = {
    neutral: MUTED, good: '#34c77b', warn: '#ffb340', bad: '#ff453a', accent: '#0a84ff',
  };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: '0.7rem',
      fontWeight: 500, background: bg[tone], color: fg[tone], whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}

function StatLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: '0.8rem', color: MUTED }}>{label}</span>
      <span style={{ fontSize: '0.82rem', color: muted ? MUTED : TEXT, fontWeight: muted ? 400 : 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function Btn({ children, onClick, primary, disabled }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={primary ? 'sd-btn' : 'sd-btn-ghost'}
      style={{ fontSize: '0.78rem', ...(disabled ? { opacity: 0.5, cursor: 'default' } : {}) }}
    >{children}</button>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Overview                                                         */
/* ------------------------------------------------------------------ */

export function SphereOverview({ data, color }: { data: PartnerSphereOverview; color: string }) {
  return (
    <div className="sd-stack">
      {data.aiBrief && (
        <Card title="🤖 AI Daily Brief — TPS" subtitle={data.aiBrief.date}>
          <div className="sd-kpi-grid" style={{ marginBottom: 12 }}>
            {data.aiBrief.kpis.map((k) => (
              <Kpi key={k.label} label={k.label} value={k.value} note={k.delta} accent={color} />
            ))}
          </div>
          <p style={{ fontSize: '0.85rem', color: TEXT, lineHeight: 1.6 }}>{data.aiBrief.narrative}</p>
          <div style={{ marginTop: 8, fontSize: '0.8rem', color: MUTED }}>
            Today's priorities: {data.aiBrief.priorities.join(' · ')}
          </div>
        </Card>
      )}

      <div className="sd-kpi-grid">
        {data.kpis.map((k) => <Kpi key={k.label} label={k.label} value={k.value} note={k.note} accent={color} />)}
      </div>

      <Card title="🧭 Account Manager Coverage">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {data.amCoverage.map((am) => (
            <div key={am.am} style={{ background: SURFACE_2, borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600, color: TEXT, fontSize: '0.9rem' }}>{am.am}</span>
                <span style={{ fontSize: '0.78rem', color }}>{am.pipeline} · {am.deals} deals</span>
              </div>
              <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: '0.78rem', color: MUTED, listStyle: 'disc' }}>
                {(am.notes ?? []).map((n) => <li key={n} style={{ margin: '3px 0' }}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title="🏅 Tier Board" subtitle="Referral · Silver · Gold · Platinum (per Partner Tiering framework)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          {data.tierBoard.map((group) => {
            const tone = TIER_TONES[group.tier] ?? color;
            return group.partners.map((p) => (
              <div key={p.name} style={{ background: SURFACE_2, border: `1px solid ${BORDER}`, borderTop: `3px solid ${tone}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.08em', color: tone }}>{group.tier}</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: TEXT }}>{p.score}<span style={{ fontSize: '0.68rem', color: MUTED }}>/100</span></span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: TEXT, marginTop: 2 }}>{p.name}</div>
                <div style={{ fontSize: '0.73rem', color: MUTED }}>{p.regions}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.72rem', color: MUTED, marginTop: 10 }}>
                  <PillarRow label="Activity" value={p.pillars.activity} color={color} />
                  <PillarRow label="Pipeline" value={p.pillars.pipeline} color={color} />
                  <PillarRow label="POC Craft" value={p.pillars.pocCraft} color={color} />
                  <PillarRow label="Closure" value={p.pillars.closure} color={color} />
                </div>
                <div style={{ marginTop: 9, fontSize: '0.72rem', padding: '4px 8px', borderRadius: 6, background: SURFACE, color: TEXT, fontWeight: 600 }}>{p.archetype}</div>
              </div>
            ));
          })}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <Card title="🔻 Lifecycle Funnel" subtitle="All Partners (YTD 2026)">
          {(() => {
            const max = Math.max(...data.funnel.map((f) => f.count), 1);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.funnel.map((f) => (
                  <div key={f.stage} style={{ display: 'grid', gridTemplateColumns: '104px 1fr 104px', alignItems: 'center', gap: 10, fontSize: '0.78rem' }}>
                    <span style={{ color: MUTED, textAlign: 'right' }}>{f.stage}</span>
                    <div style={{ background: SURFACE_2, borderRadius: 6, height: 26, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max((f.count / max) * 100, 7)}%`, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10, color: '#fff', fontWeight: 600, fontSize: '0.72rem', minWidth: 34, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 72%, transparent))` }}>
                        {f.count}{f.pct ? ` · ${f.pct}` : ''}
                      </div>
                    </div>
                    <span style={{ color: MUTED, fontSize: '0.7rem' }}>{f.note ?? ''}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>

        <Card title="⚗️ Per-partner leak points">
          {data.leakPoints.map((l) => (
            <div key={l.partner} style={{ padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontWeight: 500, fontSize: '0.82rem', color: TEXT }}>{l.partner}</div>
              <div style={{ fontSize: '0.76rem', color: MUTED }}>{l.drop} → <span style={{ color }}>{l.action}</span></div>
            </div>
          ))}
        </Card>
      </div>

      <Card title="🥁 Battle Log" subtitle="recent partner activity">
        <div className="sd-stack" style={{ gap: 6 }}>
          {data.battleLog.map((b) => (
            <div key={b.day + b.action} style={{ display: 'flex', gap: 10, fontSize: '0.8rem', alignItems: 'baseline' }}>
              <span style={{ color: MUTED, minWidth: 52 }}>{b.day}</span>
              <span style={{ color, fontWeight: 500, minWidth: 110 }}>{b.partner}</span>
              <span style={{ color: TEXT }}>{b.action}</span>
            </div>
          ))}
        </div>
      </Card>

      {data.cohortGrid && (() => {
        const g = data.cohortGrid;
        const maxQ = Math.max(...g.rows.flatMap((r) => r.quarters), 1);
        return (
          <Card title="📈 Quarterly Cohort Grid" subtitle="deals won per quarter since onboarding (Q1 = first quarter of life)">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 3, width: '100%', minWidth: 520, fontSize: '0.72rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: MUTED, fontWeight: 600, padding: 4 }}>Partner</th>
                    {g.columns.map((col) => <th key={col} style={{ color: MUTED, fontWeight: 600, padding: 4, textAlign: 'center' }}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.partner}>
                      <td style={{ background: 'none', color: TEXT, fontWeight: 600, textAlign: 'left', padding: '9px 2px', whiteSpace: 'nowrap' }}>{r.partner}</td>
                      {g.columns.map((col, idx) => {
                        if (idx === 0) return <td key={col} style={heatCell(r.lifetime, maxQ, color)}>{r.lifetime}</td>;
                        if (idx === 1) return <td key={col} style={{ textAlign: 'center', padding: '9px 4px', borderRadius: 6, background: SURFACE_2, color: MUTED, fontWeight: 500, whiteSpace: 'nowrap' }}>{r.onboardQ}</td>;
                        const v = r.quarters[idx - 2];
                        if (v === undefined) return <td key={col} style={{ textAlign: 'center', padding: '9px 4px', borderRadius: 6, background: SURFACE_2, color: MUTED, fontWeight: 600 }}>·</td>;
                        return <td key={col} style={heatCell(v, maxQ, color)}>{v}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '0.74rem', color: MUTED, marginTop: 8 }}>{g.caption}</p>
          </Card>
        );
      })()}

      <Card title="📦 Open Partner Pipeline" subtitle="stall detection & next-step coverage">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640, fontSize: '0.8rem' }}>
            <thead><tr>{['Partner', 'Open Deals', 'Open Value', 'Weighted', 'Stalled >21d', 'Next-step coverage', 'Status'].map((h) => (
              <th key={h} style={{ padding: '7px 10px', color: MUTED, fontWeight: 500, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {data.openPipeline.map((r) => (
                <tr key={r.partner} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '7px 10px', color: TEXT, fontWeight: 500 }}>{r.partner}</td>
                  <td style={{ padding: '7px 10px', color: TEXT }}>{r.openDeals}</td>
                  <td style={{ padding: '7px 10px', color: TEXT }}>{r.openValue}</td>
                  <td style={{ padding: '7px 10px', color: MUTED }}>{r.weighted}</td>
                  <td style={{ padding: '7px 10px', color: r.stalled > 0 ? '#ffb340' : MUTED }}>{r.stalled}</td>
                  <td style={{ padding: '7px 10px', color: TEXT }}>{r.nextStepCoverage}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <Pill text={r.status} tone={r.status === 'HEALTHY' || r.status === 'RAMPING' ? 'good' : r.status === 'AT RISK' ? 'bad' : 'warn'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {data.hygiene && (
        <Card title="🧾 Registration Hygiene" subtitle="since form automation went live (24 Aug)">
          <div className="sd-kpi-grid">
            <Kpi label="Via Form (auto)" value={String(data.hygiene.viaForm)} note={data.hygiene.viaFormNote} />
            <Kpi label="Via Chat (manual)" value={String(data.hygiene.viaChat)} note={data.hygiene.viaChatNote} />
            <Kpi label="Form Data Completeness" value={data.hygiene.completeness} note={data.hygiene.completenessNote} />
            <Kpi label="Duplicate Conflicts" value={String(data.hygiene.duplicates)} note={data.hygiene.duplicatesNote} />
          </div>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Master List (roster)                                             */
/* ------------------------------------------------------------------ */

const REGION_TOKENS: Record<string, string[]> = {
  Malaysia: ['my', 'malaysia'],
  Singapore: ['sg', 'singapore'],
  Indonesia: ['id', 'indonesia', 'ind'],
  India: ['india', 'in'],
};

function regionOf(regions: string): string[] {
  const r = regions.toLowerCase();
  return Object.entries(REGION_TOKENS)
    .filter(([, toks]) => toks.some((t) => r.includes(t)))
    .map(([label]) => label);
}

function SphereMasterList({ data, color }: { data: PartnerSphereData['masterList']; color: string }) {
  const [tier, setTier] = useState('All');
  const [am, setAm] = useState('All');
  const [status, setStatus] = useState('All');
  const [region, setRegion] = useState('All');

  const tiers = ['All', ...Array.from(new Set(data.map((p) => p.tier)))];
  const ams = ['All', ...Array.from(new Set(data.map((p) => p.am)))];
  const statuses = ['All', ...Array.from(new Set(data.map((p) => p.status)))];
  const regions = ['All', ...Array.from(new Set(data.flatMap((p) => regionOf(p.regions))))];
  const rows = data.filter((p) =>
    (tier === 'All' || p.tier === tier) &&
    (am === 'All' || p.am === am) &&
    (status === 'All' || p.status === status) &&
    (region === 'All' || regionOf(p.regions).includes(region)),
  );

  return (
    <div className="sd-stack">
      <Card title="📇 Partner Master List" subtitle={`The directory of every partner — tags drive the filters · showing ${rows.length} of ${data.length} partners`}>
        <div className="sd-stack" style={{ gap: 10 }}>
          {[{ label: 'Tier', opts: tiers, val: tier, set: setTier },
            { label: 'AM', opts: ams, val: am, set: setAm },
            { label: 'Status', opts: statuses, val: status, set: setStatus },
            { label: 'Region', opts: regions, val: region, set: setRegion }].map((f) => (
            <div key={f.label} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.76rem', color: MUTED, minWidth: 42 }}>{f.label}</span>
              {f.opts.map((o) => (
                <button key={o} onClick={() => f.set(o)}
                  style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: '0.74rem', cursor: 'pointer',
                    border: `1px solid ${f.val === o ? color : BORDER}`,
                    background: f.val === o ? 'rgba(0,122,255,0.12)' : 'transparent',
                    color: f.val === o ? color : MUTED,
                  }}>{o}</button>
              ))}
            </div>
          ))}
        </div>
        <div style={{ overflowX: 'auto', marginTop: 14 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900, fontSize: '0.78rem' }}>
            <thead><tr>{['Partner', 'Tier', 'AM', 'Status', 'Industry / Tags', 'Open deals', 'Pipeline', 'Licences', 'Score', 'Last activity'].map((h) => (
              <th key={h} style={{ padding: '7px 10px', color: MUTED, fontWeight: 500, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.name} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 10px', color: TEXT }}>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED }}>{p.regions} {p.since}</div>
                  </td>
                  <td style={{ padding: '8px 10px' }}><Pill text={p.tier} tone={p.tier === 'Platinum' ? 'accent' : p.tier === 'Onboarding' ? 'warn' : 'neutral'} /></td>
                  <td style={{ padding: '8px 10px', color: TEXT }}>
                    <span style={{ fontWeight: 600, color }}>{p.amInitials}</span> <span style={{ color: MUTED }}>· {p.am}</span>
                  </td>
                  <td style={{ padding: '8px 10px', color: TEXT, fontSize: '0.78rem' }}>{p.statusFlag} {p.status}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{(p.tags ?? []).map((t) => <Pill key={t} text={t} />)}</div>
                  </td>
                  <td style={{ padding: '8px 10px', color: TEXT }}>{p.openDeals}</td>
                  <td style={{ padding: '8px 10px', color }}>{p.pipeline}</td>
                  <td style={{ padding: '8px 10px', color: TEXT }}>{p.licences}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontWeight: 700, color: p.score >= 80 ? '#34c77b' : p.score >= 60 ? color : p.score === 0 ? MUTED : '#ffb340' }}>{p.score}</span>
                  </td>
                  <td style={{ padding: '8px 10px', color: MUTED }}>{p.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Btn>📞 Log call</Btn><Btn>➕ Task</Btn>
        </div>
      </Card>
    </div>
  );
  }

  /* ------------------------------------------------------------------ */
  /* Partner Profile Selector (search + select, then show profile)       */
  /* ------------------------------------------------------------------ */

  function PartnerProfileSelector({ 
    masterList, 
    profileData, 
    color 
  }: { 
    masterList: PartnerSphereData['masterList']; 
    profileData: PartnerSphereProfile | null; 
    color: string;
  }) {
    const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Filter partners by search
    const filteredPartners = masterList.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.tier.toLowerCase().includes(search.toLowerCase())
    );

    // If no partner selected, show the selector
    if (!selectedPartner) {
      return (
        <div className="sd-stack" style={{ gap: 16 }}>
          <Card title="🤝 Partner Profile" subtitle="Look up any partner's live profile, deals and AI assessment.">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.85rem', color: MUTED, marginBottom: 8 }}>
                🔍 Select a partner · {masterList.length} partners · searchable
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search partners…"
                  style={{
                    width: '100%',
                    padding: '10px 36px 10px 14px',
                    fontSize: '0.9rem',
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                    outline: 'none',
                    color: TEXT,
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: MUTED,
                      fontSize: '1rem',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Partner list */}
            <div style={{ 
              maxHeight: 500, 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              {filteredPartners.map((partner) => (
                <div
                  key={partner.name}
                  onClick={() => setSelectedPartner(partner.name)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: `1px solid ${BORDER}`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = BORDER}
                >
                  <span style={{ fontWeight: 500, color: TEXT }}>{partner.name}</span>
                  <Pill text={partner.tier} tone={partner.tier === 'Platinum' ? 'accent' : 'neutral'} />
                </div>
              ))}
              {filteredPartners.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: MUTED }}>
                  No partners found matching "{search}"
                </div>
              )}
            </div>
          </Card>
        </div>
      );
    }

    // Find the selected partner in masterList
    const partnerInfo = masterList.find(p => p.name === selectedPartner);

    // Show the profile with change partner option
    return (
      <div className="sd-stack" style={{ gap: 16 }}>
        {/* Header with change partner button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: TEXT, margin: 0 }}>
              {selectedPartner}
            </h2>
            {partnerInfo && (
              <div style={{ fontSize: '0.85rem', color: MUTED, marginTop: 4 }}>
                {partnerInfo.regions} · AM: {partnerInfo.am} · {partnerInfo.openDeals} deals all-time · {partnerInfo.lastActivity}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {partnerInfo && <Pill text={partnerInfo.tier} tone={partnerInfo.tier === 'Platinum' ? 'accent' : 'neutral'} />}
              {partnerInfo && <Pill text={partnerInfo.status} tone="good" />}
            </div>
          </div>
          <button
            onClick={() => setSelectedPartner(null)}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              color: color,
              background: 'transparent',
              border: `1px solid ${color}`,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            ⇄ Change partner
          </button>
        </div>

        {/* Show the existing SphereProfile component if we have data */}
        {profileData ? (
          <SphereProfile data={profileData} color={color} />
        ) : (
          <Card>
            <div style={{ padding: 20, textAlign: 'center', color: MUTED }}>
              Profile data not available for this partner
            </div>
          </Card>
        )}
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* 3. Partner Profile (Syspex)                                         */
  /* ------------------------------------------------------------------ */

  function SphereProfile({ data, color }: { data: PartnerSphereProfile; color: string }) {
    return (
      <div className="sd-stack">
        <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill text={data.header.tier} tone="accent" />
          <Pill text={data.header.discount} tone="good" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: TEXT }}>{data.header.name}</div>
            <div style={{ fontSize: '0.78rem', color: MUTED }}>
              {data.header.regions} {data.header.onboarded} · {data.header.contact} · {data.header.owner}
            </div>
            <div style={{ fontSize: '0.78rem', color: MUTED }}>{data.header.certifications} · {data.header.cadence}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{data.score.value}<span style={{ fontSize: '0.85rem', color: MUTED }}>/100</span></div>
            <div style={{ fontSize: '0.76rem', color: MUTED }}>{data.score.delta}</div>
          </div>
        </div>
      </Card>

      <Card title="🤖 AI Daily Brief — Syspex" subtitle="auto-refreshed daily 06:00">
        <div className="sd-kpi-grid" style={{ marginBottom: 12 }}>
          {data.brief.kpis.map((k) => <Kpi key={k.label} label={k.label} value={k.value} note={k.note} accent={color} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {(data.brief.dealWatch ?? []).map((d) => (
            <div key={d.title} style={{ background: SURFACE_2, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: d.state.startsWith('✓') ? '#34c77b' : '#ffb340' }}>{d.state}</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: TEXT, marginTop: 2 }}>{d.title}</div>
              <div style={{ fontSize: '0.76rem', color: MUTED }}>{d.detail}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          {data.brief.tierHealth.map((t) => <StatLine key={t.label} label={t.label} value={t.value} />)}
          <div style={{ fontSize: '0.74rem', color: MUTED, marginTop: 6 }}>{data.brief.tierHealth[2]?.note}</div>
        </div>
      </Card>

      <Card title="📸 Active camera licences">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{data.licenceMilestones.active}</span>
          <span style={{ fontSize: '0.8rem', color: MUTED }}>{data.licenceMilestones.goal} · {data.licenceMilestones.next} · {data.licenceMilestones.credits}</span>
        </div>
      </Card>

      <div className="sd-kpi-grid">
        {data.stats.map((s) => <Kpi key={s.label} label={s.label} value={s.value} note={s.note} accent={color} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <Card title="🏛️ Score Pillars" subtitle="Activity 20 / Pipeline 25 / POC 20 / Close 35">
          {data.pillars.map((p) => (
            <PillarRow key={p.name} label={p.name} value={p.score} max={p.max} color={color} />
          ))}
          <div style={{ fontSize: '0.76rem', color: MUTED, marginTop: 10 }}>
            Archetype: <span style={{ color: TEXT, fontWeight: 600 }}>{data.archetype}</span>
          </div>
        </Card>
        <Card title="🔻 Their Funnel (all-time)">
          {(() => {
            const max = Math.max(...data.funnel.map((f) => f.count), 1);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.funnel.map((f) => (
                  <div key={f.stage} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 80px', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: MUTED, textAlign: 'right' }}>{f.stage}</span>
                    <div style={{
                      height: 22, width: `${(f.count / max) * 100}%`, minWidth: 34,
                      background: f.stage === 'Won' ? '#34c77b' : 'var(--samurai-accent, #5EA0F2)',
                      borderRadius: 4, color: '#fff', fontSize: '0.68rem', display: 'flex', alignItems: 'center', paddingLeft: 8,
                    }}>{f.count}</div>
                    <span style={{ fontSize: '0.68rem', color: MUTED }}>{f.pass ?? ''}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
        <Card title="📈 Ramp Cohort Grid" subtitle="deals won per quarter since onboarding">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '7px 10px', color: MUTED, fontWeight: 500, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}></th>
                  {data.rampCohort.columns.slice(1).map((col) => (
                    <th key={col} style={{ padding: '7px 10px', color: MUTED, fontWeight: 500, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: TEXT }}>{data.rampCohort.cells[0]}</td>
                  {data.rampCohort.cells.slice(1).map((v, i) => (
                    <td key={i} style={{ padding: '8px 10px', color: v === '—' ? MUTED : TEXT, fontWeight: v === '—' ? 400 : 600 }}>{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.74rem', color: '#34c77b', marginTop: 10 }}>{data.rampCohort.note}</p>
        </Card>
      </div>

      <Card title="Deals" subtitle="click any deal for full CRM record">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700, fontSize: '0.78rem' }}>
            <thead><tr>{['Deal', 'Stage', 'Value', 'Days in stage', 'Next step', 'Health'].map((h) => (
              <th key={h} style={{ padding: '7px 10px', color: MUTED, fontWeight: 500, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {data.deals.map((d) => (
                <tr key={d.deal} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 10px', color: TEXT, fontWeight: 500 }}>{d.deal}</td>
                  <td style={{ padding: '8px 10px', color: MUTED }}>{d.stage}</td>
                  <td style={{ padding: '8px 10px', color }}>{d.value}</td>
                  <td style={{ padding: '8px 10px', color: TEXT }}>{d.days}</td>
                  <td style={{ padding: '8px 10px', color: TEXT }}>{d.next}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <Pill text={d.health} tone={d.health === 'HEALTHY' || d.health === 'IN POC' ? 'good' : d.health === 'AT RISK' ? 'bad' : 'warn'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="🕘 Recent Activity">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {data.recentActivity.map((a) => (
            <li key={a.date + a.text} style={{ position: 'relative', paddingLeft: 22, paddingBottom: 14, borderLeft: `2px solid ${BORDER}`, marginLeft: 5 }}>
              <span style={{ position: 'absolute', left: -6, top: 5, width: 10, height: 10, borderRadius: '50%', background: color }} />
              <time style={{ display: 'block', fontSize: '0.68rem', color: MUTED }}>{a.date}</time>
              <span style={{ fontSize: '0.8rem', color: TEXT }}>{a.text}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card title="🎖️ Platinum retention requirements" subtitle="Tier Status & Commitments — per Partner Tiering framework · quarterly review">
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
            <tbody>
              {data.commitments.requirements.map((r) => (
                <tr key={r.label} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '7px 10px', color: TEXT }}>{r.label}</td>
                  <td style={{ padding: '7px 10px', color: TEXT, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.value}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    <Pill text={r.state} tone={r.state === 'OK' ? 'good' : 'warn'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="🎁 Entitlements in effect">
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
            <tbody>
              {data.commitments.entitlements.map((e) => (
                <tr key={e.label} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '7px 10px', color: TEXT }}>{e.label}</td>
                  <td style={{ padding: '7px 10px', color: TEXT, fontWeight: 600 }}>{e.value}{e.note ? <span style={{ color: MUTED, fontWeight: 400, fontSize: '0.72rem' }}> {e.note}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="🛡️ Deal protection register">
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
            <tbody>
              {data.protectionRegister.map((p) => (
                <tr key={p.deal} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '7px 10px', color: TEXT }}>{p.deal}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Pill text={p.state} tone={p.state.includes('EXPIRING') ? 'bad' : p.state.includes('PENDING') ? 'warn' : 'good'} />
                    {p.until && <span style={{ color: MUTED, marginLeft: 6, fontSize: '0.72rem' }}>{p.until}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Command Center                                                   */
/* ------------------------------------------------------------------ */

function SphereCommandCenter({ data, color }: { data: PartnerSphereCommandCenter; color: string }) {
  const [selectedPartner, setSelectedPartner] = useState<string>('');

  // Get unique partners from overdue + today + upcoming + rituals
  const allPartners = useMemo(() => {
    const set = new Set<string>();
    data.overdue.forEach(o => { if (o.owner) set.add(o.owner); });
    data.today.forEach(t => { if (t.owner) set.add(t.owner); });
    data.upcoming.forEach(u => { if (u.owner) set.add(u.owner); });
    data.rituals.forEach(r => { if (r.owner) set.add(r.owner); });
    return [''].concat([...set].sort());
  }, [data]);

  const ActionCard = ({ item, tone }: { item: { title: string; detail: string; owner: string; due?: string; ttl?: string; done?: boolean }; tone: 'bad' | 'neutral' | 'good' }) => (
    <div style={{ background: SURFACE_2, borderRadius: 10, padding: '10px 14px', borderLeft: `3px solid ${tone === 'bad' ? '#ff453a' : tone === 'good' ? '#34c77b' : color}`, opacity: item.done ? 0.55 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT, textDecoration: item.done ? 'line-through' : 'none' }}>{item.title}</span>
        <span style={{ fontSize: '0.72rem', color: MUTED, whiteSpace: 'nowrap' }}>{item.owner} · {item.due || item.ttl}</span>
      </div>
      <div style={{ fontSize: '0.76rem', color: MUTED, marginTop: 4 }}>{item.detail}</div>
    </div>
  );

  // Filter items by selected partner
  const filterByPartner = (items: any[]) => {
    if (!selectedPartner) return items;
    return items.filter(i => i.owner === selectedPartner || i.title.includes(selectedPartner));
  };

  const filteredOverdue = filterByPartner(data.overdue);
  const filteredToday = filterByPartner(data.today);
  const filteredUpcoming = filterByPartner(data.upcoming);
  const filteredRituals = filterByPartner(data.rituals);

  return (
    <div className="sd-stack">
      {/* Partner Care Routine Header */}
      <Card title="🧑‍⚕️ Partner Care Routine" subtitle={`${data.date} · tailored · live`}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedPartner}
            onChange={(e) => setSelectedPartner(e.target.value)}
            style={{
              padding: '10px 14px',
              fontSize: '0.9rem',
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: 'var(--samurai-surface)',
              color: TEXT,
              outline: 'none',
              cursor: 'pointer',
              minWidth: 250,
            }}
          >
            <option value="">— Choose a partner —</option>
            {allPartners.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {!selectedPartner && (
            <span style={{ fontSize: '0.8rem', color: MUTED }}>Select a partner to see their tailored care routine.</span>
          )}
        </div>

        {/* Per-partner AI recommendation */}
        {selectedPartner && (
          <div style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 10,
            background: 'rgba(0,122,255,0.06)',
            border: `1px solid ${color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>✦ AI Recommendation · confidence medium</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: TEXT, marginBottom: 6 }}>
              {selectedPartner}: act this week — steady state — protect the rhythm
            </div>
            <div style={{ fontSize: '0.82rem', color: MUTED, lineHeight: 1.5 }}>
              Maintain cadence: share one insight per fortnight and confirm the next QBR date.
            </div>
            <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 6 }}>
              Based on: {filteredOverdue.length > 0 ? `overdue ${filteredOverdue.length} action(s)` : 'regular cadence'}
            </div>

            {/* Quick actions for selected partner */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {filteredOverdue.length > 0 && (
                <button style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 6, border: 'none', background: '#ff453a', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  📞 Re-engage now
                </button>
              )}
              <button style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${color}`, background: 'transparent', color: color, cursor: 'pointer' }}>
                🗓 Quarterly business review
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card title={`🎯 Focus for today — ${data.date}`}>
        <p style={{ fontSize: '0.9rem', color: TEXT, lineHeight: 1.6 }}>{data.focus}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {Object.entries(data.amFilter).map(([k, v]) => (
            <button key={k} disabled
              style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.74rem', border: `1px solid ${BORDER}`, background: SURFACE_2, color: k === 'all' ? color : MUTED, cursor: 'default' }}>
              {k.toUpperCase()} {v}
            </button>
          ))}
        </div>
      </Card>

      <Card title="🗓 This week">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {data.weekStrip.map((w) => (
            <div key={w.day} style={{
              background: w.label === 'Action day' ? 'rgba(0,122,255,0.14)' : SURFACE_2,
              borderRadius: 8, padding: '8px 12px', fontSize: '0.72rem', textAlign: 'center',
              border: w.label === 'Action day' ? `1px solid ${color}` : `1px solid transparent`,
            }}>
              <div style={{ fontWeight: 600, color: TEXT }}>{w.day}</div>
              <div style={{ color: w.label === 'Action day' ? color : MUTED }}>{w.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="🔴 Overdue — handle first" subtitle="clear these before anything else">
        <div className="sd-stack" style={{ gap: 10, marginTop: 6 }}>{filteredOverdue.map((o) => <ActionCard key={o.title} item={o} tone="bad" />)}</div>
        {filteredOverdue.length === 0 && <div style={{ padding: 12, color: MUTED, fontSize: '0.82rem' }}>No overdue items{selectedPartner ? ` for ${selectedPartner}` : ''}.</div>}
      </Card>

      <Card title="🟢 Today's actions" subtitle="tap ✓ when done — logs to CRM automatically">
        <div className="sd-stack" style={{ gap: 10, marginTop: 6 }}>{filteredToday.map((o) => <ActionCard key={o.title} item={o} tone={o.done ? 'good' : 'neutral'} />)}</div>
        {filteredToday.length === 0 && <div style={{ padding: 12, color: MUTED, fontSize: '0.82rem' }}>No actions today{selectedPartner ? ` for ${selectedPartner}` : ''}.</div>}
      </Card>

      <Card title="🟡 Coming up this week" subtitle="no need to look at these until their day">
        <div className="sd-stack" style={{ gap: 10, marginTop: 6 }}>{filteredUpcoming.map((o) => <ActionCard key={o.title} item={o} tone="neutral" />)}</div>
        {filteredUpcoming.length === 0 && <div style={{ padding: 12, color: MUTED, fontSize: '0.82rem' }}>Nothing upcoming{selectedPartner ? ` for ${selectedPartner}` : ''}.</div>}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card title="🔁 Partner rituals — scheduling status">
          {filteredRituals.map((r) => (
            <div key={r.title} style={{ padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: TEXT }}>{r.title}</span>
                <Pill text={r.state ?? ''} tone={r.state === 'BOOKED' ? 'good' : r.state === 'NEEDS BOOKING' ? 'bad' : 'warn'} />
              </div>
              <div style={{ fontSize: '0.74rem', color: MUTED, marginTop: 3 }}>{r.detail}</div>
              <div style={{ fontSize: '0.72rem', color, marginTop: 2 }}>{r.owner}</div>
            </div>
          ))}
          {filteredRituals.length === 0 && <div style={{ padding: 12, color: MUTED, fontSize: '0.82rem' }}>No rituals{selectedPartner ? ` for ${selectedPartner}` : ''}.</div>}
        </Card>
        <div className="sd-stack">
          <Card title="🎫 Open partner tickets" subtitle={`${data.tickets.length} open`}>
            {data.tickets.map((t) => (
              <div key={t.title} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: TEXT, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>{t.detail}</div>
                </div>
                <Pill text={t.state ?? ''} tone="warn" />
              </div>
            ))}
          </Card>
          <Card title="📆 Reviews ahead" subtitle="next 90 days">
            {data.reviews.map((r) => (
              <div key={r.title} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: TEXT, fontWeight: 500 }}>{r.title}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>{r.detail}</div>
                </div>
                <span style={{ fontSize: '0.72rem', color, whiteSpace: 'nowrap' }}>{r.when}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Protection                                                       */
/* ------------------------------------------------------------------ */

function SphereProtection({ data, color }: { data: PartnerSphereProtection; color: string }) {
  return (
    <div className="sd-stack">
      <div className="sd-kpi-grid">
        <Kpi label="Protected deals" value={String(data.stats.protected)} note="active window" accent={color} />
        <Kpi label="Conflicts detected" value={String(data.stats.conflicts)} note="needs arbitration" accent={data.stats.conflicts > 0 ? '#ff453a' : '#34c77b'} />
      </div>

      <Card title="🛡️ Deal Registration & Protection Register" subtitle={data.policy}>
        <div className="sd-stack" style={{ gap: 8 }}>
          {data.alerts.map((a) => (
            <div key={a.text} style={{
              display: 'flex', gap: 10, alignItems: 'center', borderRadius: 10, padding: '10px 14px',
              background: a.level === 'red' ? 'rgba(255,69,58,0.12)' : a.level === 'conflict' ? 'rgba(255,179,64,0.14)' : 'rgba(255,179,64,0.09)',
            }}>
              <span style={{
                minWidth: 26, height: 26, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.8rem',
                background: a.level === 'red' ? '#ff453a' : '#ffb340', color: '#000',
              }}>{a.count}</span>
              <span style={{ fontSize: '0.82rem', color: TEXT }}>{a.text}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Active Registrations" subtitle="sorted by expiry urgency">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 820, fontSize: '0.78rem' }}>
            <thead><tr>{['End customer / Deal', 'Partner', 'AM', 'Registered', 'Protection window', 'Status', 'Actions'].map((h) => (
              <th key={h} style={{ padding: '7px 10px', color: MUTED, fontWeight: 500, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {data.active.map((r) => (
                <tr key={r.deal} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 10px', color: TEXT }}>
                    <div style={{ fontWeight: 500 }}>{r.deal}</div>
                    {r.value && <div style={{ fontSize: '0.72rem', color: MUTED }}>{r.value} · {r.stage}</div>}
                  </td>
                  <td style={{ padding: '8px 10px', color: TEXT }}>{r.partner}<div style={{ fontSize: '0.72rem', color: MUTED }}>{r.tier}</div></td>
                  <td style={{ padding: '8px 10px', color: MUTED }}>{r.am}</td>
                  <td style={{ padding: '8px 10px', color: MUTED }}>{r.registered}</td>
                  <td style={{ padding: '8px 10px', color: MUTED }}>{r.until}{r.daysLeft ? ` · ${r.daysLeft}` : ''}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <Pill text={r.status || 'ACTIVE'} tone={r.status === 'CONFLICT' ? 'warn' : r.onTrack ? 'good' : 'bad'} />
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    {r.status === 'CONFLICT' ? <><Btn>⚖ Arbitrate</Btn> <Btn>History</Btn></> : <><Btn>↻ Renew</Btn> <Btn>View deal</Btn></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Pending Validation" subtitle="new registrations awaiting approval">
        <div className="sd-stack" style={{ gap: 10 }}>
          {data.pending.map((p) => (
            <div key={p.deal} style={{ background: SURFACE_2, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: TEXT }}>{p.deal}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>{p.value} · {p.stage} · {p.partner} ({p.tier}) · {p.am} · {p.submitted}</div>
                </div>
                <Btn primary>✓ {p.action}</Btn>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {p.checks.map((c) => <Pill key={c} text={c} tone={c.includes('✓') ? 'good' : 'warn'} />)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Onboarding                                                       */
/* ------------------------------------------------------------------ */

function SphereOnboarding({ data, color }: { data: PartnerSphereOnboarding; color: string }) {
  const [draggedCard, setDraggedCard] = useState<{ name: string; fromStage: string } | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  // Find partner in masterList for detail view (we'll use onboarding card data as fallback)
  const handleCardClick = (cardName: string) => {
    setSelectedPartner(cardName);
  };

  const handleDragStart = (e: React.DragEvent, cardName: string, stageKey: string) => {
    setDraggedCard({ name: cardName, fromStage: stageKey });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStageKey: string) => {
    e.preventDefault();
    if (draggedCard && draggedCard.fromStage !== targetStageKey) {
      // In a real app, this would call an API to update the partner's stage
      // For now, just log it
      console.log(`Moving ${draggedCard.name} from ${draggedCard.fromStage} to ${targetStageKey}`);
    }
    setDraggedCard(null);
  };

  // If a partner is selected, show their detail (reuse PartnerProfileSelector pattern)
  if (selectedPartner) {
    // Find the card data
    let cardData: any = null;
    for (const stage of data.stages) {
      const found = stage.cards.find(c => c.name === selectedPartner);
      if (found) { cardData = found; break; }
    }

    return (
      <div className="sd-stack" style={{ gap: 16 }}>
        <button onClick={() => setSelectedPartner(null)} style={{ padding: '8px 16px', fontSize: '0.85rem', color, background: 'transparent', border: `1px solid ${color}`, borderRadius: 6, cursor: 'pointer', alignSelf: 'flex-start' }}>← Back to Onboarding Board</button>
        
        {/* Partner header */}
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT, margin: 0 }}>{selectedPartner}</h2>
          {cardData && (
            <div style={{ fontSize: '0.85rem', color: MUTED, marginTop: 4 }}>
              {cardData.org || '—'} · AM: {cardData.am || '—'}{cardData.age ? ` · ${cardData.age} since last activity` : ''}
            </div>
          )}
          {cardData && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {cardData.health && <Pill text={cardData.health === 'danger' ? 'At Risk' : cardData.health === 'warn' ? 'In progress' : 'Active'} tone={cardData.health === 'danger' ? 'bad' : cardData.health === 'warn' ? 'warn' : 'good'} />}
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <DetailField label="Open deals" value={cardData?.detail?.match(/(\d+)\s*open/)?.[1] || '—'} />
            <DetailField label="Pipeline" value={cardData?.detail?.match(/RM\s*([\d,.]+[KMG]?)/)?.[1] ? `RM ${cardData.detail.match(/RM\s*([\d,.]+[KMG]?)/)[1]}` : '—'} />
            <DetailField label="Stage" value={data.stages.find(s => s.cards.some(c => c.name === selectedPartner))?.label || '—'} />
          </div>
        </div>

        {/* Checklist */}
        {cardData?.checklist && cardData.checklist.length > 0 && (
          <div className="sd-chart-card" style={{ padding: 16 }}>
            <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Onboarding Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cardData.checklist.map((item: any) => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ color: item.state === 'done' ? '#34c77b' : item.state === 'today' ? color : MUTED, fontWeight: 700 }}>
                    {item.state === 'done' ? '✓' : item.state === 'today' ? '▸' : '◻'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: item.state === 'done' ? MUTED : TEXT, textDecoration: item.state === 'done' ? 'line-through' : 'none' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        {cardData?.note && (
          <div className="sd-chart-card" style={{ padding: 16, borderColor: color }}>
            <div style={{ fontSize: '0.85rem', color: TEXT }}>{cardData.note}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sd-stack">
      <Card title="📥 Partner Onboarding — drag a partner to the next stage" subtitle={`${data.pipelineSummary} · Move each partner through the onboarding journey. Drag a card left-to-right as each step is completed.`}>
        {/* Status columns: left → right (one per stage, no wrapping); cards stack top → down within each column */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.stages.length}, minmax(215px, 1fr))`, gap: 12 }}>
            {data.stages.map((s) => (
              <div 
                key={s.key} 
                style={{ background: SURFACE_2, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', minHeight: 200 }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, s.key)}
              >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT }}>{s.label}</span>
                <span style={{
                  minWidth: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: color, color: '#fff', fontSize: '0.74rem', fontWeight: 700,
                }}>{s.count}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: 2 }}>benchmark: {s.benchmark}</div>
              <div className="sd-stack" style={{ gap: 8, marginTop: 8 }}>
                {s.cards.map((c) => (
                  <div 
                    key={c.name} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.name, s.key)}
                    onClick={() => handleCardClick(c.name)}
                    style={{
                      background: SURFACE, borderRadius: 8, padding: 10, cursor: 'grab',
                      borderLeft: `3px solid ${c.health === 'danger' ? '#ff453a' : c.health === 'warn' ? '#ffb340' : '#34c77b'}`,
                      opacity: draggedCard?.name === c.name ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.1)`}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: TEXT }}>{c.name}</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED }}>{c.org} · {c.am}{c.age ? ` · ⏱ ${c.age}` : ''}</div>
                    {c.detail && <div style={{ fontSize: '0.74rem', color: MUTED, marginTop: 3 }}>{c.detail}</div>}
                    {(c.checklist ?? []).length > 0 && (
                      <ul style={{ marginTop: 6, paddingLeft: 14, fontSize: '0.72rem', color: MUTED, listStyle: 'none' }}>
                        {(c.checklist ?? []).map((x) => (
                          <li key={x.text} style={{ margin: '2px 0', color: x.state === 'done' ? '#34c77b' : x.state === 'today' ? color : MUTED }}>
                            {x.state === 'done' ? '✓' : x.state === 'today' ? '▸' : '◻'} {x.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    {c.note && <div style={{ fontSize: '0.7rem', color, marginTop: 6 }}>{c.note}</div>}
                  </div>
                ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, fontSize: '0.72rem', color: MUTED }}>
          <span>Card health: {data.legends.cardHealth.join(' · ')}</span>
          <span>Checklist marks: {data.legends.checkmarks.join(' · ')}</span>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. QBR                                                              */
/* ------------------------------------------------------------------ */

function SphereQbr({ data, color }: { data: PartnerSphereQbr; color: string }) {
  return (
    <div className="sd-stack">
      <Card title="📈 QBR Auto-Pack Generator" subtitle="One click per partner: a complete Quarterly Business Review pack compiled from live CRM data — funnel, scores, licences vs commitments, wins/losses, and next-quarter plan template">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {data.quarters.map((q) => (
            <button key={q} style={{
              padding: '5px 14px', borderRadius: 999, fontSize: '0.78rem', cursor: 'default',
              border: `1px solid ${q.includes('Q3') ? color : BORDER}`,
              background: q.includes('Q3') ? 'rgba(0,122,255,0.12)' : 'transparent',
              color: q.includes('Q3') ? color : MUTED,
            }}>{q}</button>
          ))}
          <span style={{ flex: 1 }} />
          {data.generateAll && <Btn primary>⚡ Generate All Packs</Btn>}
        </div>
      </Card>

      <div className="sd-stack" style={{ gap: 12 }}>
        {data.partners.map((p) => (
          <Card key={p.name}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.92rem', color: TEXT }}>{p.name}</span>
                  <Pill text={p.tier} tone={p.tier === 'Platinum' ? 'accent' : 'neutral'} />
                </div>
                <div style={{ fontSize: '0.74rem', color: MUTED }}>{p.org} · AM: {p.am}</div>
              </div>
              <div style={{ minWidth: 170 }}>
                {p.flags.map((f) => (
                  <div key={f} style={{ fontSize: '0.72rem', color: f.startsWith('⚠') ? '#ffb340' : '#34c77b' }}>{f}</div>
                ))}
              </div>
              <div style={{ minWidth: 150, fontSize: '0.78rem' }}>
                <StatLine label="Q3 pipeline" value={p.pipeline} />
                <StatLine label="won" value={p.won} />
                <StatLine label="score" value={p.score} />
              </div>
              <div style={{ minWidth: 150, fontSize: '0.78rem' }}>
                <div style={{ color: TEXT }}>Licences</div>
                <div style={{ color: MUTED, fontSize: '0.74rem' }}>{p.licences}</div>
                {p.cadence && <div style={{ color: MUTED, fontSize: '0.72rem', marginTop: 2 }}>cadence {p.cadence}</div>}
              </div>
              <div style={{ textAlign: 'right', minWidth: 150 }}>
                <Btn primary>📄 Generate Pack</Btn>
                <div style={{ fontSize: '0.68rem', color: MUTED, marginTop: 4 }}>{p.slides} · {p.formats} · est. {p.est}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Pack Preview" subtitle={`${data.preview.title} · ${data.preview.meta}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 8 }}>📈 Performance</div>
            {data.preview.performance.map((p) => (
              <StatLine key={p.label} label={p.label} value={`${p.value}${p.delta ? ` · ${p.delta}` : ''}`} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 8 }}>🎯 Commitments</div>
            {data.preview.commitments.map((p) => (
              <StatLine key={p.label} label={p.label} value={`${p.value}${p.delta ? ` · ${p.delta}` : ''}`} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 8 }}>💬 Talking Points (auto-drafted)</div>
            <ul style={{ paddingLeft: 16, fontSize: '0.78rem', color: TEXT }}>
              {data.preview.talkingPoints.map((t) => <li key={t} style={{ margin: '4px 0' }}>{t}</li>)}
            </ul>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {data.preview.actions.map((a) => <Btn key={a}>{a}</Btn>)}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 8. CEO Digest                                                       */
/* ------------------------------------------------------------------ */

function SphereCeoDigest({ data, color }: { data: PartnerSphereCeoDigest; color: string }) {
  return (
    <div className="sd-stack">
      {/* Board Brief */}
      <Card title={`📮 Board Brief — decisions & exceptions only`} subtitle={`week of ${data.week}`}>
        <div style={{ fontSize: '0.9rem', color: TEXT, lineHeight: 1.7, marginBottom: 12 }}>
          <strong>The week in one paragraph.</strong><br />
          {data.kpis && data.kpis.length > 0 && (
            <>Channel stands at {data.kpis.find(k => k.label.includes('Pipeline'))?.value || 'RM 15.9M'} across active partners. </>
          )}
          {data.decisions && data.decisions.length > 0 && (
            <>{data.decisions.length} items need your decision this week.</>
          )}
        </div>
      </Card>

      {/* Exceptions requiring decision */}
      {data.decisions && data.decisions.length > 0 && (
        <Card title="⚠️ Exceptions requiring decision">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.decisions.map((d) => (
              <div key={d.title} style={{ fontSize: '0.85rem', color: TEXT, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: '#ff453a', marginRight: 6 }}>•</span>
                <strong>{d.title}</strong> — {d.detail}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Funnel health */}
      <Card title="📉 Funnel health">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {data.watch && data.watch.map((w) => (
            <div key={w.title} style={{ padding: 12, background: SURFACE_2, borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: MUTED }}>{w.title}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT, marginTop: 4 }}>{w.tag || w.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* AM Scorecard */}
      <Card title="🧭 AM scorecard">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                {['AM', 'Pipeline', 'Open deals', 'Partners', 'Stalls'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: MUTED, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.wins && data.wins.map((w) => (
                <tr key={w.title} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: TEXT }}>{w.owner || w.title}</td>
                  <td style={{ padding: '8px 12px', color: TEXT }}>{w.detail?.split('·')[0] || '—'}</td>
                  <td style={{ padding: '8px 12px', color: TEXT }}>—</td>
                  <td style={{ padding: '8px 12px', color: TEXT }}>—</td>
                  <td style={{ padding: '8px 12px', color: MUTED }}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dormancy Radar */}
      <Card title="🛰 Dormancy Radar — cooling toward dormant" subtitle={`${data.watch ? data.watch.length : 0} partners`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {data.watch && data.watch.map((w) => (
            <div key={w.title} style={{
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: 'rgba(255,179,64,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: TEXT }}>{w.title}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ffb340', background: 'rgba(255,179,64,0.15)', padding: '2px 8px', borderRadius: 4 }}>
                  DormantScore {w.tag?.replace(/[^0-9]/g, '') || '0'}
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
                {w.detail}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#ff453a', marginTop: 6, fontWeight: 600 }}>
                AT RISK of dormancy - intervene
              </div>
            </div>
          ))}
          {(!data.watch || data.watch.length === 0) && (
            <div style={{ padding: 20, textAlign: 'center', color: MUTED, gridColumn: '1 / -1' }}>No partners at dormancy risk</div>
          )}
        </div>
      </Card>

      {/* Rituals & protection health */}
      {data.rituals && (
        <Card title="📆 Rituals & protection health">
          <StatLine label="🛡️ Deal protections" value={data.rituals.protections} />
          <StatLine label="🔁 Cadence calls" value={data.rituals.cadence} />
          <StatLine label="📊 Q3 review cycle" value={data.rituals.q3} />
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 9. Pricing Simulator                                                */
/* ------------------------------------------------------------------ */

function SpherePricing({ data, color }: { data: PartnerSpherePricing; color: string }) {
  const [currency, setCurrency] = useState(data.currencies[0] ?? 'MYR');
  const [tier, setTier] = useState(data.tiers[0]?.name ?? 'List');
  const [selectedBundle, setSelectedBundle] = useState<string>('Base');

  // One-Time Setup
  const [outlets, setOutlets] = useState(1);

  // Add-on Cameras
  const [extraCams, setExtraCams] = useState(0);

  // Professional Services — toggled on/off + man days
  const [pmOn, setPmOn] = useState(false);
  const [pmDays, setPmDays] = useState(1);
  const [custOn, setCustOn] = useState(false);
  const [custDays, setCustDays] = useState(1);
  const [consultOn, setConsultOn] = useState(false);
  const [consultDays, setConsultDays] = useState(1);

  // Outstation
  const [nsTrips, setNsTrips] = useState(0);
  const [nsNights, setNsNights] = useState(0);
  const [emTrips, setEmTrips] = useState(0);
  const [emNights, setEmNights] = useState(0);

  const tierDiscount = data.tiers.find((t) => t.name === tier)?.discount ?? '';
  const pct = tierDiscount ? parseInt(tierDiscount.replace(/[^0-9]/g, ''), 10) : 0;

  const sym = currency === 'MYR' ? 'RM' : currency === 'SGD' ? 'S$' : 'US$';
  const fmt = (n: number) => `${sym} ${Math.round(n).toLocaleString()}`;
  const adj = (price: number) => Math.round(price * (1 - pct / 100));

  // Bundle prices (adjusted for tier discount)
  const bundleMap: Record<string, number> = {};
  data.bundles.forEach((b) => { bundleMap[b.name] = adj(b.price); });
  const bundleMonthly = bundleMap[selectedBundle] ?? 0;

  // Tier feature lists
  const TIER_FEATURES: Record<string, string[]> = {
    Lite: [
      'Basic AI video analytics dashboard',
      'Up to 4 camera feeds per outlet',
      'Daily automated reports via email',
      'Standard support (email)',
      'Community forum access',
    ],
    Base: [...(data.baseFeatures || [])],
    'Base+': [
      ...(data.baseFeatures || []),
      'Advanced people counting & heatmaps',
      'Queue length monitoring & alerts',
      'Multi-outlet unified dashboard',
      'Priority support (chat + email)',
      'Custom report scheduling',
    ],
    Advanced: [
      ...(data.baseFeatures || []),
      'Advanced people counting & heatmaps',
      'Queue length monitoring & alerts',
      'Multi-outlet unified dashboard',
      'AI-powered anomaly detection',
      'Real-time POS integration',
      'Dedicated account manager',
      '24/7 premium support',
      'Custom AI model training',
    ],
  };

  const BUNDLE_COLORS: Record<string, string> = {
    Lite: '#34c77b',
    Base: '#0a84ff',
    'Base+': '#ffd60a',
    Advanced: '#ff453a',
  };

  // Cost calculations
  const setupOneTime = outlets * adj(data.setup.price);
  const camsMonthly = extraCams * outlets * adj(data.addonCameras.price);

  const pmCost = pmOn ? pmDays * adj(1200) : 0;
  const custCost = custOn ? custDays * adj(1500) : 0;
  const consultCost = consultOn ? consultDays * adj(1500) : 0;
  const profServicesTotal = pmCost + custCost + consultCost;

  const nsCost = nsTrips * adj(350) + nsNights * adj(450);
  const emCost = emTrips * adj(1350) + emNights * adj(450);
  const outstationTotal = nsCost + emCost;

  const monthlyRecurring = bundleMonthly + camsMonthly;
  const oneTimeCharges = setupOneTime + profServicesTotal + outstationTotal;
  const totalFirstMonth = monthlyRecurring + oneTimeCharges;
  const perOutletMonth = outlets > 0 ? Math.round(monthlyRecurring / outlets) : 0;
  const spread36 = outlets > 0 ? Math.round((monthlyRecurring * 36 + oneTimeCharges) / 36 / outlets) : 0;

  const summaryText = [
    `SamurAI V2 Pricing · ${selectedBundle} · ${currency}`,
    `Partner Tier: ${tier}${tierDiscount ? ` (${tierDiscount})` : ''}`,
    ``,
    `Monthly:`,
    `  Bundle (${selectedBundle}): ${fmt(bundleMonthly)}/mo`,
    `  Extra Cameras (${extraCams} × ${outlets} outlets): ${fmt(camsMonthly)}/mo`,
    `  Monthly Recurring: ${fmt(monthlyRecurring)}/mo`,
    ``,
    `One-Time:`,
    `  Setup (${outlets} outlets): ${fmt(setupOneTime)}`,
    ...(pmOn ? [`  Project Management (${pmDays} days): ${fmt(pmCost)}`] : []),
    ...(custOn ? [`  Software Customisation (${custDays} days): ${fmt(custCost)}`] : []),
    ...(consultOn ? [`  AI Expert Consulting (${consultDays} days): ${fmt(consultCost)}`] : []),
    ...(nsTrips > 0 || nsNights > 0 ? [`  Outstation N&S (${nsTrips} trips, ${nsNights} nights): ${fmt(nsCost)}`] : []),
    ...(emTrips > 0 || emNights > 0 ? [`  Outstation East MY (${emTrips} trips, ${emNights} nights): ${fmt(emCost)}`] : []),
    `  One-Time Total: ${fmt(oneTimeCharges)}`,
    ``,
    `Total First Month: ${fmt(totalFirstMonth)}`,
    `Per Outlet/Month: ${fmt(perOutletMonth)}`,
    `Spread Over 36 Months: ${fmt(spread36)}/outlet/mo`,
  ].join('\n');

  const copySummary = () => { navigator.clipboard.writeText(summaryText); };

  // Stepper helper
  const Stepper = ({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>−</button>
      <span style={{ minWidth: 28, textAlign: 'center', fontSize: '0.88rem', fontWeight: 600, color }}>{value}</span>
      <button onClick={() => onChange(value + 1)}
        style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: SURFACE_2, color: TEXT, cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>+</button>
    </div>
  );

  return (
    <div className="sd-stack">
      {/* Currency / Tier selector bar */}
      <Card title="💰 SamurAI V2 · Retail Pricing Simulator">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="sd-kpi-label">Currency</span>
          {data.currencies.map((c) => (
            <button key={c} onClick={() => setCurrency(c)}
              style={{
                padding: '4px 14px', borderRadius: 999, fontSize: '0.76rem', cursor: 'pointer',
                border: `1px solid ${currency === c ? color : BORDER}`,
                background: currency === c ? 'rgba(0,122,255,0.12)' : 'transparent',
                color: currency === c ? color : MUTED,
              }}>{c}</button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="sd-kpi-label">Partner tier</span>
          {data.tiers.map((t) => (
            <button key={t.name} onClick={() => setTier(t.name)}
              style={{
                padding: '4px 14px', borderRadius: 999, fontSize: '0.76rem', cursor: 'pointer',
                border: `1px solid ${tier === t.name ? color : BORDER}`,
                background: tier === t.name ? 'rgba(0,122,255,0.12)' : 'transparent',
                color: tier === t.name ? color : MUTED,
              }}>{t.name}{t.discount ? ` ${t.discount}` : ''}</button>
          ))}
          <Btn>📄 Download Brochure PDF</Btn>
        </div>
      </Card>

      {/* Bundle Selector Cards */}
      <Card title="📦 Choose Your Bundle" subtitle={data.bundleNote}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {data.bundles.map((b) => {
            const active = selectedBundle === b.name;
            const indicator = b.name === 'Lite' ? '🟢' : b.name === 'Base' ? '🔵' : b.name === 'Base+' ? '🟡' : '🔴';
            const borderColor = active ? (BUNDLE_COLORS[b.name] || color) : BORDER;
            return (
              <button key={b.name} onClick={() => setSelectedBundle(b.name)}
                style={{
                  textAlign: 'left',
                  background: active ? `color-mix(in srgb, ${BUNDLE_COLORS[b.name] || color} 12%, transparent)` : SURFACE_2,
                  border: `2px solid ${borderColor}`, borderRadius: 12, padding: 16, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>
                  {indicator} {b.name}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: active ? (BUNDLE_COLORS[b.name] || color) : TEXT, marginTop: 4 }}>
                  {fmt(adj(b.price))}<span style={{ fontSize: '0.75rem', color: MUTED }}>{b.per}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 4 }}>{b.tagline}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Bundle Detail Panel */}
      <Card title={`${selectedBundle === 'Lite' ? '🟢' : selectedBundle === 'Base' ? '🔵' : selectedBundle === 'Base+' ? '🟡' : '🔴'} What you can do with ${selectedBundle}:`}>
        <ul style={{ paddingLeft: 16, fontSize: '0.8rem', color: TEXT }}>
          {(TIER_FEATURES[selectedBundle] || []).map((f) => <li key={f} style={{ margin: '4px 0' }}>{f}</li>)}
        </ul>
        <div style={{ fontSize: '0.74rem', color: MUTED, marginTop: 10 }}>{data.addonCameras.note}</div>
      </Card>

      {/* One-Time Setup + Add-on Cameras */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card title="🏪 One-Time Setup" subtitle={data.setup.note}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '0.8rem', color: TEXT }}>Number of outlets · {fmt(adj(data.setup.price))}/{data.setup.unit}</span>
            <Stepper value={outlets} onChange={setOutlets} min={1} />
          </div>
          <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 8, textAlign: 'right' }}>
            Setup subtotal: <span style={{ color, fontWeight: 600 }}>{fmt(setupOneTime)}</span>
          </div>
        </Card>

        <Card title="📷 Add-on Cameras" subtitle={data.addonCameras.note}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '0.8rem', color: TEXT }}>Extra cameras per outlet · {fmt(adj(data.addonCameras.price))}/{data.addonCameras.unit}</span>
            <Stepper value={extraCams} onChange={setExtraCams} min={0} />
          </div>
          <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 8, textAlign: 'right' }}>
            Camera subtotal: <span style={{ color, fontWeight: 600 }}>{fmt(camsMonthly)}</span>/mo
          </div>
        </Card>
      </div>

      {/* Professional Services */}
      <Card title="🛠️ Professional Services" subtitle="Toggle on and set man days">
        {[
          { label: 'Project Management', rate: 1200, on: pmOn, setOn: setPmOn, days: pmDays, setDays: setPmDays },
          { label: 'Software Customisation', rate: 1500, on: custOn, setOn: setCustOn, days: custDays, setDays: setCustDays },
          { label: 'AI Expert Consulting', rate: 1500, on: consultOn, setOn: setConsultOn, days: consultDays, setDays: setConsultDays },
        ].map((svc) => (
          <div key={svc.label} style={{ padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 500 }}>{svc.label}</span>
                <span style={{ fontSize: '0.74rem', color: MUTED, marginLeft: 8 }}>{fmt(adj(svc.rate))}/man day</span>
              </div>
              <button onClick={() => svc.setOn(!svc.on)}
                style={{
                  padding: '4px 14px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${svc.on ? color : BORDER}`,
                  background: svc.on ? `${color}22` : 'transparent',
                  color: svc.on ? color : MUTED,
                }}>{svc.on ? 'ON' : 'OFF'}</button>
            </div>
            {svc.on && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingLeft: 12 }}>
                <span style={{ fontSize: '0.78rem', color: MUTED }}>Man days</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Stepper value={svc.days} onChange={svc.setDays} min={1} />
                  <span style={{ fontSize: '0.78rem', color, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                    {fmt(svc.days * adj(svc.rate))}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* Outstation */}
      <Card title="📍 Outstation" subtitle="outside Klang Valley">
        {/* Northern & Southern */}
        <div style={{ padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 500, marginBottom: 8 }}>Northern & Southern</div>
          <div style={{ fontSize: '0.74rem', color: MUTED, marginBottom: 6 }}>{fmt(adj(350))}/trip + {fmt(adj(450))}/night</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: MUTED }}>Trips</span>
              <Stepper value={nsTrips} onChange={setNsTrips} min={0} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: MUTED }}>Nights</span>
              <Stepper value={nsNights} onChange={setNsNights} min={0} />
            </div>
            <span style={{ fontSize: '0.78rem', color, fontWeight: 600, marginLeft: 'auto' }}>{fmt(nsCost)}</span>
          </div>
        </div>
        {/* East Malaysia */}
        <div style={{ padding: '10px 0' }}>
          <div style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 500, marginBottom: 8 }}>East Malaysia</div>
          <div style={{ fontSize: '0.74rem', color: MUTED, marginBottom: 6 }}>{fmt(adj(1350))}/trip + {fmt(adj(450))}/night</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: MUTED }}>Trips</span>
              <Stepper value={emTrips} onChange={setEmTrips} min={0} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: MUTED }}>Nights</span>
              <Stepper value={emNights} onChange={setEmNights} min={0} />
            </div>
            <span style={{ fontSize: '0.78rem', color, fontWeight: 600, marginLeft: 'auto' }}>{fmt(emCost)}</span>
          </div>
        </div>
      </Card>

      {/* Dynamic Pricing Summary */}
      <Card title="💰 Pricing Summary" subtitle="Monthly + one-time costs">
        <div className="sd-stack" style={{ gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '0.82rem', color: TEXT }}>Bundle ({selectedBundle}) <span style={{ fontSize: '0.7rem', color: MUTED }}>(monthly)</span></span>
            <span style={{ fontSize: '0.82rem', color, fontWeight: 600 }}>{fmt(bundleMonthly)}/mo</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '0.82rem', color: MUTED }}>Setup ({outlets} outlets) <span style={{ fontSize: '0.7rem', color: MUTED }}>(one-time)</span></span>
            <span style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 600 }}>{fmt(setupOneTime)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '0.82rem', color: TEXT }}>Extra cameras ({extraCams} × {outlets}) <span style={{ fontSize: '0.7rem', color: MUTED }}>(monthly)</span></span>
            <span style={{ fontSize: '0.82rem', color, fontWeight: 600 }}>{fmt(camsMonthly)}/mo</span>
          </div>
          {pmOn && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.82rem', color: MUTED }}>Project Management ({pmDays} days) <span style={{ fontSize: '0.7rem', color: MUTED }}>(one-time)</span></span>
              <span style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 600 }}>{fmt(pmCost)}</span>
            </div>
          )}
          {custOn && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.82rem', color: MUTED }}>Software Customisation ({custDays} days) <span style={{ fontSize: '0.7rem', color: MUTED }}>(one-time)</span></span>
              <span style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 600 }}>{fmt(custCost)}</span>
            </div>
          )}
          {consultOn && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.82rem', color: MUTED }}>AI Expert Consulting ({consultDays} days) <span style={{ fontSize: '0.7rem', color: MUTED }}>(one-time)</span></span>
              <span style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 600 }}>{fmt(consultCost)}</span>
            </div>
          )}
          {(nsTrips > 0 || nsNights > 0 || emTrips > 0 || emNights > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.82rem', color: MUTED }}>Outstation <span style={{ fontSize: '0.7rem', color: MUTED }}>(one-time)</span></span>
              <span style={{ fontSize: '0.82rem', color: TEXT, fontWeight: 600 }}>{fmt(outstationTotal)}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 14 }}>
          <Kpi label="Monthly recurring" value={fmt(monthlyRecurring)} accent={color} />
          <Kpi label="One-time charges" value={fmt(oneTimeCharges)} />
          <Kpi label="Total (1st month)" value={fmt(totalFirstMonth)} accent={color} />
          <Kpi label="Per outlet per month" value={fmt(perOutletMonth)} />
        </div>

        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: SURFACE_2, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: '0.78rem', color: MUTED }}>Spread All Costs Over 36 Months</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color, marginTop: 4 }}>{fmt(spread36)}<span style={{ fontSize: '0.75rem', color: MUTED, fontWeight: 400 }}>/outlet/mo</span></div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Btn primary>📅 Spread All Costs Over 36 Months</Btn>
          <Btn onClick={copySummary}>📋 Copy Summary to Clipboard</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Partner Deals Section                                               */
/* ------------------------------------------------------------------ */

function PartnerDealsSection({ 
  dept, 
  color, 
  masterList 
}: { 
  dept: string; 
  color: string; 
  masterList: PartnerSphereData['masterList'];
}) {
  const [search, setSearch] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [sortField, setSortField] = useState<'value' | 'registered' | 'close'>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedDeal, setSelectedDeal] = useState<CrmDealListItem | null>(null);

  // Fetch all deals
  const query = useQuery({
    queryKey: ['crm-deals', dept],
    queryFn: () => departmentsApi.crmDealsList(dept, '', '', '', '', ''),
    refetchInterval: 120_000,
  });

  const deals = query.data?.deals ?? [];

  // Build partner map from masterList for attribution
  const partnerMap = useMemo(() => {
    const map = new Map<string, { tier: string; am: string }>();
    for (const p of masterList) {
      map.set(p.name, { tier: p.tier, am: p.am });
    }
    return map;
  }, [masterList]);

  // Enrich deals with partner info and filter
  const enrichedDeals = useMemo(() => {
    let result = deals.map(d => {
      const partnerInfo = d.source ? partnerMap.get(d.source) : null;
      return {
        ...d,
        partnerName: d.source || '— Unassigned —',
        partnerTier: partnerInfo?.tier || '',
        partnerAm: partnerInfo?.am || '',
      };
    });

    // Apply filters
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d =>
        d.title.toLowerCase().includes(s) ||
        (d.customer || '').toLowerCase().includes(s) ||
        d.partnerName.toLowerCase().includes(s) ||
        (d.owner || '').toLowerCase().includes(s)
      );
    }
    if (partnerFilter !== 'All') {
      result = result.filter(d => d.partnerName === partnerFilter);
    }
    if (tierFilter !== 'All') {
      result = result.filter(d => d.partnerTier === tierFilter);
    }
    if (stageFilter !== 'All') {
      result = result.filter(d => d.stage === stageFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'value') cmp = (a.amount || 0) - (b.amount || 0);
      else if (sortField === 'registered') cmp = (a.created || '').localeCompare(b.created || '');
      else if (sortField === 'close') cmp = 0; // close date not in CrmDealListItem
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [deals, search, partnerFilter, tierFilter, stageFilter, sortField, sortDir, partnerMap]);

  // Unique filter options
  const partners = useMemo(() => ['All', ...Array.from(new Set(enrichedDeals.map(d => d.partnerName))).sort()], [enrichedDeals]);
  const tiers = useMemo(() => ['All', ...Array.from(new Set(masterList.map(p => p.tier))).sort()], [masterList]);
  const stages = useMemo(() => ['All', ...Array.from(new Set(deals.map(d => d.stage).filter(Boolean) as string[])).sort()], [deals]);

  if (query.isLoading) {
    return <div className="sd-empty"><div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} /><p>Loading deals…</p></div>;
  }

  // Deal detail view
  if (selectedDeal) {
    return (
      <div className="sd-stack" style={{ gap: 16 }}>
        <button onClick={() => setSelectedDeal(null)} style={{ padding: '8px 16px', fontSize: '0.85rem', color, background: 'transparent', border: `1px solid ${color}`, borderRadius: 6, cursor: 'pointer', alignSelf: 'flex-start' }}>← Back to deals</button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: TEXT, margin: 0 }}>{selectedDeal.title}</h2>
        {selectedDeal.customer && <div style={{ fontSize: '0.9rem', color: MUTED }}>{selectedDeal.customer} · {selectedDeal.source || 'No partner'}</div>}
        <div className="sd-chart-card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <DetailField label="Stage" value={selectedDeal.stage || '—'} />
            <DetailField label="Owner (AM)" value={selectedDeal.owner || '—'} />
            <DetailField label="Value" value={selectedDeal.amount ? `RM ${selectedDeal.amount.toLocaleString()}` : '—'} />
            <DetailField label="Priority" value={selectedDeal.priority || '—'} />
            <DetailField label="Created" value={selectedDeal.created || '—'} />
            <DetailField label="Partner channel" value={selectedDeal.source || '—'} />
          </div>
        </div>
        {selectedDeal.compiled_truth && (
          <div className="sd-chart-card" style={{ padding: 16 }}>
            <h3 className="sd-chart-title" style={{ marginBottom: 12 }}>Raw Content</h3>
            <div style={{ fontSize: '0.85rem', color: TEXT, whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.6, maxHeight: 400, overflowY: 'auto' }}>{selectedDeal.compiled_truth}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sd-stack" style={{ gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: TEXT, margin: 0 }}>Partner Deals — {enrichedDeals.length} of {deals.length} deals</h2>
          <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 4 }}>Every deal in the CRM, attributed to its partner — live from the pipeline. Click any row for full detail.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#34c77b' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34c77b', display: 'inline-block' }} />
          LIVE · auto-refresh
        </div>
      </div>

      {/* Filters */}
      <div className="sd-chart-card" style={{ padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deal, customer, partner, owner…" style={{ flex: 1, minWidth: 200, padding: '8px 12px', fontSize: '0.85rem', borderRadius: 6, border: `1px solid ${BORDER}`, outline: 'none', color: TEXT }} />
        <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT }}>
          {partners.map(p => <option key={p} value={p}>{p === 'All' ? 'All partners' : p}</option>)}
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT }}>
          {tiers.map(t => <option key={t} value={t}>{t === 'All' ? 'All tiers' : t}</option>)}
        </select>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT }}>
          {stages.map(s => <option key={s} value={s}>{s === 'All' ? 'All stages' : s}</option>)}
        </select>
        <select value={`${sortField}-${sortDir}`} onChange={(e) => { const [f, d] = e.target.value.split('-'); setSortField(f as any); setSortDir(d as any); }} style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: 6, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT }}>
          <option value="value-desc">Value · high→low</option>
          <option value="value-asc">Value · low→high</option>
          <option value="registered-desc">Registered · newest</option>
          <option value="registered-asc">Registered · oldest</option>
        </select>
        {(search || partnerFilter !== 'All' || tierFilter !== 'All' || stageFilter !== 'All') && (
          <button onClick={() => { setSearch(''); setPartnerFilter('All'); setTierFilter('All'); setStageFilter('All'); }} style={{ padding: '6px 12px', fontSize: '0.8rem', color: MUTED, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer' }}>✕ Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="sd-chart-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
              {['Deal', 'Partner', 'Customer', 'Stage', 'Registered', 'Product', 'Value', 'Pri'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: MUTED, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enrichedDeals.slice(0, 100).map((deal) => (
              <tr key={deal.slug} onClick={() => setSelectedDeal(deal)} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '8px 10px', fontWeight: 500, color: TEXT, maxWidth: 250 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.title}</div></td>
                <td style={{ padding: '8px 10px', color: TEXT }}>
                  <div>{deal.partnerName}</div>
                  {deal.partnerTier && <div style={{ fontSize: '0.7rem', color: MUTED }}>{deal.partnerTier}{deal.partnerAm ? ` · AM: ${deal.partnerAm}` : ''}</div>}
                </td>
                <td style={{ padding: '8px 10px', color: MUTED, maxWidth: 180 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.customer || '—'}</div></td>
                <td style={{ padding: '8px 10px', color: TEXT }}>{deal.stage || '—'}</td>
                <td style={{ padding: '8px 10px', color: MUTED }}>{deal.created || '—'}</td>
                <td style={{ padding: '8px 10px', color: MUTED }}>—</td>
                <td style={{ padding: '8px 10px', color: TEXT, whiteSpace: 'nowrap' }}>{deal.amount ? `RM ${deal.amount >= 1_000_000 ? `${(deal.amount / 1_000_000).toFixed(1)}M` : `${(deal.amount / 1000).toFixed(0)}K`}` : '—'}</td>
                <td style={{ padding: '8px 10px', color: MUTED }}>{deal.priority === 'High' ? '🔥' : deal.priority === 'Medium' ? '⚡' : '◉'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {enrichedDeals.length > 100 && <div style={{ padding: 12, textAlign: 'center', color: MUTED, fontSize: '0.8rem' }}>Showing first 100 of {enrichedDeals.length} deals</div>}
        {enrichedDeals.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: MUTED }}>No deals found matching filters</div>}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: TEXT }}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main: Partner Sphere                                                */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'masterList', label: '📇 Partners' },
  { id: 'profile', label: '🏢 Partner Profile' },
  { id: 'deals', label: '💼 Partner Deals' },
  { id: 'commandCenter', label: '🎯 Command Center' },
  { id: 'protection', label: '🛡️ Protection' },
  { id: 'onboarding', label: '📥 Onboarding' },
  { id: 'qbr', label: '📈 QBR Packs' },
  { id: 'ceoDigest', label: '📮 CEO Digest' },
  { id: 'pricing', label: '💰 Pricing Simulator' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function PartnersTab({ dept, color }: Props) {
  const [section, setSection] = useState<SectionId>('overview');

  const query = useQuery({
    queryKey: ['crm-partner-sphere', dept],
    queryFn: () => departmentsApi.crmPartnerSphere(dept),
    refetchInterval: 120_000,
  });

  if (query.isLoading) {
    return (
      <div className="sd-empty">
        <div className="h-7 w-7 animate-spin rounded-full" style={{ border: `2px solid ${color}`, borderTopColor: 'transparent' }} />
        <p>Loading Partner Sphere…</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="sd-empty">
        <Users className="h-10 w-10" style={{ color: MUTED }} />
        <h2>Unable to load Partner Sphere</h2>
        <p>The gbrain source could not be reached. Try refreshing.</p>
      </div>
    );
  }

  const sphere: PartnerSphereData = query.data;

  return (
    <div className="sd-stack">
      {/* 9-section nav */}
      <div className="sd-chart-card" style={{ padding: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              padding: '6px 13px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
              border: `1px solid ${section === s.id ? color : BORDER}`,
              background: section === s.id ? 'rgba(0,122,255,0.12)' : 'transparent',
              color: section === s.id ? color : MUTED,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'overview' && sphere.overview && <SphereOverview data={sphere.overview} color={color} />}
      {section === 'masterList' && <SphereMasterList data={sphere.masterList} color={color} />}
      {section === 'profile' && <PartnerProfileSelector masterList={sphere.masterList} profileData={sphere.profile} color={color} />}
      {section === 'deals' && <PartnerDealsSection dept={dept} color={color} masterList={sphere.masterList} />}
      {section === 'commandCenter' && sphere.commandCenter && <SphereCommandCenter data={sphere.commandCenter} color={color} />}
      {section === 'protection' && sphere.protection && <SphereProtection data={sphere.protection} color={color} />}
      {section === 'onboarding' && sphere.onboarding && <SphereOnboarding data={sphere.onboarding} color={color} />}
      {section === 'qbr' && sphere.qbr && <SphereQbr data={sphere.qbr} color={color} />}
      {section === 'ceoDigest' && sphere.ceoDigest && <SphereCeoDigest data={sphere.ceoDigest} color={color} />}
      {section === 'pricing' && sphere.pricing && <SpherePricing data={sphere.pricing} color={color} />}
    </div>
  );
}