import { createFileRoute } from "@tanstack/react-router";
import { PageBody, PageHeader } from "@/components/platform-ui";
import { LoadingState } from "@/components/system/LoadingState";
import { ErrorState } from "@/components/system/ErrorState";
import {
  CORE_MODULE_REGISTRY,
  useOperationsReadiness,
  type AreaReadiness,
  type CoreModuleStatus,
  type ReadinessLevel,
} from "@/lib/core";
import { useOrgStore } from "@/lib/org-store";
import { useMyOrganizations } from "@/lib/queries";

export const Route = createFileRoute("/_app/core")({
  head: () => ({
    meta: [
      { title: "Core — ValtariOS" },
      {
        name: "description",
        content:
          "ValtariOS Core — operations readiness and module registry for the shared platform substrate.",
      },
    ],
  }),
  component: CorePage,
});

function CorePage() {
  const { currentOrgId } = useOrgStore();
  const orgs = useMyOrganizations();
  const currentOrg = orgs.data?.find((o) => o.id === currentOrgId) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="VALTARIOS // CORE"
        title="Core Operations Readiness"
        description="Live substrate readiness for the active organization, plus the Core module registry."
      />
      <PageBody>
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Operations readiness</h2>
            <p className="text-mono-xs text-muted-foreground">
              {currentOrg ? `ORG ${currentOrg.name}` : "NO_ORG_SELECTED"}
            </p>
          </div>
          <ReadinessGrid orgId={currentOrgId} />
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">Core module registry</h2>
          <ModuleRegistryTable />
        </section>
      </PageBody>
    </>
  );
}

function ReadinessGrid({ orgId }: { orgId: string | null }) {
  const readiness = useOperationsReadiness(orgId);

  if (!orgId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-1/40 p-8 text-center text-sm text-muted-foreground">
        Select an organization to see readiness.
      </div>
    );
  }
  if (readiness.isLoading) return <LoadingState />;
  if (readiness.error)
    return <ErrorState error={readiness.error as Error} onRetry={() => void readiness.refetch()} />;

  const areas = readiness.data?.areas ?? [];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {areas.map((a) => (
        <ReadinessCard key={a.key} area={a} />
      ))}
    </div>
  );
}

function ReadinessCard({ area }: { area: AreaReadiness }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-mono-xs text-muted-foreground">{area.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{area.primary}</p>
        </div>
        <ReadinessPill level={area.level} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{area.detail}</p>
    </div>
  );
}

function ReadinessPill({ level }: { level: ReadinessLevel }) {
  const map: Record<ReadinessLevel, { label: string; cls: string; dot: string }> = {
    ready: {
      label: "READY",
      cls: "border-success/30 bg-success/10 text-success",
      dot: "bg-success",
    },
    partial: {
      label: "PARTIAL",
      cls: "border-warning/30 bg-warning/10 text-warning",
      dot: "bg-warning",
    },
    absent: {
      label: "ABSENT",
      cls: "border-border bg-surface-2 text-muted-foreground",
      dot: "bg-muted-foreground/50",
    },
    unknown: {
      label: "UNKNOWN",
      cls: "border-border bg-surface-2 text-muted-foreground",
      dot: "bg-muted-foreground/50",
    },
  };
  const v = map[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${v.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
      {v.label}
    </span>
  );
}

function ModuleRegistryTable() {
  const substrate = CORE_MODULE_REGISTRY.filter((m) => m.layer === "substrate");
  const engine = CORE_MODULE_REGISTRY.filter((m) => m.layer === "decision-engine");

  return (
    <div className="space-y-6">
      <ModuleGroup title="Platform substrate" modules={substrate} />
      <ModuleGroup title="Decision engine" modules={engine} />
    </div>
  );
}

function ModuleGroup({
  title,
  modules,
}: {
  title: string;
  modules: readonly {
    name: string;
    purpose: string;
    status: CoreModuleStatus;
  }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-1">
      <div className="border-b border-border px-5 py-2 text-mono-xs text-muted-foreground">
        {title.toUpperCase()}
      </div>
      <div className="grid grid-cols-[160px_1fr_180px] gap-3 border-b border-border px-5 py-2 text-mono-xs text-muted-foreground">
        <div>MODULE</div>
        <div>PURPOSE</div>
        <div className="text-right">STATUS</div>
      </div>
      <div className="divide-y divide-border">
        {modules.map((m) => (
          <div
            key={m.name}
            className="grid grid-cols-[160px_1fr_180px] items-start gap-3 px-5 py-4 text-sm"
          >
            <div className="font-mono text-xs uppercase tracking-wider text-foreground">
              {m.name}
            </div>
            <div className="text-sm text-muted-foreground">{m.purpose}</div>
            <div className="text-right">
              <StatusPill status={m.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: CoreModuleStatus }) {
  const isActive = status === "Active";
  const cls = isActive
    ? "border-success/30 bg-success/10 text-success"
    : "border-primary/30 bg-primary/10 text-primary";
  const dot = isActive ? "bg-success" : "bg-primary";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}
