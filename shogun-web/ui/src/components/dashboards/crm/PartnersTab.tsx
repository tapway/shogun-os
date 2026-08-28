import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { departmentsApi } from '../../../lib/api';
import type {
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
  const ActionCard = ({ item, tone }: { item: { title: string; detail: string; owner: string; due?: string; ttl?: string; done?: boolean }; tone: 'bad' | 'neutral' | 'good' }) => (
    <div style={{ background: SURFACE_2, borderRadius: 10, padding: '10px 14px', borderLeft: `3px solid ${tone === 'bad' ? '#ff453a' : tone === 'good' ? '#34c77b' : color}`, opacity: item.done ? 0.55 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT, textDecoration: item.done ? 'line-through' : 'none' }}>{item.title}</span>
        <span style={{ fontSize: '0.72rem', color: MUTED, whiteSpace: 'nowrap' }}>{item.owner} · {item.due || item.ttl}</span>
      </div>
      <div style={{ fontSize: '0.76rem', color: MUTED, marginTop: 4 }}>{item.detail}</div>
    </div>
  );

  return (
    <div className="sd-stack">
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
        <div className="sd-stack" style={{ gap: 10, marginTop: 6 }}>{data.overdue.map((o) => <ActionCard key={o.title} item={o} tone="bad" />)}</div>
      </Card>

      <Card title="🟢 Today's actions" subtitle="tap ✓ when done — logs to CRM automatically">
        <div className="sd-stack" style={{ gap: 10, marginTop: 6 }}>{data.today.map((o) => <ActionCard key={o.title} item={o} tone={o.done ? 'good' : 'neutral'} />)}</div>
      </Card>

      <Card title="🟡 Coming up this week" subtitle="no need to look at these until their day">
        <div className="sd-stack" style={{ gap: 10, marginTop: 6 }}>{data.upcoming.map((o) => <ActionCard key={o.title} item={o} tone="neutral" />)}</div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card title="🔁 Partner rituals — scheduling status">
          {data.rituals.map((r) => (
            <div key={r.title} style={{ padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: TEXT }}>{r.title}</span>
                <Pill text={r.state ?? ''} tone={r.state === 'BOOKED' ? 'good' : r.state === 'NEEDS BOOKING' ? 'bad' : 'warn'} />
              </div>
              <div style={{ fontSize: '0.74rem', color: MUTED, marginTop: 3 }}>{r.detail}</div>
              <div style={{ fontSize: '0.72rem', color, marginTop: 2 }}>{r.owner}</div>
            </div>
          ))}
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
  return (
    <div className="sd-stack">
      <Card title="📥 Partner Onboarding Pipeline" subtitle={`${data.pipelineSummary} · stage-age turns amber at benchmark, red at 2×`}>
        {/* Status columns: left → right (one per stage, no wrapping); cards stack top → down within each column */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.stages.length}, minmax(215px, 1fr))`, gap: 12 }}>
            {data.stages.map((s) => (
              <div key={s.key} style={{ background: SURFACE_2, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column' }}>
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
                  <div key={c.name} style={{
                    background: SURFACE, borderRadius: 8, padding: 10,
                    borderLeft: `3px solid ${c.health === 'danger' ? '#ff453a' : c.health === 'warn' ? '#ffb340' : '#34c77b'}`,
                  }}>
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
  const delivery = data.deliverySettings ?? data.delivery2 ?? [];
  return (
    <div className="sd-stack">
      <Card title={`📮 TPS Weekly Digest — Partner Sphere`} subtitle={`${data.week} · ${data.delivery}`}>
        <div className="sd-kpi-grid">
          {data.kpis.map((k) => <Kpi key={k.label} label={k.label} value={k.value} note={k.delta} accent={color} />)}
        </div>
      </Card>

      <Card title="🔴 Needs your decision">
        <div className="sd-stack" style={{ gap: 10 }}>
          {data.decisions.map((d) => (
            <div key={d.title} style={{ background: 'rgba(255,69,58,0.08)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT }}>{d.title}</div>
              <div style={{ fontSize: '0.76rem', color: MUTED, marginTop: 3 }}>{d.detail}</div>
              <div style={{ fontSize: '0.74rem', color: '#ff453a', marginTop: 4 }}>owner: {d.owner} · {d.due}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="🟢 Wins of the week">
        <div className="sd-stack" style={{ gap: 10 }}>
          {data.wins.map((w) => (
            <div key={w.title} style={{ background: 'rgba(52,199,123,0.08)', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.74rem', color: '#34c77b', marginRight: 8 }}>{w.emoji}</span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT }}>{w.title}</span>
              <div style={{ fontSize: '0.76rem', color: MUTED, marginTop: 3 }}>{w.detail}</div>
              <div style={{ fontSize: '0.74rem', color: '#34c77b', marginTop: 4 }}>{w.owner}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="🟡 Watch list">
        <div className="sd-stack" style={{ gap: 10 }}>
          {data.watch.map((w) => (
            <div key={w.title} style={{ background: SURFACE_2, borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Pill text={w.tag || ''} tone="warn" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: TEXT }}>{w.title}</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: MUTED, marginTop: 3 }}>{w.detail}</div>
              <div style={{ fontSize: '0.74rem', color, marginTop: 4 }}>{w.owner}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="📆 Rituals & protection health">
        <StatLine label="🛡️ Deal protections" value={data.rituals.protections} />
        <StatLine label="🔁 Cadence calls" value={data.rituals.cadence} />
        <StatLine label="📊 Q3 review cycle" value={data.rituals.q3} />
      </Card>

      {delivery.length > 0 && (
        <Card title="⚙️ Delivery settings">
          {delivery.map((d) => (
            <div key={d.channel} style={{ padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: TEXT }}>{d.channel}: </span>
              <span style={{ fontSize: '0.78rem', color: MUTED }}>{d.detail}</span>
            </div>
          ))}
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
  const [bundle, setBundle] = useState(data.bundles.find((b) => b.name === 'Base') ?? data.bundles[0]);

  const tierDiscount = data.tiers.find((t) => t.name === tier)?.discount ?? '';
  const pct = tierDiscount ? parseInt(tierDiscount.replace(/[^0-9]/g, ''), 10) : 0;
  const show = (price: number) => {
    const adj = Math.round(price * (1 - pct / 100));
    return `${currency === 'MYR' ? 'RM' : currency === 'SGD' ? 'S$' : 'US$'} ${adj.toLocaleString()}`;
  };

  return (
    <div className="sd-stack">
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

      <Card title="📦 Choose Your Bundle" subtitle={data.bundleNote}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {data.bundles.map((b) => {
            const active = bundle?.name === b.name;
            return (
              <button key={b.name} onClick={() => setBundle(b)}
                style={{
                  textAlign: 'left', background: active ? 'rgba(0,122,255,0.12)' : SURFACE_2,
                  border: `1px solid ${active ? color : BORDER}`, borderRadius: 12, padding: 16, cursor: 'pointer',
                }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: TEXT }}>{b.name}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: active ? color : TEXT, marginTop: 4 }}>
                  {show(b.price)}<span style={{ fontSize: '0.75rem', color: MUTED }}>{b.per}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 4 }}>{b.tagline}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card title="🔵 What you can do with Base:">
          <ul style={{ paddingLeft: 16, fontSize: '0.8rem', color: TEXT }}>
            {data.baseFeatures.map((f) => <li key={f} style={{ margin: '4px 0' }}>{f}</li>)}
          </ul>
          <div style={{ fontSize: '0.74rem', color: MUTED, marginTop: 10 }}>{data.addonCameras.note}</div>
        </Card>
        <Card title="🏪 One-Time Setup" subtitle={data.setup.note}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '0.8rem', color: TEXT }}>Number of outlets · {show(data.setup.price)}/{data.setup.unit}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color }}>{data.setup.count}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: '0.8rem', color: TEXT }}>Extra cameras per outlet · {show(data.addonCameras.price)}/{data.addonCameras.unit}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color }}>{data.addonCameras.count}</span>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card title="🛠️ Professional Services" subtitle="charged per man day">
          {data.services.map((s) => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.8rem', color: TEXT }}>{s.name}</span>
              <span style={{ fontSize: '0.8rem', color: MUTED }}>{show(s.price)}/{s.unit} · <span style={{ color }}>{s.count}</span></span>
            </div>
          ))}
        </Card>
        <Card title="📍 Outstation" subtitle="outside Klang Valley">
          {data.outstation.map((o) => (
            <div key={o.name} style={{ padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: '0.8rem', color: TEXT, fontWeight: 500 }}>{o.name}</div>
              <div style={{ fontSize: '0.76rem', color: MUTED }}>
                {show(o.trip)}/trip + {show(o.night)}/night · Trips: {o.trips} · Nights: {o.nights}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card title="💰 Pricing Summary" subtitle="Monthly + one-time costs">
        <div className="sd-stack" style={{ gap: 0 }}>
          {[data.summary.bundle, data.summary.setup, data.summary.addonCameras, data.summary.pm,
            data.summary.customisation, data.summary.consulting, data.summary.outstation].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: '0.82rem', color: row.monthly ? TEXT : MUTED }}>
                {row.label} {row.monthly ? <span style={{ fontSize: '0.7rem', color: MUTED }}>(monthly)</span> : <span style={{ fontSize: '0.7rem', color: MUTED }}>(one-time)</span>}
              </span>
              <span style={{ fontSize: '0.82rem', color: row.monthly ? color : TEXT, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 14 }}>
          <Kpi label="Monthly recurring" value={data.summary.monthlyRecurring} accent={color} />
          <Kpi label="One-time charges" value={data.summary.oneTime} />
          <Kpi label="Total (1st month)" value={data.summary.totalFirstMonth} accent={color} />
          <Kpi label="Per outlet per month" value={data.summary.perOutletMonth} />
        </div>
        <div style={{ marginTop: 12, fontSize: '0.74rem', color: MUTED }}>{data.summary.spread36}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Btn primary>📅 Spread All Costs Over 36 Months</Btn>
          <Btn>📋 Copy Summary to Clipboard</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main: Partner Sphere                                                */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'masterList', label: '📇 Partners' },
  { id: 'profile', label: '🏢 Syspex Profile' },
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
        {sphere.mock && <Pill text="MOCK DATA" tone="warn" />}
      </div>

      {section === 'overview' && sphere.overview && <SphereOverview data={sphere.overview} color={color} />}
      {section === 'masterList' && <SphereMasterList data={sphere.masterList} color={color} />}
      {section === 'profile' && sphere.profile && <SphereProfile data={sphere.profile} color={color} />}
      {section === 'commandCenter' && sphere.commandCenter && <SphereCommandCenter data={sphere.commandCenter} color={color} />}
      {section === 'protection' && sphere.protection && <SphereProtection data={sphere.protection} color={color} />}
      {section === 'onboarding' && sphere.onboarding && <SphereOnboarding data={sphere.onboarding} color={color} />}
      {section === 'qbr' && sphere.qbr && <SphereQbr data={sphere.qbr} color={color} />}
      {section === 'ceoDigest' && sphere.ceoDigest && <SphereCeoDigest data={sphere.ceoDigest} color={color} />}
      {section === 'pricing' && sphere.pricing && <SpherePricing data={sphere.pricing} color={color} />}
    </div>
  );
}