import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlugZap, Plus, Search, Webhook, KeyRound, BookOpen } from "lucide-react";
import { PageHeader, PageBody, EmptyState, StatusPill, MetricCard } from "@/components/platform-ui";
import { Field, Th, Td, FieldStyles } from "./_app.organizations";
import { HealthIndicator, type Health } from "@/components/HealthIndicator";
import { useOrgStore } from "@/lib/org-store";
import { useAuth } from "@/lib/auth-context";
import { useMyOrgMembership, canManageOrg, useProjects, useEnvironments } from "@/lib/queries";
import {
  useConnectors,
  useConnectorCapabilities,
  useConnectorBindings,
  useLatestHealthChecks,
  useCredentials,
  type Connector,
} from "@/lib/registry-queries";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_app/connectors")({ component: ConnectorsPage });

function ConnectorsPage() {
  const { currentOrgId } = useOrgStore();
  const membership = useMyOrgMembership(currentOrgId);
  const canManage = canManageOrg(membership.data?.role);
  const connectors = useConnectors();
  const caps = useConnectorCapabilities();
  const bindings = useConnectorBindings(currentOrgId);
  const credentials = useCredentials(currentOrgId);
  const health = useLatestHealthChecks((bindings.data ?? []).map((b) => b.id));

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Connector | null>(null);

  const filtered = useMemo(() => {
    const list = connectors.data ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((c) => c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q));
  }, [connectors.data, query]);

  const stats = useMemo(() => {
    const bs = bindings.data ?? [];
    const cs = connectors.data ?? [];
    return {
      catalog: cs.length,
      bound: bs.length,
      active: bs.filter((b) => b.status === "active").length,
    };
  }, [connectors.data, bindings.data]);

  return (
    <>
      <PageHeader
        eyebrow="INFRASTRUCTURE"
        title="Connectors"
        description="Versioned registry of external integrations, scoped to organizations through credentialed bindings."
      />
      <PageBody>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricCard
              label="Catalog"
              value={stats.catalog}
              icon={<PlugZap className="h-4 w-4" />}
            />
            <MetricCard label="Bindings" value={stats.bound} tone="neutral" />
            <MetricCard label="Active" value={stats.active} tone="good" />
          </div>

          <div className="rounded-xl border border-border bg-surface-1">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="input pl-8"
                  placeholder="Search connectors…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <span className="text-mono-xs text-muted-foreground">
                {filtered.length} of {stats.catalog}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-surface-1/40 text-mono-xs text-muted-foreground">
                <tr>
                  <Th>Connector</Th>
                  <Th>Category</Th>
                  <Th>Status</Th>
                  <Th>Capabilities</Th>
                  <Th>Bindings</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => {
                  const connectorCaps = (caps.data ?? []).filter((x) => x.connector_id === c.id);
                  const connectorBindings = (bindings.data ?? []).filter(
                    (b) => b.connector_id === c.id,
                  );
                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer hover:bg-surface-2/60"
                      onClick={() => setSelected(c)}
                    >
                      <Td>
                        <div className="flex items-center gap-2">
                          <ConnectorAvatar connector={c} />
                          <div>
                            <div className="font-medium">{c.label}</div>
                            <div className="font-mono text-xs text-muted-foreground">{c.key}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-mono-xs text-muted-foreground capitalize">
                          {c.category}
                        </span>
                      </Td>
                      <Td>
                        <StatusPill
                          status={
                            c.status === "available"
                              ? "active"
                              : c.status === "beta"
                                ? "planned"
                                : "archived"
                          }
                        >
                          {c.status.toUpperCase()}
                        </StatusPill>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {connectorCaps.slice(0, 4).map((cap) => (
                            <span
                              key={cap.id}
                              className="rounded border border-primary/15 bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary"
                            >
                              {cap.capability_key}
                            </span>
                          ))}
                          {connectorCaps.length > 4 && (
                            <span className="text-mono-xs text-muted-foreground">
                              +{connectorCaps.length - 4}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        {connectorBindings.length === 0 ? (
                          <span className="text-mono-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-mono-xs">{connectorBindings.length}</span>
                            <HealthIndicator
                              status={
                                (health.data?.[connectorBindings[0].id]?.health_status as Health) ??
                                "unknown"
                              }
                              latencyMs={health.data?.[connectorBindings[0].id]?.latency_ms}
                            />
                          </div>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!currentOrgId && (
            <EmptyState
              title="Select an organization to manage bindings"
              description="The catalog above is global. Bindings link a connector to a credential within an org/project/environment."
              icon={<PlugZap className="h-5 w-5" />}
            />
          )}
        </div>

        {selected && currentOrgId && (
          <ConnectorPanel
            connector={selected}
            orgId={currentOrgId}
            canManage={canManage}
            onClose={() => setSelected(null)}
          />
        )}
        {selected && !currentOrgId && (
          <ConnectorPanel
            connector={selected}
            orgId={null}
            canManage={false}
            onClose={() => setSelected(null)}
          />
        )}
        <FieldStyles />
      </PageBody>
    </>
  );
}

function ConnectorAvatar({ connector }: { connector: Connector }) {
  const initial = connector.label.charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2 text-mono-xs font-semibold text-primary">
      {initial}
    </div>
  );
}

function ConnectorPanel({
  connector,
  orgId,
  canManage,
  onClose,
}: {
  connector: Connector;
  orgId: string | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const caps = useConnectorCapabilities();
  const bindings = useConnectorBindings(orgId);
  const credentials = useCredentials(orgId);
  const health = useLatestHealthChecks(
    (bindings.data ?? []).filter((b) => b.connector_id === connector.id).map((b) => b.id),
  );
  const connectorCaps = (caps.data ?? []).filter((x) => x.connector_id === connector.id);
  const connectorBindings = (bindings.data ?? []).filter((b) => b.connector_id === connector.id);
  const projects = useProjects(orgId);
  const envs = useEnvironments(orgId);
  const { user } = useAuth();
  const qc = useQueryClient();

  const [credentialId, setCredentialId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [environmentId, setEnvironmentId] = useState("");

  const matchingCreds = (credentials.data ?? []).filter((c) => c.status === "active");

  const createBinding = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error("Org required");
      const { data, error } = await supabase
        .from("connector_bindings")
        .insert({
          organization_id: orgId,
          connector_id: connector.id,
          credential_id: credentialId || null,
          project_id: projectId || null,
          environment_id: environmentId || null,
          status: "active",
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        organization_id: orgId,
        module: "connectors",
        entity_type: "binding",
        entity_id: data.id,
        action: "create",
        after: { connector_id: connector.id, credential_id: credentialId || null },
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Binding created");
      setCredentialId("");
      setProjectId("");
      setEnvironmentId("");
      qc.invalidateQueries({ queryKey: ["connector-bindings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-y-auto border-l border-border bg-surface-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <ConnectorAvatar connector={connector} />
            <div>
              <div className="text-mono-xs uppercase tracking-wider text-muted-foreground">
                {connector.category}
              </div>
              <h2 className="text-lg font-semibold">{connector.label}</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="space-y-6 p-5">
          <div className="grid grid-cols-2 gap-3 text-mono-xs">
            <Meta label="Key" value={connector.key} mono />
            <Meta label="Status" value={connector.status} />
            <Meta label="Webhooks" value={connector.supports_webhooks ? "supported" : "no"} />
            <Meta label="OAuth" value={connector.supports_oauth ? "supported" : "no"} />
          </div>

          {connector.documentation_url && (
            <a
              href={connector.documentation_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-mono-xs text-primary hover:underline"
            >
              <BookOpen className="h-3 w-3" /> Documentation
            </a>
          )}

          <section>
            <h3 className="mb-2 text-mono-xs uppercase tracking-wider text-muted-foreground">
              Capabilities
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {connectorCaps.map((c) => (
                <span
                  key={c.id}
                  className="rounded border border-primary/15 bg-primary/5 px-2 py-1 text-mono-xs text-primary"
                >
                  {c.capability_label}
                </span>
              ))}
              {connectorCaps.length === 0 && (
                <span className="text-mono-xs text-muted-foreground">
                  No capabilities registered.
                </span>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-mono-xs uppercase tracking-wider text-muted-foreground">
              Environment bindings {orgId ? "" : "(select an organization)"}
            </h3>
            {!orgId ? (
              <p className="text-sm text-muted-foreground">No org selected.</p>
            ) : connectorBindings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bindings yet for this organization.
              </p>
            ) : (
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-mono-xs text-muted-foreground">
                    <tr>
                      <Th>Scope</Th>
                      <Th>Credential</Th>
                      <Th>Status</Th>
                      <Th>Health</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface-1">
                    {connectorBindings.map((b) => {
                      const proj = projects.data?.find((p) => p.id === b.project_id);
                      const env = envs.data?.find((e) => e.id === b.environment_id);
                      const cred = credentials.data?.find((c) => c.id === b.credential_id);
                      const h = health.data?.[b.id];
                      return (
                        <tr key={b.id}>
                          <Td>
                            <div className="flex flex-wrap gap-1 text-mono-xs text-muted-foreground">
                              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                                {proj?.name ?? "org-wide"}
                              </span>
                              {env && (
                                <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                                  {env.env_type}
                                </span>
                              )}
                            </div>
                          </Td>
                          <Td>
                            {cred ? (
                              <span className="font-mono text-xs">{cred.label}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-mono-xs text-muted-foreground">
                                <KeyRound className="h-3 w-3" />
                                none
                              </span>
                            )}
                          </Td>
                          <Td>
                            <StatusPill
                              status={
                                b.status === "active"
                                  ? "active"
                                  : b.status === "paused"
                                    ? "planned"
                                    : "failed"
                              }
                            />
                          </Td>
                          <Td>
                            <HealthIndicator
                              status={(h?.health_status as Health) ?? "unknown"}
                              latencyMs={h?.latency_ms}
                            />
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {canManage && orgId && (
            <section className="rounded-lg border border-border p-3">
              <h3 className="mb-3 text-mono-xs uppercase tracking-wider text-muted-foreground">
                New binding
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createBinding.mutate();
                }}
                className="space-y-2"
              >
                <Field label="Credential">
                  <select
                    className="input"
                    value={credentialId}
                    onChange={(e) => setCredentialId(e.target.value)}
                  >
                    <option value="">No credential (policy only)</option>
                    {matchingCreds.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Project">
                    <select
                      className="input"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    >
                      <option value="">Org-wide</option>
                      {projects.data?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Environment">
                    <select
                      className="input"
                      value={environmentId}
                      onChange={(e) => setEnvironmentId(e.target.value)}
                      disabled={!projectId}
                    >
                      <option value="">Any</option>
                      {envs.data
                        ?.filter((e) => !projectId || e.project_id === projectId)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} · {e.env_type}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={createBinding.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />{" "}
                    {createBinding.isPending ? "Creating…" : "Create binding"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-xs text-muted-foreground">
            <Webhook className="mr-1 inline h-3 w-3" />
            Connector execution and health probing are out of scope for Phase 2 — this surface
            manages metadata and governance only. Workflow runtime will populate{" "}
            <code className="font-mono">connector_health_checks</code> in Phase 3+.
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/50 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-foreground" : "text-foreground capitalize"}>
        {value}
      </div>
    </div>
  );
}
