import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditEvents } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { PageHeader, PageBody, EmptyState } from "@/components/platform-ui";
import { Th, Td } from "./_app.organizations";
import { Shield, Search, Clock3, Activity, Filter } from "lucide-react";

export const Route = createFileRoute("/_app/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { currentOrgId } = useOrgStore();
  const audit = useAuditEvents(currentOrgId);

  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");

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

  const modules = useMemo(() => {
    if (!audit.data) return [];
    return [...new Set(audit.data.map((e) => e.module))];
  }, [audit.data]);

  return (
    <>
      <PageHeader
        eyebrow="AUDIT"
        title="Audit Log"
        description="Immutable operational ledger of platform activity, access changes, and state mutations."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Audit events are scoped per organization."
            icon={<Shield className="h-5 w-5" />}
          />
        ) : audit.data?.length ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricCard
                label="Total Events"
                value={String(audit.data.length)}
                icon={<Activity className="h-4 w-4" />}
              />

              <MetricCard
                label="Modules"
                value={String(modules.length)}
                icon={<Filter className="h-4 w-4" />}
              />

              <MetricCard
                label="Latest Event"
                value={
                  audit.data[0] ? new Date(audit.data[0].created_at).toLocaleDateString() : "—"
                }
                icon={<Clock3 className="h-4 w-4" />}
              />
            </div>

            <div className="mb-4 flex flex-col gap-3 md:flex-row">
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
                    <Th>Action</Th>
                    <Th>Entity</Th>
                    <Th>Actor</Th>
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
                        <ActionBadge action={event.action} />
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
          </>
        ) : (
          <EmptyState
            title="No audit events yet"
            description="Every create, update, delete, sign-in, and platform action will appear here."
            icon={<Shield className="h-5 w-5" />}
          />
        )}
      </PageBody>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>

        <div className="text-muted-foreground">{icon}</div>
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const cls =
    action === "create"
      ? "border-status-paid/30 bg-status-paid/10 text-status-paid"
      : action === "delete"
        ? "border-status-denied/30 bg-status-denied/10 text-status-denied"
        : action === "update"
          ? "border-status-pending/30 bg-status-pending/10 text-status-pending"
          : "border-border bg-surface-2 text-muted-foreground";

  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-mono-xs ${cls}`}>
      {action}
    </span>
  );
}
