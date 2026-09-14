import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Building2, Settings } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { createCorrelationId, logAudit } from "@/lib/audit";
import { useMyOrganizations } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";

export function OrgSwitcher() {
  const orgs = useMyOrganizations();
  const { currentOrgId, setCurrentOrgId } = useOrgStore();

  const current =
    orgs.data?.find((organization) => organization.id === currentOrgId) ?? orgs.data?.[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex h-8 items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 text-sm hover:bg-surface-3">
        <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-primary/15 text-[10px] font-semibold text-primary">
          {current?.name?.[0]?.toUpperCase() ?? "·"}
        </div>

        <span className="max-w-[180px] truncate">{current?.name ?? "Select organization"}</span>

        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Organizations
        </DropdownMenuLabel>

        {orgs.data?.length ? (
          orgs.data.map((organization) => {
            const selected = organization.id === current?.id;

            return (
              <DropdownMenuItem
                key={organization.id}
                onClick={async () => {
                  if (organization.id === currentOrgId) return;

                  const correlationId = createCorrelationId();

                  setCurrentOrgId(organization.id);

                  await logAudit({
                    organization_id: organization.id,
                    module: "tenancy",
                    entity_type: "organization",
                    entity_id: organization.id,
                    action: "switch_org",
                    after: {
                      organization_id: organization.id,
                      organization_name: organization.name,
                    },
                    correlation_id: correlationId,
                  });
                }}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />

                  <span className="min-w-0">
                    <span className="block truncate">{organization.name}</span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">
                      {organization.slug}
                    </span>
                  </span>
                </span>

                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })
        ) : (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No organizations yet</div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/organizations" className="flex items-center gap-2 text-sm">
            <Settings className="h-3.5 w-3.5" />
            Manage organizations
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
