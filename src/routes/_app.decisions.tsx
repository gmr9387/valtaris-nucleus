import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BrainCircuit,
  GitBranch,
  ShieldCheck,
  Target,
  AlertTriangle,
  FileText,
  Activity,
} from "lucide-react";
import { PageHeader, PageBody, EmptyState } from "@/components/platform-ui";
import { useOrgStore } from "@/lib/org-store";

export const Route = createFileRoute("/_app/decisions")({
  component: DecisionsPage,
});

const DECISION_TYPES = [
  {
    name: "Claim Recoverability",
    module: "Claim Clarity",
    status: "planned",
    inputs: ["denial category", "aging", "payer", "evidence", "claim value"],
    outputs: ["score", "tier", "recommended path", "barriers"],
    confidence: "explainable",
  },
  {
    name: "Next Best Action",
    module: "Claim Clarity",
    status: "planned",
    inputs: ["denial event", "playbook", "SLA", "payer profile"],
    outputs: ["action", "owner", "expected value", "blockers"],
    confidence: "rule-weighted",
  },
  {
    name: "Risk Gate",
    module: "Guardian",
    status: "planned",
    inputs: ["signal", "exposure", "policy", "history", "threshold"],
    outputs: ["approve", "deny", "review", "escalate"],
    confidence: "policy-traced",
  },
  {
    name: "Workflow Routing",
    module: "Glue",
    status: "planned",
    inputs: ["event", "tenant policy", "workflow version", "state"],
    outputs: ["route", "queue", "approval requirement"],
    confidence: "deterministic",
  },
  {
    name: "Connector Policy Decision",
    module: "Weaver",
    status: "planned",
    inputs: ["connector", "rate limit", "credential status", "payload"],
    outputs: ["allow", "block", "retry", "dead-letter"],
    confidence: "policy-based",
  },
];

function DecisionsPage() {
  const { currentOrgId } = useOrgStore();

  const stats = useMemo(() => {
    return {
      types: DECISION_TYPES.length,
      modules: new Set(DECISION_TYPES.map((item) => item.module)).size,
      active: DECISION_TYPES.filter((item) => item.status === "active").length,
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="KNOWLEDGE"
        title="Decisions"
        description="Explainable decision registry for recommendations, risk gates, policy checks, confidence scores, and decision traces."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Decision runs are tenant-scoped and later tied to products, workflows, evidence, and outcomes."
            icon={<BrainCircuit className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Metric
                label="Decision Types"
                value={String(stats.types)}
                icon={<BrainCircuit className="h-4 w-4" />}
              />
              <Metric
                label="Product Modules"
                value={String(stats.modules)}
                icon={<GitBranch className="h-4 w-4" />}
                tone="good"
              />
              <Metric
                label="Active Runs"
                value={String(stats.active)}
                icon={<Activity className="h-4 w-4" />}
                tone="warn"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-1">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">Decision Registry Blueprint</h2>
                  <p className="text-xs text-muted-foreground">
                    Shared explainability layer for Claim Clarity, Guardian, Glue, and Weaver.
                  </p>
                </div>

                <span className="rounded border border-status-pending/30 bg-status-pending/10 px-2 py-1 text-mono-xs text-status-pending">
                  Phase 5
                </span>
              </div>

              <div className="divide-y divide-border">
                {DECISION_TYPES.map((item) => (
                  <div
                    key={item.name}
                    className="grid grid-cols-[200px_130px_1fr_1fr_140px] gap-3 px-5 py-4 text-sm"
                  >
                    <div>
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Decision profile</div>
                    </div>

                    <div>
                      <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-mono-xs text-primary">
                        {item.module}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.inputs.map((input) => (
                        <span
                          key={input}
                          className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {input}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.outputs.map((output) => (
                        <span
                          key={output}
                          className="rounded border border-status-paid/20 bg-status-paid/5 px-1.5 py-0.5 text-[10px] text-status-paid"
                        >
                          {output}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-status-paid" />
                      {item.confidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <PrincipleCard
                icon={<Target className="h-4 w-4" />}
                title="No black-box recommendations"
                description="Every decision should store its inputs, fired rules, confidence math, explanation, and outcome."
              />

              <PrincipleCard
                icon={<FileText className="h-4 w-4" />}
                title="Trace before action"
                description="High-impact actions should produce a decision trace before workflow execution or human approval."
              />

              <PrincipleCard
                icon={<AlertTriangle className="h-4 w-4" />}
                title="Policy governs risk"
                description="Guardian should consume this layer as decision governance, not as a separate mystery brain."
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
