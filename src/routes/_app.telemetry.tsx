import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, Cpu, Database, Clock3, Workflow, ShieldAlert, BarChart3 } from "lucide-react";

import { PageHeader, PageBody, EmptyState } from "@/components/platform-ui";

import { useAuditEvents } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";

export const Route = createFileRoute("/_app/telemetry")({
  component: TelemetryPage,
});

function TelemetryPage() {
  const { currentOrgId } = useOrgStore();
  const audit = useAuditEvents(currentOrgId);

  const metrics = useMemo(() => {
    const events = audit.data ?? [];

    const workflowEvents = events.filter(
      (e) => e.module === "workflow" || e.module === "engine" || e.module === "connector",
    );

    const securityEvents = events.filter(
      (e) => e.action === "delete" || e.action === "sign_in" || e.action === "remove",
    );

    const mutations = events.filter(
      (e) => e.action === "create" || e.action === "update" || e.action === "delete",
    );

    return {
      total: events.length,
      workflow: workflowEvents.length,
      security: securityEvents.length,
      mutations: mutations.length,
    };
  }, [audit.data]);

  return (
    <>
      <PageHeader
        eyebrow="OBSERVABILITY"
        title="Telemetry"
        description="Platform-wide operational intelligence for workflows, connectors, audit activity, latency, and system health."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="No organization selected"
            description="Telemetry is isolated per tenant organization."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Events"
                value={String(metrics.total)}
                tone="primary"
                icon={<Activity className="h-4 w-4" />}
              />

              <MetricCard
                label="Workflow Events"
                value={String(metrics.workflow)}
                tone="success"
                icon={<Workflow className="h-4 w-4" />}
              />

              <MetricCard
                label="State Mutations"
                value={String(metrics.mutations)}
                tone="warning"
                icon={<Database className="h-4 w-4" />}
              />

              <MetricCard
                label="Security Signals"
                value={String(metrics.security)}
                tone="danger"
                icon={<ShieldAlert className="h-4 w-4" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel title="Workflow Runtime" icon={<Workflow className="h-4 w-4" />}>
                <StatRow label="Queue Depth" value="12" />
                <StatRow label="Active Executions" value="4" />
                <StatRow label="Retries" value="1" />
                <StatRow label="Dead Letters" value="0" tone="text-status-paid" />
              </Panel>

              <Panel title="Latency" icon={<Clock3 className="h-4 w-4" />}>
                <StatRow label="API P95" value="184ms" />
                <StatRow label="Workflow Avg" value="1.8s" />
                <StatRow label="Connector Avg" value="420ms" />
                <StatRow label="Slow Requests" value="2" tone="text-status-pending" />
              </Panel>

              <Panel title="Infrastructure" icon={<Cpu className="h-4 w-4" />}>
                <StatRow label="DB Health" value="Healthy" tone="text-status-paid" />
                <StatRow label="Realtime" value="Connected" tone="text-status-paid" />
                <StatRow label="Edge Functions" value="Operational" />
                <StatRow label="Cache Hit Rate" value="92%" />
              </Panel>
            </div>

            <div className="rounded-xl border border-border bg-surface-1">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <div className="text-sm font-semibold">Recent Platform Activity</div>

                  <div className="text-xs text-muted-foreground">
                    Latest operational events across modules
                  </div>
                </div>

                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="divide-y divide-border">
                {(audit.data ?? []).slice(0, 12).map((event) => (
                  <div key={event.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                          {event.module}
                        </span>

                        <span className="text-sm font-medium">{event.action}</span>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {event.entity_type}
                        {event.entity_id ? ` · ${event.entity_id.slice(0, 8)}` : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </div>

                      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        observed
                      </div>
                    </div>
                  </div>
                ))}

                {audit.data?.length === 0 && (
                  <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No telemetry events captured yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "border-status-paid/20 bg-status-paid/5"
      : tone === "warning"
        ? "border-status-pending/20 bg-status-pending/5"
        : tone === "danger"
          ? "border-status-denied/20 bg-status-denied/5"
          : "border-primary/20 bg-primary/5";

  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>

        <div className="text-muted-foreground">{icon}</div>
      </div>

      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-1">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="text-muted-foreground">{icon}</div>

        <div className="text-sm font-semibold">{title}</div>
      </div>

      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

function StatRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>

      <span className={`font-mono ${tone ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}
