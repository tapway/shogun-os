import clsx from 'clsx';
import type { DashboardTab } from '../../lib/types';

interface DashboardSubNavProps {
  tabs: DashboardTab[];
  active: string;
  onChange: (id: string) => void;
  /** Compact second-level nav (smaller pills, lighter weight). */
  compact?: boolean;
}

export function DashboardSubNav({ tabs, active, onChange, compact = false }: DashboardSubNavProps) {
  return (
    <div
      className={clsx('sd-subnav-bar', compact && 'sd-subnav-compact')}
      style={compact ? { marginTop: '-0.4rem' } : undefined}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={clsx('sd-subnav-pill', active === tab.id && 'active')}
          style={compact ? { fontSize: '0.72rem', padding: '0.28rem 0.65rem' } : undefined}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
