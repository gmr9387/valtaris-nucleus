import { createFileRoute } from "@tanstack/react-router";
import { useMyOrganizations, useOrgMembers } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { PageHeader, PageBody, EmptyState } from "@/components/platform-ui";
import { Th, Td } from "./_app.organizations";
import { Users, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

function UsersPage() {
  const { currentOrgId } = useOrgStore();
  const orgs = useMyOrganizations();
  const members = useOrgMembers(currentOrgId);
  const current = orgs.data?.find((org) => org.id === currentOrgId);

  return (
    <>
      <PageHeader
        eyebrow="IDENTITY"
        title="Users & Roles"
        description={
          current
            ? `Members, roles, and access boundaries for ${current.name}.`
            : "Select an organization to view members and roles."
        }
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Choose or create an organization before managing users."
            icon={<Users className="h-5 w-5" />}
          />
        ) : members.data?.length ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                <tr>
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Access Level</Th>
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
                        <div className="font-mono text-xs text-muted-foreground">
                          {profile?.email || member.user_id}
                        </div>
                      </Td>

                      <Td>
                        <RoleBadge role={member.role} />
                      </Td>

                      <Td>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {roleDescription(member.role)}
                        </span>
                      </Td>

                      <Td>
                        <span className="text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No members visible"
            description="Member invitations, role changes, and access reviews land in Core Phase 2."
            icon={<Users className="h-5 w-5" />}
          />
        )}
      </PageBody>
    </>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cls =
    role === "owner"
      ? "border-primary/30 bg-primary/10 text-primary"
      : role === "admin"
        ? "border-status-cob/30 bg-status-cob/10 text-status-cob"
        : role === "manager"
          ? "border-status-pending/30 bg-status-pending/10 text-status-pending"
          : role === "operator"
            ? "border-status-paid/30 bg-status-paid/10 text-status-paid"
            : "border-border bg-surface-2 text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-mono-xs ${cls}`}>
      {role.toUpperCase()}
    </span>
  );
}

function roleDescription(role: string): string {
  switch (role) {
    case "owner":
      return "Full platform ownership";
    case "admin":
      return "Administration + configuration";
    case "manager":
      return "Project and environment management";
    case "operator":
      return "Operational execution";
    default:
      return "Read-only access";
  }
}
