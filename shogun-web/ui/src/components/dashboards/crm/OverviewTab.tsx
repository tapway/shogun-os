import { useState } from 'react';
import type { CeoDashboardStats } from '../../../lib/types';
import { SalesPulseTab } from './SalesPulseTab';
import { PipelineForecastTab } from './PipelineForecastTab';
import { PartnerPerformanceTab } from './PartnerPerformanceTab';
import { ManagerPerformanceTab } from './ManagerPerformanceTab';
import { DealsDeepDiveTab } from './DealsDeepDiveTab';
import { OmnichannelChatTab } from './OmnichannelChatTab';

const MUTED = 'var(--samurai-muted)';
const TEXT = 'var(--samurai-text)';
const BORDER = 'var(--samurai-border)';

const VIEWS = [
  { id: 'sales', label: 'Sales Booking' },
  { id: 'pipeline', label: 'Pipeline & Forecast' },
  { id: 'partnerperf', label: 'Partner Performance' },
  { id: 'managers', label: 'Manager Performance' },
  { id: 'deepdive', label: 'Deals Deep-Dive' },
  { id: 'omnichannel', label: 'Omnichannel' },
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
            {v.label}
          </button>
        ))}
      </div>

      {view === 'sales' && <SalesPulseTab stats={stats} color={color} />}
      {view === 'pipeline' && <PipelineForecastTab stats={stats} color={color} />}
      {view === 'partnerperf' && <PartnerPerformanceTab stats={stats} color={color} />}
      {view === 'managers' && <ManagerPerformanceTab stats={stats} color={color} onDrillDown={onDrillDown} />}
      {view === 'deepdive' && <DealsDeepDiveTab stats={stats} color={color} />}
      {view === 'omnichannel' && <OmnichannelChatTab stats={stats} color={color} />}
    </div>
  );
}