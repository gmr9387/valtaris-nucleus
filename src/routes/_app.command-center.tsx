import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { PageHeader, PageBody, EmptyState, StatusPill, MetricCard } from "@/components/platform-ui";
import { Th, Td } from "./_app.organizations";
import { fetchKillSwitch } from "@/lib/guardian-kill-switch";
import { fetchCommandCenterStats } from "@/lib/command-center";
import type { CommandCenterActivityRow, CommandCenterClient } from "@/types/command-center";

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

function totalOutcomeCount(outcomes: Record<string, Record<string, number>>): number {
  return Object.values(outcomes).reduce(
    (sum, byOutcome) => sum + Object.values(byOutcome).reduce((s, n) => s + n, 0),
    0,
  );
}

// Coarse pass/fail read on an outcome string, used only to color a
// badge -- not a judgment on whether the underlying decision was
// correct. "allow" is the one clearly-good outcome; anything naming an
// error/deny/unsafe result is bad; "unverifiable"/"no_contract" are a
// step short of an outright denial, so they read as a warning; Weaver's
// stage names ("opportunity"/"recommendation") aren't pass/fail at all
// and stay neutral.
type OutcomeTone = "good" | "bad" | "warn" | "neutral";

function outcomeTone(outcome: string): OutcomeTone {
  const o = outcome.toLowerCase();
  if (o === "allow") return "good";
  if (o === "deny" || o.includes("unsafe") || o.includes("error")) return "bad";
  if (o.includes("unverifiable") || o.includes("no_contract")) return "warn";
  return "neutral";
}

const TONE_RANK: Record<OutcomeTone, number> = { good: 0, neutral: 1, warn: 2, bad: 3 };
const TONE_TO_STATUS: Record<OutcomeTone, string> = {
  good: "approved",
  bad: "rejected",
  warn: "pending",
  neutral: "neutral",
};

function worstTone(outcomes: Record<string, Record<string, number>>): OutcomeTone {
  let worst: OutcomeTone = "neutral";
  for (const byOutcome of Object.values(outcomes)) {
    for (const outcome of Object.keys(byOutcome)) {
      const tone = outcomeTone(outcome);
      if (TONE_RANK[tone] > TONE_RANK[worst]) worst = tone;
    }
  }
  return worst;
}

function ClientActivityCell({ client }: { client: CommandCenterClient }) {
  const total = totalOutcomeCount(client.outcomes_last_24h);
  if (total === 0) {
    return <span className="text-xs text-muted-foreground">no activity</span>;
  }
  return (
    <div className="space-y-1">
      <StatusPill status={TONE_TO_STATUS[worstTone(client.outcomes_last_24h)]}>
        {total} event{total === 1 ? "" : "s"}
      </StatusPill>
      <div className="text-[11px] text-muted-foreground">
        {outcomeSummary(client.outcomes_last_24h)}
      </div>
    </div>
  );
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
        <StatusPill status={TONE_TO_STATUS[outcomeTone(row.outcome)]}>{row.outcome}</StatusPill>
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
  const clients = stats.data?.clients ?? [];
  const totalRequestsLastHour = clients.reduce((sum, c) => sum + c.requests_last_hour, 0);
  const totalActivity24h = clients.reduce(
    (sum, c) => sum + totalOutcomeCount(c.outcomes_last_24h),
    0,
  );
  const unscopedClients = clients.filter((c) => !c.organization_id).length;

  return (
    <>
      <PageHeader
        eyebrow="ECOSYSTEM"
        title="Command Center"
        description="Who's calling nucleus's external APIs, how much, and what's happening — the operational view across every arm (DualPay, valtaris-glue, and anything onboarded after them), not just nucleus's own internal data."
        actions={
          <button
            onClick={() => {
              killSwitch.refetch();
              stats.refetch();
            }}
            disabled={stats.isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3 disabled:opacity-50"
            title={
              stats.dataUpdatedAt
                ? `Last updated ${new Date(stats.dataUpdatedAt).toLocaleTimeString()}`
                : undefined
            }
          >
            <RefreshCw className={`h-3.5 w-3.5 ${stats.isFetching ? "animate-spin" : ""}`} />
            {stats.dataUpdatedAt
              ? `Updated ${relativeTime(new Date(stats.dataUpdatedAt).toISOString())}`
              : "Refresh"}
          </button>
        }
      />

      <PageBody>
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard label="API clients" value={clients.length} tone="neutral" />
            <MetricCard label="Requests (1h)" value={totalRequestsLastHour} tone="primary" />
            <MetricCard
              label="Activity (24h)"
              value={totalActivity24h}
              tone={
                clients.some((c) => worstTone(c.outcomes_last_24h) === "bad") ? "danger" : "good"
              }
            />
            <MetricCard
              label="Unscoped clients"
              value={unscopedClients}
              tone={unscopedClients > 0 ? "warn" : "good"}
            />
          </div>

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
            {stats.isLoading ? (
              <div className="rounded-lg border border-dashed border-border bg-surface-1/40 p-8 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : clients.length ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                    <tr>
                      <Th>Client ID</Th>
                      <Th>Label</Th>
                      <Th>Organization</Th>
                      <Th>Enabled</Th>
                      <Th>Requests (1h)</Th>
                      <Th>Last seen</Th>
                      <Th>Activity (24h)</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface-1/40">
                    {clients.map((client) => (
                      <tr key={client.client_id} className="hover:bg-surface-2/60">
                        <Td>
                          <span className="font-mono text-xs font-medium">{client.client_id}</span>
                        </Td>
                        <Td>{client.label}</Td>
                        <Td>
                          {client.organization_name ? (
                            <span className="text-xs">{client.organization_name}</span>
                          ) : client.organization_id ? (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {client.organization_id.slice(0, 8)}…
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">— unscoped —</span>
                          )}
                        </Td>
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
                          <ClientActivityCell client={client} />
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
            {stats.isLoading ? (
              <div className="rounded-lg border border-dashed border-border bg-surface-1/40 p-8 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : stats.data?.recent_activity.length ? (
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
