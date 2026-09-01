import { useState } from 'react';
import type { CeoDashboardStats } from '../../../lib/types';
import { SalesPulseTab } from './SalesPulseTab';
import { PipelineForecastTab } from './PipelineForecastTab';
import { PartnerPerformanceTab } from './PartnerPerformanceTab';
import { ManagerPerformanceTab } from './ManagerPerformanceTab';
import { DealsDeepDiveTab } from './DealsDeepDiveTab';
import { CrmIcon } from './CrmIcons';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

const VIEWS = [
  { id: 'sales', label: 'Sales Booking', icon: 'BarChart3' as const },
  { id: 'pipeline', label: 'Pipeline & Forecast', icon: 'TrendingUp' as const },
  { id: 'partnerperf', label: 'Partner Performance', icon: 'Handshake' as const },
  { id: 'managers', label: 'Manager Performance', icon: 'Users' as const },
  { id: 'deepdive', label: 'Deals Deep-Dive', icon: 'Target' as const },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

interface Props {
  dept: string;
  color: string;
  stats: CeoDashboardStats;
  onDrillDown: (owner: string) => void;
}

export function OverviewTab({ dept, color, stats, onDrillDown }: Props) {
  const [view, setView] = useState<ViewId>('sales');

  return (
    <div className="sd-stack" style={{ gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              padding: '5px 13px',
              borderRadius: 999,
              fontSize: '0.78rem',
              cursor: 'pointer',
              border: `1px solid ${view === v.id ? color : BORDER}`,
              background: view === v.id ? 'rgba(0,122,255,0.12)' : 'transparent',
              color: view === v.id ? color : MUTED,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <CrmIcon name={v.icon} size={13} />
              {v.label}
            </span>
          </button>
        ))}
      </div>

      {view === 'sales' && <SalesPulseTab stats={stats} color={color} />}
      {view === 'pipeline' && <PipelineForecastTab stats={stats} color={color} />}
      {view === 'partnerperf' && <PartnerPerformanceTab stats={stats} color={color} />}
      {view === 'managers' && <ManagerPerformanceTab stats={stats} color={color} onDrillDown={onDrillDown} />}
      {view === 'deepdive' && <DealsDeepDiveTab stats={stats} color={color} />}
    </div>
  );
}