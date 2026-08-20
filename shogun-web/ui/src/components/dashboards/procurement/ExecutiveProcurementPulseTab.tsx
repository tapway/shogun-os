import { AlertTriangle, Package, TrendingDown, TrendingUp } from "lucide-react";
import { BarChart, LineChart } from "../charts";
import type { ProcurementDashboardStats } from "../../../lib/types";

interface Props {
  stats: ProcurementDashboardStats;
  color: string;
  onNavigateTab?: (tabId: string) => void;
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `RM ${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
      ? `RM ${(n / 1_000).toFixed(0)}K`
      : `RM ${n.toFixed(0)}`;

const LOW_STOCK_BADGE = (n: number) => {
  if (n === 0) return { label: "Healthy", cls: "ok" };
  if (n <= 3) return { label: "Caution", cls: "warn" };
  return { label: "Critical", cls: "bad" };
};

const MUTED = "var(--samurai-muted)";
const TEXT = "var(--samurai-text)";
const DANGER = "var(--samurai-danger)";

export function ExecutiveProcurementPulseTab({
  stats,
  color,
  onNavigateTab,
}: Props) {
  const lsBadge = LOW_STOCK_BADGE(stats.lowStockAlerts);
  const spendPct =
    stats.procurementSpendBudgetMtd > 0
      ? (stats.procurementSpendMtd / stats.procurementSpendBudgetMtd) * 100
      : 0;
  const deadPct =
    stats.totalInventoryValuation > 0
      ? (stats.deadSlowStockCapital / stats.totalInventoryValuation) * 100
      : 0;

  const KPIs: Array<{
    label: string;
    value: string;
    badge?: { label: string; cls: string };
    sub?: string;
    targetTab?: string;
  }> = [
    {
      label: "Total Inventory Valuation",
      value: fmt(stats.totalInventoryValuation),
    },
    {
      label: "Total Active SKUs",
      value: (stats.totalActiveSkus || 0).toLocaleString(),
      targetTab: "inventory",
    },
    {
      label: "Low-Stock Alerts",
      value: `${stats.lowStockAlerts}`,
      badge: lsBadge,
      targetTab: "inventory",
    },
    {
      label: "Dead & Slow Stock Capital",
      value: fmt(stats.deadSlowStockCapital),
      targetTab: "inventory",
    },
    {
      label: "Open Purchase Orders",
      value: `${stats.openPoCount}`,
      sub: fmt(stats.openPoValue),
      targetTab: "requisitions",
    },
    {
      label: "Procurement Spend MTD",
      value: fmt(stats.procurementSpendMtd),
      sub: `of ${fmt(stats.procurementSpendBudgetMtd)} budget`,
    },
  ];

  const SPEND_TREND_SERIES = [
    { key: "spend", label: "Actual Spend", type: "line" as const, color },
    { key: "budget", label: "Budget", type: "line" as const, color: "#94a3b8" },
  ];

  const ALERT_ICON: Record<string, typeof TrendingDown> = {
    safety_breach: AlertTriangle,
    dead_stock: TrendingDown,
    lead_time_delay: TrendingUp,
  };

  const getAlertTargetTab = (type: string, message: string): string => {
    const msg = message || "";
    if (type === "safety_breach" || msg.includes("safety stock"))
      return "inventory";
    if (type === "dead_stock" || msg.includes("slow-moving stock"))
      return "inventory";
    if (
      type === "lead_time_delay" ||
      msg.includes("past expected delivery")
    )
      return "po";
    return "inventory";
  };

  return (
    <div className="sd-stack">
      {/* KPI Cards */}
      <div className="sd-kpi-grid">
        {KPIs.map((kpi) => {
          const isClickable = !!kpi.targetTab;
          return (
            <div
              key={kpi.label}
              onClick={() => kpi.targetTab && onNavigateTab?.(kpi.targetTab)}
              className={`sd-kpi-card${isClickable ? " interactive" : ""}`}
              style={isClickable ? { cursor: "pointer" } : undefined}
            >
              <div className="sd-kpi-label">{kpi.label}</div>
              <div className="sd-kpi-value">{kpi.value}</div>
              {kpi.badge && (
                <span className={`sd-chip ${kpi.badge.cls}`} style={{ marginTop: "0.4rem" }}>
                  {kpi.badge.label}
                </span>
              )}
              {kpi.sub && (
                <div className="sd-kpi-sub" style={{ fontSize: "0.72rem", color: MUTED }}>
                  {kpi.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="sd-row">
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Inventory Valuation by Category</h3>
          <BarChart
            data={stats.valuationByCategory}
            xKey="category"
            yKey="value"
            color={color}
            unit="RM "
            height={220}
            dataKeys={["value"]}
            colors={[color]}
          />
        </div>
        <div className="sd-chart-card">
          <h3 className="sd-chart-title">Procurement Spend vs Budget (12 Mo)</h3>
          <LineChart
            data={stats.spendVsBudgetTrend}
            xKey="month"
            yKey="spend"
            color={color}
            unit="RM "
            height={220}
            dataKeys={["spend", "budget"]}
            colors={[color, "var(--samurai-muted)"]}
            labels={{ spend: "Actual Spend", budget: "Budget" }}
          />
        </div>
      </div>

      {/* Dead Stock & Spend Footers */}
      <div className="sd-row">
        <div className="sd-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="sd-kpi-label">Dead & Slow Stock Capital</div>
            <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: "0.2rem" }}>
              {deadPct.toFixed(1)}% of total inventory valuation
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 600, color: deadPct > 15 ? DANGER : TEXT }}>
            {fmt(stats.deadSlowStockCapital)}
          </span>
        </div>
        <div className="sd-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="sd-kpi-label">Procurement Spend MTD</div>
            <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: "0.2rem" }}>
              {spendPct.toFixed(1)}% of monthly budget
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 600, color: spendPct > 100 ? DANGER : TEXT }}>
            {fmt(stats.procurementSpendMtd)}
          </span>
        </div>
      </div>
    </div>
  );
}
