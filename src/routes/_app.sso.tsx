import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { canManageOrg, useMyOrgMembership } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { PageHeader, PageBody, EmptyState, StatusPill } from "@/components/platform-ui";
import { Field, FieldStyles } from "./_app.organizations";
import { fetchSsoConfig, upsertSsoConfig, deleteSsoConfig } from "@/lib/sso";
import { logAudit } from "@/lib/audit";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/_app/sso")({ component: SsoPage });

function SsoPage() {
  const { currentOrgId } = useOrgStore();
  const membership = useMyOrgMembership(currentOrgId);
  const canManage = canManageOrg(membership.data?.role);
  const qc = useQueryClient();

  const config = useQuery({
    enabled: !!currentOrgId,
    queryKey: ["sso-config", currentOrgId],
    queryFn: () => fetchSsoConfig(currentOrgId!),
    staleTime: 15_000,
  });

  const [domain, setDomain] = useState("");
  const [credentialMode, setCredentialMode] = useState<"url" | "xml">("url");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [metadataXml, setMetadataXml] = useState("");

  // Adjust state during render (React's recommended pattern for
  // syncing to a prop/query change) rather than in a useEffect, which
  // would commit an empty-domain render first and cause a visible
  // flash before the effect runs.
  const [syncedConfigId, setSyncedConfigId] = useState<string | null>(null);
  if (config.data && config.data.id !== syncedConfigId) {
    setSyncedConfigId(config.data.id);
    setDomain(config.data.domain);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!currentOrgId) throw new Error("Select an organization first.");
      if (!canManage) throw new Error("Owner or admin role required.");
      if (!domain.trim()) throw new Error("Domain is required.");
      if (credentialMode === "url" && !metadataUrl.trim()) {
        throw new Error("IdP metadata URL is required.");
      }
      if (credentialMode === "xml" && !metadataXml.trim()) {
        throw new Error("IdP metadata XML is required.");
      }

      const result = await upsertSsoConfig({
        organizationId: currentOrgId,
        domain: domain.trim(),
        metadataUrl: credentialMode === "url" ? metadataUrl.trim() : undefined,
        metadataXml: credentialMode === "xml" ? metadataXml.trim() : undefined,
      });

      await logAudit({
        organization_id: currentOrgId,
        module: "tenancy",
        entity_type: "organization_sso_config",
        entity_id: result.id,
        action: config.data ? "update" : "create",
        after: result,
      });

      return result;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["sso-config", currentOrgId] });
      setMetadataUrl("");
      setMetadataXml("");
      if (result.status === "active") {
        toast.success("SSO configured — the domain now routes to this identity provider.");
      } else {
        toast.error(result.last_error ?? "SSO registration failed.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!currentOrgId) throw new Error("Select an organization first.");
      if (!canManage) throw new Error("Owner or admin role required.");
      await deleteSsoConfig(currentOrgId);
      await logAudit({
        organization_id: currentOrgId,
        module: "tenancy",
        entity_type: "organization_sso_config",
        action: "delete",
      });
    },
    onSuccess: () => {
      toast.success("SSO configuration removed");
      qc.invalidateQueries({ queryKey: ["sso-config", currentOrgId] });
      setDomain("");
      setMetadataUrl("");
      setMetadataXml("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="TENANCY"
        title="Enterprise SSO"
        description="Let this organization's employees sign in through their own identity provider (Okta, Azure AD, ...) instead of email/password. Built on Supabase Auth's SAML 2.0 SSO."
      />
      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="No organization selected"
            description="Pick an organization from the switcher to configure its SSO."
          />
        ) : !canManage ? (
          <EmptyState
            title="Owner or admin role required"
            description="Ask an owner or admin of this organization to configure SSO."
          />
        ) : (
          <div className="space-y-6">
            <Alert>
              <AlertTitle>Requires platform setup by the project owner</AlertTitle>
              <AlertDescription>
                SAML 2.0 SSO needs two things from the Supabase project itself, not from this form:
                the project on Pro plan or above, and a Management API token set as the
                SUPABASE_MANAGEMENT_API_TOKEN Edge Function secret. Saving below registers the
                provider immediately once both are in place — otherwise it's saved with a clear
                error you can act on later, no need to redo this form.
              </AlertDescription>
            </Alert>

            {config.data && (
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-1 p-4">
                <div>
                  <StatusPill
                    status={
                      config.data.status === "active"
                        ? "active"
                        : config.data.status === "error"
                          ? "failed"
                          : "pending"
                    }
                  >
                    {config.data.status.toUpperCase()}
                  </StatusPill>
                  <p className="mt-2 text-sm">
                    Domain <span className="font-mono">{config.data.domain}</span>
                  </p>
                  {config.data.last_error && (
                    <p className="mt-1 text-xs text-status-denied">{config.data.last_error}</p>
                  )}
                </div>
                <button
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                  className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3 disabled:opacity-50"
                >
                  {remove.isPending ? "Removing…" : "Remove"}
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="rounded-lg border border-border bg-surface-1 p-4"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Email domain">
                  <input
                    className="input font-mono"
                    placeholder="acme.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                  />
                </Field>
                <Field label="IdP metadata format">
                  <select
                    className="input"
                    value={credentialMode}
                    onChange={(e) => setCredentialMode(e.target.value as "url" | "xml")}
                  >
                    <option value="url">Metadata URL</option>
                    <option value="xml">Metadata XML</option>
                  </select>
                </Field>
              </div>

              <div className="mt-3">
                {credentialMode === "url" ? (
                  <Field label="IdP metadata URL">
                    <input
                      className="input font-mono"
                      placeholder="https://idp.acme.com/saml/metadata"
                      value={metadataUrl}
                      onChange={(e) => setMetadataUrl(e.target.value)}
                    />
                  </Field>
                ) : (
                  <Field label="IdP metadata XML">
                    <textarea
                      className="input h-32 font-mono text-xs"
                      placeholder="<EntityDescriptor ...>"
                      value={metadataXml}
                      onChange={(e) => setMetadataXml(e.target.value)}
                    />
                  </Field>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {save.isPending
                    ? "Saving…"
                    : config.data
                      ? "Update SSO configuration"
                      : "Enable SSO"}
                </button>
              </div>
            </form>
          </div>
        )}
        <FieldStyles />
      </PageBody>
    </>
  );
}
