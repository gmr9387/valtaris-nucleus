import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ShieldCheck, GitBranch, CheckCircle2, LockKeyhole, Scale, Users } from "lucide-react";
import { PageHeader, PageBody, EmptyState, MetricCard } from "@/components/platform-ui";
import { LoadingState } from "@/components/system/LoadingState";
import { ErrorState } from "@/components/system/ErrorState";
import {
  useMyOrganizations,
  useOrgMembers,
  canManageOrg,
  canManageProjects,
  canOperate,
  canManageSecrets,
  canReadSecretsMetadata,
  canManageConnectors,
  canReadConnectors,
  isReadOnly,
  type AppRole,
} from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { Th, Td } from "./_app.organizations";

export const Route = createFileRoute("/_app/governance")({
  component: GovernancePage,
});

const ROLES: AppRole[] = ["owner", "admin", "manager", "operator", "viewer"];

// Not planned -- this mirrors the real, fixed shape of the constitutional
// claim pipeline (src/nucleus/runtime/osPipeline.ts): each stage is
// structurally wired to exactly one subsystem's handler, and
// RuntimeGuards/GovernanceEngine (src/nucleus/runtime/runtimeGuards.ts)
// governs whether that subsystem may run at all on every real dispatch.
// That's the actual governance boundary the constitutional runtime
// enforces on every claim, not a policy someone still needs to write.
const SUBSYSTEM_PERMISSIONS: Record<string, string[]> = {
  weaver: ["opportunity", "recommendation"],
  guardian: ["authorization"],
  glue: ["execution"],
  dualpay: ["payment"],
};

// Same idea for platform-level RBAC: these are the actual permission
// functions src/lib/queries.ts exports and every real page (Secrets,
// Connectors, Workflows) calls to gate its own UI. Running them here
// against each role turns "what can a role do" from documentation
// that can drift into a table that's always accurate to the code.
const CAPABILITIES: { label: string; check: (role: AppRole) => boolean }[] = [
  { label: "Manage organization", check: canManageOrg },
  { label: "Manage projects", check: canManageProjects },
  { label: "Operate (execute workflows, runs)", check: canOperate },
  { label: "Manage secrets", check: canManageSecrets },
  { label: "Read secret metadata", check: canReadSecretsMetadata },
  { label: "Manage connectors", check: canManageConnectors },
  { label: "Read connectors", check: canReadConnectors },
];

function GovernancePage() {
  const { currentOrgId } = useOrgStore();
  const orgs = useMyOrganizations();
  const members = useOrgMembers(currentOrgId);
  const current = orgs.data?.find((org) => org.id === currentOrgId);

  const roleDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members.data ?? []) {
      counts.set(m.role, (counts.get(m.role) ?? 0) + 1);
    }
    return counts;
  }, [members.data]);

  return (
    <>
      <PageHeader
        eyebrow="GOVERN"
        title="Governance"
        description="The real access-control matrix (who can do what) and the real constitutional permission boundary (which subsystem may emit which contract)."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Governance is scoped to organizations: role membership on one side, the constitutional runtime's fixed rules on the other."
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        ) : members.isLoading ? (
          <LoadingState label="Loading governance…" />
        ) : members.isError ? (
          <ErrorState error={members.error} onRetry={() => members.refetch()} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricCard
                label="Members"
                value={String(members.data?.length ?? 0)}
                icon={<Users className="h-4 w-4" />}
              />

              <MetricCard
                label="Distinct Roles"
                value={String(roleDistribution.size)}
                icon={<Scale className="h-4 w-4" />}
                tone="good"
              />

              <MetricCard
                label="Constitutional Subsystems"
                value={String(Object.keys(SUBSYSTEM_PERMISSIONS).length)}
                icon={<GitBranch className="h-4 w-4" />}
                tone="warn"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-1">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold">Role Capability Matrix</h2>
                <p className="text-xs text-muted-foreground">
                  {current ? `${current.name} — ` : ""}
                  Computed live from the same permission functions every real page in this app calls
                  to gate its own UI.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                    <tr>
                      <Th>Capability</Th>
                      {ROLES.map((role) => (
                        <Th key={role}>{role}</Th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border bg-surface-1/40">
                    {CAPABILITIES.map((cap) => (
                      <tr key={cap.label} className="hover:bg-surface-2/60">
                        <Td>
                          <span className="text-xs">{cap.label}</span>
                        </Td>
                        {ROLES.map((role) => (
                          <Td key={role}>
                            {cap.check(role) ? (
                              <CheckCircle2 className="h-4 w-4 text-status-paid" />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </Td>
                        ))}
                      </tr>
                    ))}

                    <tr className="hover:bg-surface-2/60">
                      <Td>
                        <span className="text-xs">Read-only</span>
                      </Td>
                      {ROLES.map((role) => (
                        <Td key={role}>
                          {isReadOnly(role) ? (
                            <CheckCircle2 className="h-4 w-4 text-status-pending" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </Td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-1">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold">Constitutional Permission Matrix</h2>
                <p className="text-xs text-muted-foreground">
                  Structurally enforced by the claim pipeline -- each stage below is wired to
                  exactly one subsystem's handler, and the runtime governs whether that subsystem
                  may run at all on every real dispatch.
                </p>
              </div>

              <div className="divide-y divide-border">
                {Object.entries(SUBSYSTEM_PERMISSIONS).map(([subsystem, contracts]) => (
                  <div
                    key={subsystem}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-mono-xs text-primary">
                      {subsystem.toUpperCase()}
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {contracts.map((contract) => (
                        <span
                          key={contract}
                          className="flex items-center gap-1 rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          <LockKeyhole className="h-2.5 w-2.5" />
                          {contract}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {members.data?.length ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                    <tr>
                      <Th>Member</Th>
                      <Th>Role</Th>
                      <Th>Joined</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border bg-surface-1/40">
                    {members.data.map((member) => {
                      const profile = Array.isArray(member.profiles)
                        ? member.profiles[0]
                        : member.profiles;

                      return (
                        <tr key={member.id} className="hover:bg-surface-2/60">
                          <Td>
                            <div className="font-medium">
                              {profile?.full_name || profile?.email || "Unknown user"}
                            </div>
                          </Td>
                          <Td>
                            <span className="rounded border border-border bg-surface-2 px-2 py-0.5 text-mono-xs">
                              {member.role.toUpperCase()}
                            </span>
                          </Td>
                          <Td>
                            <span className="text-xs text-muted-foreground">
                              {new Date(member.created_at).toLocaleDateString()}
                            </span>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
      </PageBody>
    </>
  );
}
