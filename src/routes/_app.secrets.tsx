import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, LockKeyhole, Plus, RefreshCcw, ShieldOff, Search } from "lucide-react";

import { PageHeader, PageBody, EmptyState, StatusPill, MetricCard } from "@/components/platform-ui";
import { Field, Th, Td, FieldStyles } from "./_app.organizations";
import { useOrgStore } from "@/lib/org-store";
import {
  canManageSecrets,
  useCredentialProviders,
  useCredentials,
  useCredentialVersions,
  useEnvironments,
  useMyOrgMembership,
  useProjects,
  type CredentialRow,
} from "@/lib/queries";
import { createSecret, rotateSecret, deactivateSecret } from "@/lib/secrets.functions";

export const Route = createFileRoute("/_app/secrets")({
  component: SecretsPage,
});

function SecretsPage() {
  const { currentOrgId } = useOrgStore();
  const membership = useMyOrgMembership(currentOrgId);
  const canManage = canManageSecrets(membership.data?.role);

  const providers = useCredentialProviders();
  const credentials = useCredentials(currentOrgId);
  const projects = useProjects(currentOrgId);
  const envs = useEnvironments(currentOrgId);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CredentialRow | null>(null);

  const filtered = useMemo(() => {
    const list = credentials.data ?? [];
    const q = query.trim().toLowerCase();

    if (!q) return list;

    return list.filter((credential) => {
      const provider = providers.data?.find((p) => p.id === credential.provider_id);

      return `${credential.label} ${provider?.label ?? ""} ${credential.status}`
        .toLowerCase()
        .includes(q);
    });
  }, [credentials.data, providers.data, query]);

  const stats = useMemo(() => {
    const all = credentials.data ?? [];

    return {
      total: all.length,
      active: all.filter((credential) => credential.status === "active").length,
      deactivated: all.filter((credential) => credential.status === "deactivated").length,
    };
  }, [credentials.data]);

  return (
    <>
      <PageHeader
        eyebrow="INFRASTRUCTURE"
        title="Secrets"
        description="Tenant-scoped credential vault. Raw secrets are sealed server-side; only redacted previews and metadata reach the browser."
        actions={
          <button
            disabled={!currentOrgId || !canManage}
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New secret
          </button>
        }
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Secrets are scoped to an organization and isolated by RLS."
            icon={<LockKeyhole className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricCard
                label="Credentials"
                value={stats.total}
                icon={<KeyRound className="h-4 w-4" />}
              />
              <MetricCard label="Active" value={stats.active} tone="good" />
              <MetricCard label="Deactivated" value={stats.deactivated} tone="warn" />
            </div>

            <div className="rounded-xl border border-border bg-surface-1">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="input pl-8"
                    placeholder="Search secrets…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>

                {!canManage && (
                  <span className="text-mono-xs text-muted-foreground">
                    Read-only · {membership.data?.role ?? "no role"}
                  </span>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No credentials yet. {canManage && "Click “New secret” to add one."}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-1/40 text-mono-xs text-muted-foreground">
                    <tr>
                      <Th>Label</Th>
                      <Th>Provider</Th>
                      <Th>Scope</Th>
                      <Th>Status</Th>
                      <Th>Last rotated</Th>
                      <Th>Created</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {filtered.map((credential) => {
                      const provider = providers.data?.find((p) => p.id === credential.provider_id);
                      const project = projects.data?.find((p) => p.id === credential.project_id);
                      const env = envs.data?.find((e) => e.id === credential.environment_id);

                      return (
                        <tr
                          key={credential.id}
                          className="cursor-pointer hover:bg-surface-2/60"
                          onClick={() => setSelected(credential)}
                        >
                          <Td>
                            <div className="font-medium">{credential.label}</div>
                          </Td>

                          <Td>
                            <span className="font-mono text-xs text-muted-foreground">
                              {provider?.label ?? "—"}
                            </span>
                          </Td>

                          <Td>
                            <div className="flex flex-wrap gap-1 text-mono-xs text-muted-foreground">
                              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                                {project?.name ?? "org-wide"}
                              </span>

                              {env && (
                                <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                                  {env.env_type}
                                </span>
                              )}
                            </div>
                          </Td>

                          <Td>
                            <StatusPill status={credential.status} />
                          </Td>

                          <Td>
                            <span className="text-muted-foreground">
                              {credential.last_rotated_at
                                ? new Date(credential.last_rotated_at).toLocaleDateString()
                                : "—"}
                            </span>
                          </Td>

                          <Td>
                            <span className="text-muted-foreground">
                              {new Date(credential.created_at).toLocaleDateString()}
                            </span>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Storage contract:</strong> raw secrets never
              persist in client state or audit payloads. The server function writes an opaque{" "}
              <code className="font-mono">encrypted_payload_ref</code>; future KMS support can
              replace the reference implementation without changing this UI contract.
            </div>
          </div>
        )}

        {open && currentOrgId && (
          <NewSecretDialog orgId={currentOrgId} onClose={() => setOpen(false)} />
        )}

        {selected && (
          <SecretDetail
            credential={selected}
            providerLabel={
              providers.data?.find((provider) => provider.id === selected.provider_id)?.label ?? "—"
            }
            canManage={canManage}
            onClose={() => setSelected(null)}
          />
        )}

        <FieldStyles />
      </PageBody>
    </>
  );
}

function NewSecretDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const providers = useCredentialProviders();
  const projects = useProjects(orgId);
  const envs = useEnvironments(orgId);
  const create = useServerFn(createSecret);

  const [providerId, setProviderId] = useState("");
  const [label, setLabel] = useState("");
  const [projectId, setProjectId] = useState("");
  const [environmentId, setEnvironmentId] = useState("");
  const [secret, setSecret] = useState("");

  const projectEnvs = useMemo(() => {
    if (!projectId) return [];
    return (envs.data ?? []).filter((env) => env.project_id === projectId);
  }, [envs.data, projectId]);

  const submit = useMutation({
    mutationFn: async () => {
      return create({
        data: {
          organization_id: orgId,
          provider_id: providerId,
          project_id: projectId || null,
          environment_id: environmentId || null,
          label: label.trim(),
          initial_secret: secret,
        },
      });
    },
    onSuccess: () => {
      toast.success("Secret stored");
      qc.invalidateQueries({ queryKey: ["credentials", orgId] });
      qc.invalidateQueries({ queryKey: ["audit", orgId] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <DialogShell title="New secret" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit.mutate();
        }}
        className="space-y-3"
      >
        <Field label="Provider">
          <select
            required
            className="input"
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
          >
            <option value="">Select provider…</option>
            {providers.data?.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Label">
          <input
            required
            minLength={2}
            maxLength={120}
            className="input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. Production OpenAI"
          />
        </Field>

        <Field label="Project scope">
          <select
            className="input"
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setEnvironmentId("");
            }}
          >
            <option value="">Org-wide</option>
            {projects.data?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Environment scope">
          <select
            className="input"
            value={environmentId}
            onChange={(event) => setEnvironmentId(event.target.value)}
            disabled={!projectId}
          >
            <option value="">All environments</option>
            {projectEnvs.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name} · {env.env_type}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Secret value">
          <input
            required
            minLength={8}
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="input font-mono"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="sk-…"
          />
        </Field>

        <p className="text-mono-xs text-muted-foreground">
          The raw value is transmitted to the server function once, sealed, and discarded. Only a
          redacted preview returns.
        </p>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submit.isPending}
            className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submit.isPending ? "Sealing…" : "Store secret"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function SecretDetail({
  credential,
  providerLabel,
  canManage,
  onClose,
}: {
  credential: CredentialRow;
  providerLabel: string;
  canManage: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const versions = useCredentialVersions(credential.id);
  const rotate = useServerFn(rotateSecret);
  const deactivate = useServerFn(deactivateSecret);

  const [rotating, setRotating] = useState(false);
  const [newSecret, setNewSecret] = useState("");

  const doRotate = useMutation({
    mutationFn: async () =>
      rotate({
        data: {
          credential_id: credential.id,
          new_secret: newSecret,
          reason: "manual",
        },
      }),
    onSuccess: () => {
      toast.success("Rotated");
      setNewSecret("");
      setRotating(false);
      qc.invalidateQueries({ queryKey: ["credentials", credential.organization_id] });
      qc.invalidateQueries({ queryKey: ["credential-versions", credential.id] });
      qc.invalidateQueries({ queryKey: ["audit", credential.organization_id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const doDeactivate = useMutation({
    mutationFn: async () =>
      deactivate({
        data: {
          credential_id: credential.id,
        },
      }),
    onSuccess: () => {
      toast.success("Deactivated");
      qc.invalidateQueries({ queryKey: ["credentials", credential.organization_id] });
      qc.invalidateQueries({ queryKey: ["credential-versions", credential.id] });
      qc.invalidateQueries({ queryKey: ["audit", credential.organization_id] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <DialogShell title={credential.label} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2/50 p-3 text-mono-xs">
          <div>
            <div className="text-muted-foreground">Provider</div>
            <div className="text-foreground">{providerLabel}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Status</div>
            <StatusPill status={credential.status} />
          </div>

          <div>
            <div className="text-muted-foreground">Created</div>
            <div>{new Date(credential.created_at).toLocaleString()}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Last rotated</div>
            <div>
              {credential.last_rotated_at
                ? new Date(credential.last_rotated_at).toLocaleString()
                : "—"}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-mono-xs uppercase tracking-wider text-muted-foreground">
            Version history
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-mono-xs text-muted-foreground">
                <tr>
                  <Th>#</Th>
                  <Th>Preview</Th>
                  <Th>Active</Th>
                  <Th>Created</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border bg-surface-1">
                {versions.data?.map((version) => (
                  <tr key={version.id}>
                    <Td>
                      <span className="font-mono">v{version.version_number}</span>
                    </Td>

                    <Td>
                      <span className="font-mono text-xs text-muted-foreground">
                        {version.redacted_preview ?? "••••"}
                      </span>
                    </Td>

                    <Td>
                      {version.is_active ? (
                        <StatusPill status="active">active</StatusPill>
                      ) : (
                        <span className="text-mono-xs text-muted-foreground">—</span>
                      )}
                    </Td>

                    <Td>
                      <span className="text-muted-foreground">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {canManage && credential.status !== "deactivated" && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            {rotating ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  doRotate.mutate();
                }}
                className="space-y-2"
              >
                <Field label="New secret value">
                  <input
                    required
                    minLength={8}
                    type="password"
                    className="input font-mono"
                    value={newSecret}
                    onChange={(event) => setNewSecret(event.target.value)}
                  />
                </Field>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRotating(false);
                      setNewSecret("");
                    }}
                    className="h-8 rounded-md border border-border bg-surface-2 px-3 text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={doRotate.isPending}
                    className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {doRotate.isPending ? "Rotating…" : "Confirm rotate"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-mono-xs text-muted-foreground">
                  Manage credential lifecycle
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setRotating(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs hover:bg-surface-3"
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Rotate
                  </button>

                  <button
                    onClick={() => doDeactivate.mutate()}
                    disabled={doDeactivate.isPending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-status-denied/30 bg-status-denied/10 px-3 text-xs text-status-denied hover:bg-status-denied/20 disabled:opacity-50"
                  >
                    <ShieldOff className="h-3 w-3" />
                    Deactivate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DialogShell>
  );
}

function DialogShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface-1 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
