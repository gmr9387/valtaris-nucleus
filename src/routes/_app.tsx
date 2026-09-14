import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { useAuth } from "@/lib/auth-context";
import { createCorrelationId, logAudit } from "@/lib/audit";
import { useMyOrganizations } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import {
  RouteErrorComponent,
  RouteNotFoundComponent,
} from "@/components/system/RouteErrorComponent";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});

function AppLayout() {
  const { session, loading, user, signOut } = useAuth();
  const navigate = useNavigate();

  const orgs = useMyOrganizations();
  const { currentOrgId, setCurrentOrgId } = useOrgStore();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!orgs.data || orgs.data.length === 0) return;

    const currentIsValid = orgs.data.some((org) => org.id === currentOrgId);

    if (!currentOrgId || !currentIsValid) {
      setCurrentOrgId(orgs.data[0].id);
    }
  }, [orgs.data, currentOrgId, setCurrentOrgId]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-mono-xs text-muted-foreground">LOADING…</div>
      </div>
    );
  }

  const title = pageTitleFromPath(pathname);
  const hasNoOrgs = orgs.data && orgs.data.length === 0;
  const canShowOrgPrompt =
    hasNoOrgs && pathname !== "/organizations" && pathname !== "/_app/organizations";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-1/60 px-5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <OrgSwitcher />

            <span className="text-border-strong">/</span>

            <span className="truncate text-sm font-medium">{title}</span>
          </div>

          <div className="flex items-center gap-3">
            {currentOrgId && (
              <span className="hidden rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted-foreground lg:inline">
                ORG {currentOrgId.slice(0, 8)}
              </span>
            )}

            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>

            <button
              onClick={async () => {
                const correlationId = createCorrelationId();

                await logAudit({
                  organization_id: currentOrgId,
                  module: "auth",
                  entity_type: "user",
                  entity_id: user?.id ?? null,
                  action: "sign_out",
                  correlation_id: correlationId,
                });

                await signOut();
                setCurrentOrgId(null);
                navigate({ to: "/login", replace: true });
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {canShowOrgPrompt ? <EmptyOrgPrompt /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}

function EmptyOrgPrompt() {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="max-w-md rounded-lg border border-border bg-surface-1 p-8 text-center">
        <p className="text-mono-xs text-primary">NO_ORGANIZATION</p>

        <h2 className="mt-3 text-xl font-semibold">Create your first organization</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Every resource in ValtariOS Core belongs to an organization.
        </p>

        <Link
          to="/organizations"
          className="mt-5 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go to organizations
        </Link>
      </div>
    </div>
  );
}

function pageTitleFromPath(pathname: string): string {
  const segment =
    pathname
      .replace(/^\/_app/, "")
      .split("/")
      .filter(Boolean)[0] ?? "dashboard";

  const map: Record<string, string> = {
    dashboard: "Overview",
    organizations: "Organizations",
    projects: "Projects",
    environments: "Environments",
    users: "Users",
    audit: "Audit",
    telemetry: "Telemetry",
    secrets: "Secrets",
    connectors: "Connectors",
    workflows: "Workflows",
    core: "Core",
    evidence: "Evidence",
    decisions: "Decisions",
    governance: "Governance",
  };

  return map[segment] ?? segment;
}
