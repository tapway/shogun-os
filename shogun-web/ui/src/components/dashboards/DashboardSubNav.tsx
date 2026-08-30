import clsx from 'clsx';
import type { DashboardTab } from '../../lib/types';

interface DashboardSubNavProps {
  tabs: DashboardTab[];
  active: string;
  onChange: (id: string) => void;
  /** Compact pill variant — same design & selection effect as the Onboarding
      sub-tabs (Status / Checklist). Used for second-level group tabs. */
  compact?: boolean;
}

export function DashboardSubNav({ tabs, active, onChange, compact = false }: DashboardSubNavProps) {
  return (
    <div className={clsx(compact ? 'sd-subnav-pill-group' : 'sd-subnav-bar')}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={clsx('sd-subnav-pill', active === tab.id && 'active')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
