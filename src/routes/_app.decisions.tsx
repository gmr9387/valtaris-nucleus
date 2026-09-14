import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrainCircuit, GitBranch, Activity, Filter, Search, Clock3 } from "lucide-react";
import { PageHeader, PageBody, EmptyState, MetricCard } from "@/components/platform-ui";
import { LoadingState } from "@/components/system/LoadingState";
import { ErrorState } from "@/components/system/ErrorState";
import { useAuditEvents, type AuditEventRow } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { Th, Td } from "./_app.organizations";

export const Route = createFileRoute("/_app/decisions")({
  component: DecisionsPage,
});

// A "decision" is any recorded action that changed something in this
// organization -- create/rotate/deactivate/bind/publish/archive/start.
// audit_events already captures exactly that (module, action, entity,
// actor, before/after, correlation id), so this page reads it as a
// decision registry instead of duplicating a separate log.
type DecisionType = {
  key: string;
  module: string;
  action: string;
  count: number;
  lastAt: string;
};

function groupDecisionTypes(events: AuditEventRow[]): DecisionType[] {
  const byKey = new Map<string, DecisionType>();

  for (const event of events) {
    const key = `${event.module}:${event.action}`;
    const existing = byKey.get(key);

    if (existing) {
      existing.count += 1;
      if (event.created_at > existing.lastAt) existing.lastAt = event.created_at;
    } else {
      byKey.set(key, {
        key,
        module: event.module,
        action: event.action,
        count: 1,
        lastAt: event.created_at,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => b.count - a.count);
}

function DecisionsPage() {
  const { currentOrgId } = useOrgStore();
  const audit = useAuditEvents(currentOrgId);

  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  const decisionTypes = useMemo(() => groupDecisionTypes(audit.data ?? []), [audit.data]);

  const modules = useMemo(() => {
    if (!audit.data) return [];
    return [...new Set(audit.data.map((e) => e.module))];
  }, [audit.data]);

  const filtered = useMemo(() => {
    if (!audit.data) return [];

    return audit.data.filter((event) => {
      const matchesModule = moduleFilter === "all" || event.module === moduleFilter;

      const q = query.toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        event.module?.toLowerCase().includes(q) ||
        event.action?.toLowerCase().includes(q) ||
        event.entity_type?.toLowerCase().includes(q) ||
        event.entity_id?.toLowerCase().includes(q);

      return matchesModule && matchesQuery;
    });
  }, [audit.data, query, moduleFilter]);

  return (
    <>
      <PageHeader
        eyebrow="KNOWLEDGE"
        title="Decisions"
        description="Every recorded action across this organization, read as a decision registry: what was decided, by whom, and when."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Decisions are tenant-scoped and derived from this organization's audit trail."
            icon={<BrainCircuit className="h-5 w-5" />}
          />
        ) : audit.isLoading ? (
          <LoadingState label="Loading decisions…" />
        ) : audit.isError ? (
          <ErrorState error={audit.error} onRetry={() => audit.refetch()} />
        ) : audit.data?.length ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricCard
                label="Decisions Recorded"
                value={String(audit.data.length)}
                icon={<Activity className="h-4 w-4" />}
              />

              <MetricCard
                label="Decision Types"
                value={String(decisionTypes.length)}
                icon={<GitBranch className="h-4 w-4" />}
                tone="good"
              />

              <MetricCard
                label="Latest Decision"
                value={new Date(audit.data[0].created_at).toLocaleString()}
                icon={<Clock3 className="h-4 w-4" />}
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-1">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold">Decision Types</h2>
                <p className="text-xs text-muted-foreground">
                  Distinct (module, action) pairs actually observed for this organization, ranked by
                  frequency.
                </p>
              </div>

              <div className="divide-y divide-border">
                {decisionTypes.map((type) => (
                  <div
                    key={type.key}
                    className="grid grid-cols-[1fr_120px_160px] gap-3 px-5 py-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-mono-xs text-primary">
                        {type.module.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs">{type.action}</span>
                    </div>

                    <div className="text-xs text-muted-foreground">{type.count} recorded</div>

                    <div className="text-right font-mono text-xs text-muted-foreground">
                      last {new Date(type.lastAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-1 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-md border border-border bg-surface-1 pl-9 pr-3 text-sm outline-none focus:border-primary"
                  placeholder="Search module, action, entity..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <select
                className="h-10 rounded-md border border-border bg-surface-1 px-3 text-sm"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="all">All modules</option>
                {modules.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                  <tr>
                    <Th>Time</Th>
                    <Th>Module</Th>
                    <Th>Decision</Th>
                    <Th>Entity</Th>
                    <Th>Decided By</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border bg-surface-1/40">
                  {filtered.map((event) => (
                    <tr key={event.id} className="hover:bg-surface-2/60">
                      <Td>
                        <div className="font-mono text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                      </Td>

                      <Td>
                        <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-mono-xs text-primary">
                          {event.module.toUpperCase()}
                        </span>
                      </Td>

                      <Td>
                        <span className="font-mono text-xs">{event.action}</span>
                      </Td>

                      <Td>
                        <div className="font-mono text-xs">
                          {event.entity_type}
                          {event.entity_id ? ` · ${event.entity_id.slice(0, 8)}` : ""}
                        </div>
                      </Td>

                      <Td>
                        <span className="font-mono text-xs text-muted-foreground">
                          {event.user_id?.slice(0, 8) ?? "SYSTEM"}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <div className="flex items-start gap-3">
                <Filter className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">Where this data comes from</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every create/rotate/deactivate/bind/publish/archive/start action across
                    Organizations, Projects, Environments, Secrets, Connectors, and Workflows writes
                    an audit_events row via logAudit(). This page reads that same real table -- it
                    isn't a separate decision log.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No decisions recorded yet"
            description="Create an organization, project, environment, secret, connector, or workflow to see decisions appear here."
            icon={<BrainCircuit className="h-5 w-5" />}
          />
        )}
      </PageBody>
    </>
  );
}
