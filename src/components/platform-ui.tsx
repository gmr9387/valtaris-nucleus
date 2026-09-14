import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border bg-surface-1/30 px-6 py-5">
      <div className="min-w-0">
        {eyebrow && <p className="text-mono-xs text-muted-foreground">{eyebrow}</p>}

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>

        {description && (
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="p-6">{children}</div>;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-1/40 p-12 text-center">
      {icon && (
        <div className="mb-3 rounded-full border border-border bg-surface-2 p-3 text-muted-foreground">
          {icon}
        </div>
      )}

      <p className="text-sm font-medium">{title}</p>

      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-success",
    paused: "bg-warning",
    suspended: "bg-warning",
    archived: "bg-muted-foreground",

    development: "bg-chart-4",
    staging: "bg-warning",
    production: "bg-success",

    planned: "bg-muted-foreground",
    draft: "bg-muted-foreground",
    pending: "bg-warning",
    approved: "bg-success",
    rejected: "bg-destructive",
    failed: "bg-destructive",
    healthy: "bg-success",
  };

  return (
    <span
      className={"inline-block h-1.5 w-1.5 rounded-full " + (map[status] ?? "bg-muted-foreground")}
    />
  );
}

export function StatusPill({ status, children }: { status: string; children?: ReactNode }) {
  const cls =
    status === "active" || status === "production" || status === "approved" || status === "healthy"
      ? "border-status-paid/30 bg-status-paid/10 text-status-paid"
      : status === "pending" || status === "staging" || status === "paused" || status === "planned"
        ? "border-status-pending/30 bg-status-pending/10 text-status-pending"
        : status === "failed" || status === "rejected" || status === "suspended"
          ? "border-status-denied/30 bg-status-denied/10 text-status-denied"
          : "border-border bg-surface-2 text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-mono-xs ${cls}`}
    >
      <StatusDot status={status} />
      {children ?? status.toUpperCase()}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: "primary" | "good" | "warn" | "danger" | "neutral";
}) {
  const cls =
    tone === "good"
      ? "border-status-paid/20 bg-status-paid/5"
      : tone === "warn"
        ? "border-status-pending/20 bg-status-pending/5"
        : tone === "danger"
          ? "border-status-denied/20 bg-status-denied/5"
          : tone === "neutral"
            ? "border-border bg-surface-1"
            : "border-primary/20 bg-primary/5";

  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>

        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

export function Panel({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-1">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-start gap-3">
          {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}

          <div>
            <h2 className="text-sm font-semibold">{title}</h2>

            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

export function ComingSoon({
  module,
  description,
  phase = "PHASE_2",
}: {
  module: string;
  description: string;
  phase?: string;
}) {
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-1/40 px-6 py-20 text-center">
        <p className="text-mono-xs text-primary">{phase} · ROADMAP</p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight">{module}</h2>

        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

        <div className="mt-6 grid w-full max-w-lg grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
          {["Schema", "Service", "UI"].map((item) => (
            <div key={item} className="bg-surface-1 p-3 text-left">
              <div className="text-mono-xs text-muted-foreground">{item.toUpperCase()}</div>
              <div className="mt-1 text-xs">Planned</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
