import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader, PageBody, EmptyState, StatusPill } from "@/components/platform-ui";
import { Th, Td } from "./_app.organizations";
import { fetchKillSwitch } from "@/lib/guardian-kill-switch";
import { fetchCommandCenterStats } from "@/lib/command-center";
import type { CommandCenterActivityRow } from "@/types/command-center";

export const Route = createFileRoute("/_app/command-center")({
  component: CommandCenterPage,
});

const ENDPOINT_LABELS: Record<string, string> = {
  adjudicate_claim: "Adjudicate Claim",
  weaver_score: "Weaver Score",
  guardian_status: "Guardian Status",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function outcomeSummary(outcomes: Record<string, Record<string, number>>): string {
  const parts: string[] = [];
  for (const [endpoint, byOutcome] of Object.entries(outcomes)) {
    const total = Object.values(byOutcome).reduce((sum, n) => sum + n, 0);
    parts.push(`${total} ${ENDPOINT_LABELS[endpoint] ?? endpoint}`);
  }
  return parts.length > 0 ? parts.join(", ") : "no activity";
}

function ActivityRow({ row }: { row: CommandCenterActivityRow }) {
  return (
    <tr className="hover:bg-surface-2/60">
      <Td>
        <span className="text-xs text-muted-foreground">{relativeTime(row.occurred_at)}</span>
      </Td>
      <Td>
        <span className="font-mono text-xs font-medium">{row.client_id}</span>
      </Td>
      <Td>
        <span className="text-xs">{ENDPOINT_LABELS[row.endpoint] ?? row.endpoint}</span>
      </Td>
      <Td>
        <span className="text-xs">{row.outcome}</span>
      </Td>
      <Td>
        <span className="font-mono text-[11px] text-muted-foreground">
          {Object.entries(row.detail)
            .filter(([key]) => key !== "claim_id")
            .slice(0, 3)
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join(" ")}
        </span>
      </Td>
    </tr>
  );
}

function CommandCenterPage() {
  const killSwitch = useQuery({
    queryKey: ["guardian-kill-switch"],
    queryFn: fetchKillSwitch,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const stats = useQuery({
    queryKey: ["command-center-stats"],
    queryFn: fetchCommandCenterStats,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  const isUnsafe = killSwitch.data?.active ?? false;

  return (
    <>
      <PageHeader
        eyebrow="ECOSYSTEM"
        title="Command Center"
        description="Who's calling nucleus's external APIs, how much, and what's happening — the operational view across every arm (DualPay, valtaris-glue, and anything onboarded after them), not just nucleus's own internal data."
      />

      <PageBody>
        <div className="space-y-8">
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <div>
                <StatusPill status={isUnsafe ? "failed" : "active"}>
                  {isUnsafe ? "GUARDIAN KILL SWITCH ACTIVE — CLAIMS HALTED" : "SAFE TO PROCESS"}
                </StatusPill>
                {isUnsafe && killSwitch.data?.reason && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Reason: {killSwitch.data.reason}
                  </p>
                )}
              </div>
              <Link
                to="/contracts"
                className="h-9 shrink-0 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3 flex items-center"
              >
                Manage kill switch
              </Link>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-tight">API clients</h2>
            {stats.data?.clients.length ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                    <tr>
                      <Th>Client ID</Th>
                      <Th>Label</Th>
                      <Th>Enabled</Th>
                      <Th>Requests (1h)</Th>
                      <Th>Last seen</Th>
                      <Th>Activity (24h)</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface-1/40">
                    {stats.data.clients.map((client) => (
                      <tr key={client.client_id} className="hover:bg-surface-2/60">
                        <Td>
                          <span className="font-mono text-xs font-medium">{client.client_id}</span>
                        </Td>
                        <Td>{client.label}</Td>
                        <Td>
                          <span className="text-xs">
                            {client.enabled ? "✓ enabled" : "disabled"}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs">{client.requests_last_hour}</span>
                        </Td>
                        <Td>
                          <span className="text-xs text-muted-foreground">
                            {relativeTime(client.last_seen)}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs text-muted-foreground">
                            {outcomeSummary(client.outcomes_last_24h)}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No API clients yet"
                description="Provision one in Contracts & Plans → API Clients."
              />
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-tight">Recent activity</h2>
            {stats.data?.recent_activity.length ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                    <tr>
                      <Th>When</Th>
                      <Th>Client</Th>
                      <Th>Endpoint</Th>
                      <Th>Outcome</Th>
                      <Th>Detail</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface-1/40">
                    {stats.data.recent_activity.map((row, index) => (
                      <ActivityRow key={`${row.client_id}-${row.occurred_at}-${index}`} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No activity yet"
                description="Adjudication, scoring, and Guardian events will show up here as external callers make requests."
              />
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
