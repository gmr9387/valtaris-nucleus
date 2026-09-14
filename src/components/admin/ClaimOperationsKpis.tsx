import type { Claim, AdjudicationRun } from "@/types/claim";
import type { TraceObject } from "@/types/trace";
import type { Case } from "@/types/case";

interface AdjResult {
  claimId: string;
  run: AdjudicationRun;
  trace: TraceObject;
}

interface ClaimOperationsKpisProps {
  claims: Claim[];
  adjResults: AdjResult[];
  cases: Case[];
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 border-r last:border-r-0 min-w-[140px]">
      <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[16px] font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-[10.5px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function ClaimOperationsKpis({ claims, adjResults, cases }: ClaimOperationsKpisProps) {
  const withIntel = claims.filter((c): c is Claim & { intel: NonNullable<Claim["intel"]> } =>
    Boolean(c.intel),
  );

  const totalAtRiskCents = withIntel.reduce((sum, c) => sum + c.intel.amount_at_risk_cents, 0);
  const avgRecoverability = withIntel.length
    ? Math.round(
        withIntel.reduce((sum, c) => sum + c.intel.recoverability_score, 0) / withIntel.length,
      )
    : 0;
  const escalatedCount = withIntel.filter((c) => c.intel.is_escalated).length;
  const openCases = cases.filter((c) => c.status === "open" || c.status === "in_progress").length;
  const totalPlanPaidCents = adjResults.reduce((sum, r) => sum + r.run.total_plan_paid, 0);

  return (
    <div className="flex items-stretch border-b overflow-x-auto shrink-0">
      <Kpi label="Claims" value={String(claims.length)} sub={`${adjResults.length} adjudicated`} />
      <Kpi label="Amount at Risk" value={formatCents(totalAtRiskCents)} />
      <Kpi label="Avg Recoverability" value={`${avgRecoverability}%`} />
      <Kpi label="Escalated" value={String(escalatedCount)} />
      <Kpi label="Open Cases" value={String(openCases)} />
      <Kpi label="Plan Paid (adjudicated)" value={formatCents(totalPlanPaidCents)} />
    </div>
  );
}
