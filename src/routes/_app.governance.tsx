import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ShieldCheck,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  LockKeyhole,
  Scale,
  ClipboardCheck,
} from "lucide-react";
import { PageHeader, PageBody, EmptyState } from "@/components/platform-ui";
import { useOrgStore } from "@/lib/org-store";

export const Route = createFileRoute("/_app/governance")({
  component: GovernancePage,
});

const POLICIES = [
  {
    name: "High-Risk Decision Approval",
    module: "Guardian",
    status: "planned",
    version: "v1",
    scope: "organization",
    trigger: "decision.risk_score >= threshold",
    control: "human approval required",
  },
  {
    name: "Production Workflow Gate",
    module: "Glue",
    status: "planned",
    version: "v1",
    scope: "environment",
    trigger: "workflow.deploy.production",
    control: "owner/admin approval",
  },
  {
    name: "Connector Rate Limit",
    module: "Weaver",
    status: "planned",
    version: "v1",
    scope: "connector",
    trigger: "api.calls > quota",
    control: "throttle or block",
  },
  {
    name: "Evidence Verification Required",
    module: "Claim Clarity",
    status: "planned",
    version: "v1",
    scope: "appeal_packet",
    trigger: "appeal.submit",
    control: "verified manifest required",
  },
  {
    name: "Secret Rotation Policy",
    module: "Core",
    status: "planned",
    version: "v1",
    scope: "credential",
    trigger: "secret.age > rotation_window",
    control: "rotation required",
  },
];

function GovernancePage() {
  const { currentOrgId } = useOrgStore();

  const stats = useMemo(() => {
    return {
      policies: POLICIES.length,
      modules: new Set(POLICIES.map((policy) => policy.module)).size,
      active: POLICIES.filter((policy) => policy.status === "active").length,
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="GOVERN"
        title="Governance"
        description="Tenant-level policies, approval gates, execution controls, risk rules, and versioned platform restrictions."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Governance policies are scoped to organizations and later applied to projects, environments, workflows, connectors, and decisions."
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Metric
                label="Policy Templates"
                value={String(stats.policies)}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <Metric
                label="Covered Modules"
                value={String(stats.modules)}
                icon={<Scale className="h-4 w-4" />}
                tone="good"
              />
              <Metric
                label="Active Policies"
                value={String(stats.active)}
                icon={<ClipboardCheck className="h-4 w-4" />}
                tone="warn"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-1">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">Governance Policy Registry</h2>
                  <p className="text-xs text-muted-foreground">
                    Shared controls for Guardian, Glue, Weaver, Claim Clarity, and Core.
                  </p>
                </div>

                <span className="rounded border border-status-pending/30 bg-status-pending/10 px-2 py-1 text-mono-xs text-status-pending">
                  Phase 6
                </span>
              </div>

              <div className="divide-y divide-border">
                {POLICIES.map((policy) => (
                  <div
                    key={policy.name}
                    className="grid grid-cols-[220px_120px_90px_140px_1fr_180px] gap-3 px-5 py-4 text-sm"
                  >
                    <div>
                      <div className="font-medium text-foreground">{policy.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Policy template</div>
                    </div>

                    <div>
                      <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-mono-xs text-primary">
                        {policy.module}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      {policy.version}
                    </div>

                    <div className="font-mono text-xs text-muted-foreground">{policy.scope}</div>

                    <div className="font-mono text-xs text-muted-foreground">{policy.trigger}</div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LockKeyhole className="h-3.5 w-3.5 text-status-pending" />
                      {policy.control}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <PrincipleCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                title="Policy before execution"
                description="High-impact workflows, connector calls, and decisions should check policy before action."
              />

              <PrincipleCard
                icon={<GitBranch className="h-4 w-4" />}
                title="Version every rule"
                description="Policies must be versioned so execution and decisions can be replayed against the exact rule set used."
              />

              <PrincipleCard
                icon={<AlertTriangle className="h-4 w-4" />}
                title="Exceptions must be explicit"
                description="Overrides should require reason, approver, timestamp, and audit trace. No silent bypasses."
              />
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "good" | "warn";
}) {
  const cls =
    tone === "good"
      ? "border-status-paid/20 bg-status-paid/5"
      : tone === "warn"
        ? "border-status-pending/20 bg-status-pending/5"
        : "border-primary/20 bg-primary/5";

  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function PrincipleCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-center gap-2">
        <div className="text-primary">{icon}</div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
