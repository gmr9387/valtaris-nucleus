import { Activity, AlertTriangle, CircleCheck, CircleX, HelpCircle } from "lucide-react";

export type Health = "healthy" | "degraded" | "failed" | "unknown";

export function HealthIndicator({
  status,
  latencyMs,
}: {
  status: Health;
  latencyMs?: number | null;
}) {
  const map: Record<Health, { cls: string; Icon: typeof Activity; label: string }> = {
    healthy: {
      cls: "text-status-paid border-status-paid/30 bg-status-paid/10",
      Icon: CircleCheck,
      label: "Healthy",
    },
    degraded: {
      cls: "text-status-pending border-status-pending/30 bg-status-pending/10",
      Icon: AlertTriangle,
      label: "Degraded",
    },
    failed: {
      cls: "text-status-denied border-status-denied/30 bg-status-denied/10",
      Icon: CircleX,
      label: "Failed",
    },
    unknown: {
      cls: "text-muted-foreground border-border bg-surface-2",
      Icon: HelpCircle,
      label: "Unknown",
    },
  };
  const { cls, Icon, label } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-mono-xs ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {label}
      {typeof latencyMs === "number" && <span className="ml-1 opacity-70">{latencyMs}ms</span>}
    </span>
  );
}
