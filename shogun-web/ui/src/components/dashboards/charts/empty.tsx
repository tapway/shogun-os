interface ChartEmptyProps {
  message?: string;
}

export function ChartEmpty({ message = 'No data' }: ChartEmptyProps) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        minHeight: '200px',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0.75rem',
        border: `1px dashed var(--samurai-border)`,
        background: 'var(--samurai-surface)',
        color: 'var(--samurai-muted)',
        fontSize: '0.85rem',
      }}
    >
      {message}
    </div>
  );
}

export const CHART_TOOLTIP_STYLE = {
  background: 'var(--samurai-surface-2)',
  border: '1px solid var(--samurai-border)',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
  color: 'var(--samurai-text)',
} as const;

export const CHART_TICK = { fontSize: 11, fill: 'var(--samurai-muted)' } as const;
export const CHART_TICK_SMALL = { fontSize: 10, fill: 'var(--samurai-muted)' } as const;

/** Compact Y-axis tick formatter: RM 30M, RM 500K, etc. Prevents label clipping. */
export function compactTick(unit: string) {
  return (v: number): string => {
    const abs = Math.abs(v);
    let formatted: string;
    if (abs >= 1_000_000) formatted = `${(v / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    else if (abs >= 1_000) formatted = `${(v / 1_000).toFixed(0)}K`;
    else formatted = v.toLocaleString();
    return unit ? `${unit}${formatted}` : formatted;
  };
}