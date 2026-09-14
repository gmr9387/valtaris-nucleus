import type {
  Claim,
  AdjudicationRun,
  MemberAccumulators,
  ContractTerms,
  PlanBenefits,
  PriorPayerOutcome,
  OHIIndicator,
} from "@/types/claim";
import type { TraceObject } from "@/types/trace";
import type { Case, CaseEvent } from "@/types/case";
import type { ClaimIntel } from "@/types/clarity";
import {
  scoreEvidenceReadiness,
  READINESS_CLS,
  READINESS_LABEL,
} from "@/engine/evidence-readiness";
import {
  resolveClaimPrimacy,
  type ClaimPrimacyStatus,
} from "@/nucleus/subsystems/guardian/adjudication/cobRules";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface AdjResult {
  claimId: string;
  run: AdjudicationRun;
  trace: TraceObject;
}

interface ClaimWorkspaceProps {
  claim: Claim;
  result: AdjResult;
  caseData: Case | null;
  caseEvents: CaseEvent[];
  claims: Claim[];
  adjResults: AdjResult[];
  accumulators: Record<string, MemberAccumulators>;
  contract: ContractTerms;
  plan: PlanBenefits;
  priorOutcomes: PriorPayerOutcome[];
  /** claim.ohi_indicators when set, else the member's real on-file OHI
   *  (@/lib/ohi.ts) -- resolved by the caller since it also needs the
   *  member->OHI map for every claim in the list, not just this one. */
  ohiIndicators: OHIIndicator[];
  onSelectClaim: (claimId: string) => void;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function hasIntel(c: Claim): c is Claim & { intel: ClaimIntel } {
  return Boolean(c.intel);
}

const PRIMACY_CLS: Record<ClaimPrimacyStatus["status"], string> = {
  primary: "bg-status-paid/10 text-status-paid border-status-paid/30",
  secondary: "bg-status-pending/10 text-status-pending border-status-pending/30",
  unknown: "bg-status-denied/10 text-status-denied border-status-denied/30",
};

export function ClaimWorkspace({
  claim,
  result,
  caseData,
  caseEvents,
  claims,
  ohiIndicators,
}: ClaimWorkspaceProps) {
  const intel = claim.intel;
  const claimsWithIntel = claims.filter(hasIntel);
  const readiness =
    intel && hasIntel(claim) ? scoreEvidenceReadiness(claim, claimsWithIntel) : null;
  const primacy = resolveClaimPrimacy(ohiIndicators);
  const primacyLabel =
    primacy.status === "secondary"
      ? `Secondary to ${primacy.primary_payer_name ?? primacy.primary_payer_id}`
      : primacy.status === "unknown"
        ? "COB: needs manual review"
        : "Primary payer";

  return (
    <ScrollArea className="h-full">
      <div className="p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-[14px] font-semibold font-mono">{claim.claim_id}</h2>
          <p className="text-[11.5px] text-muted-foreground">
            {claim.provider_name} · {intel?.payer_name ?? "Unknown payer"} · DOS{" "}
            {claim.service_date_from}
          </p>
          {ohiIndicators.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant="outline" className={PRIMACY_CLS[primacy.status]}>
                {primacyLabel}
              </Badge>
              <span className="text-[10.5px] text-muted-foreground">{primacy.rationale}</span>
            </div>
          )}
        </div>

        {intel && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Amount at Risk" value={formatCents(intel.amount_at_risk_cents)} />
            <Metric label="Recoverability" value={`${intel.recoverability_score}%`} />
            <Metric label="Aging" value={`${intel.aging_days}d (${intel.aging_bucket})`} />
            <Metric label="Owner" value={intel.workflow_owner} />
          </div>
        )}

        <Tabs defaultValue="adjudication">
          <TabsList>
            <TabsTrigger value="adjudication">Adjudication</TabsTrigger>
            <TabsTrigger value="evidence">Evidence Readiness</TabsTrigger>
            <TabsTrigger value="case">Case</TabsTrigger>
          </TabsList>

          <TabsContent value="adjudication" className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Plan Paid" value={formatCents(result.run.total_plan_paid)} />
              <Metric
                label="Member Responsibility"
                value={formatCents(result.run.total_member_responsibility)}
              />
            </div>
            <div className="border rounded-md divide-y">
              {result.run.line_results.map((line) => (
                <div
                  key={line.line_id}
                  className="px-3 py-2 text-[11.5px] flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-mono">{line.line_id}</span>
                    <span className="text-muted-foreground">{line.status}</span>
                  </div>
                  <div className="flex gap-4 tabular-nums">
                    <span>Allowed {formatCents(line.allowed)}</span>
                    <span>Paid {formatCents(line.plan_paid)}</span>
                    <span>Member {formatCents(line.member_responsibility)}</span>
                  </div>
                </div>
              ))}
            </div>
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground">
                Rule firings ({result.trace.rule_firings.length})
              </summary>
              <div className="mt-2 flex flex-col gap-1 font-mono">
                {result.trace.rule_firings.map((f) => (
                  <div key={`${f.order}-${f.rule_id}`} className="text-muted-foreground">
                    [{f.order}] {f.rule_id} ({f.category})
                  </div>
                ))}
              </div>
            </details>
          </TabsContent>

          <TabsContent value="evidence" className="mt-3">
            {readiness ? (
              <div className="flex flex-col gap-3">
                <Badge variant="outline" className={READINESS_CLS[readiness.tier]}>
                  {READINESS_LABEL[readiness.tier]} · {readiness.score}%
                </Badge>
                {readiness.blocking_items.length > 0 && (
                  <div className="text-[11.5px]">
                    <p className="font-medium">Blocking:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {readiness.blocking_items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {readiness.recommended_actions.length > 0 && (
                  <div className="text-[11.5px]">
                    <p className="font-medium">Recommended actions:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {readiness.recommended_actions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11.5px] text-muted-foreground">
                No intel envelope on this claim — evidence readiness unavailable.
              </p>
            )}
          </TabsContent>

          <TabsContent value="case" className="mt-3">
            {caseData ? (
              <div className="flex flex-col gap-2">
                <p className="text-[12px] font-medium">{caseData.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  Status: {caseData.status} · Owner: {caseData.owner}
                </p>
                <div className="flex flex-col gap-1 mt-2">
                  {caseEvents.map((ev) => (
                    <div key={ev.event_id} className="text-[11px] text-muted-foreground">
                      <span className="font-mono">{ev.occurred_at.slice(0, 10)}</span> —{" "}
                      {ev.description}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11.5px] text-muted-foreground">
                This claim isn't linked to a case.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}
