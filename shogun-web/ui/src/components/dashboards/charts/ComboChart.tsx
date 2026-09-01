import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ChartEmpty, CHART_TICK, CHART_TOOLTIP_STYLE, compactTick } from './empty';

interface ComboSeries {
  key: string;
  label: string;
  type: 'bar' | 'line';
  color: string;
}

interface ComboChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  xKey: string;
  series: ComboSeries[];
  unit?: string;
  height?: number;
}

export function ComboChart({ data, xKey, series, unit = '', height = 250 }: ComboChartProps) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  const fmt = (v: unknown, name: string) =>
    [unit ? `${unit}${Number(v ?? 0).toLocaleString()}` : Number(v ?? 0).toLocaleString(), name] as [string, string];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--samurai-border)" />
        <XAxis dataKey={xKey} tick={CHART_TICK} axisLine={false} tickLine={false} />
        <YAxis
          tick={CHART_TICK} axisLine={false} tickLine={false}
          tickFormatter={compactTick(unit)}
        />
        <Tooltip
          formatter={fmt as never}
          contentStyle={CHART_TOOLTIP_STYLE}
          labelFormatter={(label) => `${label}`}
        />
        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        {series.map((s) =>
          s.type === 'bar' ? (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
          ) : (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
