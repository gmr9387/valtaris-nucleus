import { createFileRoute } from "@tanstack/react-router";
import { useAuditEvents, useEnvironments, useMyOrganizations, useProjects } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { PageHeader, PageBody, EmptyState } from "@/components/platform-ui";
import {
  Activity,
  Building2,
  FolderKanban,
  Server,
  ScrollText,
  ShieldCheck,
  Workflow,
  PlugZap,
} from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { currentOrgId } = useOrgStore();

  const orgs = useMyOrganizations();
  const projects = useProjects(currentOrgId);
  const envs = useEnvironments(currentOrgId);
  const audit = useAuditEvents(currentOrgId);

  const currentOrg = orgs.data?.find((org) => org.id === currentOrgId);

  const stats = [
    {
      label: "Organizations",
      value: orgs.data?.length ?? 0,
      icon: Building2,
      tone: "primary",
    },
    {
      label: "Projects",
      value: projects.data?.length ?? 0,
      icon: FolderKanban,
      tone: "success",
    },
    {
      label: "Environments",
      value: envs.data?.length ?? 0,
      icon: Server,
      tone: "warning",
    },
    {
      label: "Audit Events",
      value: audit.data?.length ?? 0,
      icon: ScrollText,
      tone: "neutral",
    },
  ] as const;

  const recent = audit.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="OVERVIEW"
        title={currentOrg?.name ?? "ValtariOS Core"}
        description="Live control plane for tenants, projects, environments, audit activity, and platform foundations."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select or create an organization"
            description="ValtariOS Core starts with a tenant. Create an organization, then add projects and environments."
            icon={<Building2 className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat) => (
                <MetricCard
                  key={stat.label}
                  label={stat.label}
                  value={String(stat.value)}
                  icon={<stat.icon className="h-4 w-4" />}
                  tone={stat.tone}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Panel
                title="Core Readiness"
                description="Foundation modules currently active."
                icon={<ShieldCheck className="h-4 w-4" />}
              >
                <ReadinessRow label="Identity" status="Active" tone="good" />
                <ReadinessRow label="Tenancy" status="Active" tone="good" />
                <ReadinessRow label="Audit" status="Active" tone="good" />
                <ReadinessRow label="Telemetry" status="Partial" tone="warn" />
              </Panel>

              <Panel
                title="Runtime Hooks"
                description="Shared services future products will consume."
                icon={<Workflow className="h-4 w-4" />}
              >
                <ReadinessRow label="Workflows" status="Planned" />
                <ReadinessRow label="Decisions" status="Planned" />
                <ReadinessRow label="Evidence" status="Planned" />
                <ReadinessRow label="Governance" status="Planned" />
              </Panel>

              <Panel
                title="Integration Layer"
                description="Connector and secret management runway."
                icon={<PlugZap className="h-4 w-4" />}
              >
                <ReadinessRow label="Secrets" status="Planned" />
                <ReadinessRow label="Connectors" status="Planned" />
                <ReadinessRow label="Policies" status="Planned" />
                <ReadinessRow label="Usage Metering" status="Planned" />
              </Panel>
            </div>

            <div className="rounded-lg border border-border bg-surface-1">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">Recent Activity</h2>
                  <p className="text-xs text-muted-foreground">
                    Tenant-scoped audit feed for platform actions.
                  </p>
                </div>

                <span className="text-mono-xs text-muted-foreground">{recent.length} EVENTS</span>
              </div>

              <div className="divide-y divide-border">
                {recent.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-surface-2/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-mono-xs text-primary">
                        {event.module.toUpperCase()}
                      </span>

                      <span className="truncate">
                        {event.action}{" "}
                        <span className="text-muted-foreground">{event.entity_type}</span>
                      </span>
                    </div>

                    <span className="text-mono-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}

                {recent.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No activity yet.
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
  tone: "primary" | "success" | "warning" | "neutral";
}) {
  const cls =
    tone === "success"
      ? "border-status-paid/20 bg-status-paid/5"
      : tone === "warning"
        ? "border-status-pending/20 bg-status-pending/5"
        : tone === "primary"
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-surface-1";

  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="flex items-center justify-between">
        <span className="text-mono-xs text-muted-foreground">{label.toUpperCase()}</span>

        <div className="text-muted-foreground">{icon}</div>
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-1">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>

        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="space-y-2 p-4">{children}</div>
    </div>
  );
}

function ReadinessRow({
  label,
  status,
  tone,
}: {
  label: string;
  status: string;
  tone?: "good" | "warn";
}) {
  const cls =
    tone === "good"
      ? "text-status-paid"
      : tone === "warn"
        ? "text-status-pending"
        : "text-muted-foreground";

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs ${cls}`}>{status}</span>
    </div>
  );
}
