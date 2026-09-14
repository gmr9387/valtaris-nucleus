/**
 * Claims Workbench — refactored from legacy DualPay Index.
 * Provides the deep adjudication / trace / state machine / case view
 * for individual claims as a secondary surface to Claim Clarity.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { resetIdCounter, updateMemberAccumulators } from "@/engine/calculation-engine";
import { resolveClaimPrimacy } from "@/nucleus/subsystems/guardian/adjudication/cobRules";
import { executeAdjudicationWithReplay } from "@/engine/adjudication-orchestrator";
import { demoContract, demoPlan, demoPriorOutcomes } from "@/data/demo-scenarios";
import { isDemoModeEnabled } from "@/lib/demo-flag";
import { LIVE_CONTRACT, LIVE_PLAN } from "@/lib/live-stubs";
import { findActiveContractIdForPayer, fetchContractTerms } from "@/engine/contract-to-terms";
import { findActivePlanIdForPayer, fetchPlanBenefitTerms } from "@/engine/plan-benefits-to-terms";
import { listAllMemberOhi } from "@/lib/ohi";
import { ingestEdiFile } from "@/lib/edi-gateway";
import {
  loadClaims,
  loadCases,
  loadCaseEvents,
  loadAccumulators,
  loadLatestRuns,
  saveAdjudication,
  saveAccumulators,
  saveClaim,
  seedIfEmpty,
} from "@/data/repository";
import type { Claim, AdjudicationRun, MemberAccumulators, OHIIndicator } from "@/types/claim";
import type { TraceObject } from "@/types/trace";
import type { Case, CaseEvent } from "@/types/case";
import { ClaimList } from "@/components/admin/ClaimList";
import { ClaimOperationsKpis } from "@/components/admin/ClaimOperationsKpis";
import { ClaimWorkspace } from "@/components/admin/ClaimWorkspace";
import { PageHeader, EmptyState } from "@/components/clarity/primitives";
import { Inbox, Loader2, Upload } from "lucide-react";

interface AdjResult {
  claimId: string;
  run: AdjudicationRun;
  trace: TraceObject;
}

export default function ClaimsWorkbench() {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [caseEvents, setCaseEvents] = useState<CaseEvent[]>([]);
  const [accumulators, setAccumulators] = useState<Record<string, MemberAccumulators>>({});
  const [ohiByMember, setOhiByMember] = useState<Record<string, OHIIndicator[]>>({});
  const [adjResults, setAdjResults] = useState<AdjResult[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const loadAndAdjudicate = useCallback(async () => {
    try {
      await seedIfEmpty();
      const [c, k, e, a, ohi, runs] = await Promise.all([
        loadClaims(),
        loadCases(),
        loadCaseEvents(),
        loadAccumulators(),
        listAllMemberOhi(),
        loadLatestRuns(),
      ]);
      if (cancelledRef.current) return;
      setClaims(c);
      setCases(k);
      setCaseEvents(e);
      setAccumulators(a);
      setOhiByMember(ohi);
      resetIdCounter();
      const haveRun = new Set(runs.map((r) => r.claimId));
      const fresh: AdjResult[] = [];
      // Tracks accumulator state across this batch, keyed by the
      // accumulator's own member_id (not claim.member_id -- the
      // fallback below can borrow a different member's accumulators).
      // Without this, two unadjudicated claims for the same member in
      // one batch would both read the same pre-loop snapshot and
      // neither would see the other's deductible/OOP consumption
      // until the next page load.
      const runningAccumulators: Record<string, MemberAccumulators> = { ...a };
      for (const claim of c) {
        if (haveRun.has(claim.claim_id)) continue;
        const acc = runningAccumulators[claim.member_id] ?? Object.values(runningAccumulators)[0];
        if (!acc) continue;

        // FIXED: previously this entire loop skipped every claim
        // outright when demo mode was off (`if (!isDemoModeEnabled())
        // continue`), meaning production claims never got
        // auto-adjudicated here at all -- not wrong data, just no
        // adjudication happening. Now attempts a real contract lookup
        // by payer first; only demo-mode claims fall back to
        // demoContract/demoPlan, and production claims with no
        // matching uploaded contract yet are still correctly skipped
        // (not adjudicated against an empty stub).
        let contract = demoContract;
        let plan = demoPlan;
        let priorOutcomes = demoPriorOutcomes;

        if (!isDemoModeEnabled()) {
          if (!claim.intel) continue; // no payer/intel envelope -- nothing to look up a contract by
          const contractId = await findActiveContractIdForPayer(
            claim.intel.payer_name,
            claim.service_date_from,
            claim.provider_npi,
          );
          if (!contractId) continue; // no real contract uploaded yet for this payer -- skip, don't guess
          const real = await fetchContractTerms(contractId);
          if (!real) continue;
          contract = real;

          // FIXED: plan benefits previously had no real persistence
          // layer at all, so this always fell back to LIVE_PLAN in
          // production -- deductible/OOP/coinsurance math was $0 across
          // the board regardless of whether a real plan existed.
          // plan_benefits now mirrors payer_contracts exactly (see
          // @/engine/plan-benefits-to-terms.ts); still falls back to
          // LIVE_PLAN, but only when no real plan has actually been
          // uploaded yet for this payer -- allowed-amount math (from the
          // real contract) stays correct either way, and once a real
          // plan is uploaded, member-responsibility splits become real
          // too without any code change here.
          const planId = await findActivePlanIdForPayer(
            claim.intel.payer_name,
            claim.service_date_from,
          );
          const realPlan = planId ? await fetchPlanBenefitTerms(planId) : null;
          plan = realPlan ?? LIVE_PLAN;
          priorOutcomes = [];
        }

        // COB routing: a claim with other health insurance on file can't
        // be safely adjudicated as if this plan were the only payer.
        // resolveClaimPrimacy() decides whether this plan is primary
        // (proceed as normal), secondary (proceed only once we actually
        // have the primary payer's outcome for every line -- otherwise
        // we'd be paying full allowed amount for a share that isn't
        // ours), or unknown (no declared order/DOB/coverage-start data
        // to determine primacy at all -- also not safe to guess).
        // Claims with zero OHI indicators (the overwhelming majority
        // today) are unaffected: resolveClaimPrimacy always returns
        // "primary" for those, same as current behavior. OHI is
        // member-level real data (@/lib/ohi.ts), same as accumulators --
        // a claim's own ohi_indicators (set at import/construction time)
        // wins when present; otherwise fall back to whatever real OHI is
        // on file for this member.
        const ohiIndicators =
          claim.ohi_indicators.length > 0 ? claim.ohi_indicators : (ohi[claim.member_id] ?? []);
        const primacy = resolveClaimPrimacy(ohiIndicators);
        if (primacy.status !== "primary") {
          const missingPriorOutcome = claim.lines.some(
            (line) => !priorOutcomes.some((po) => po.claim_line_id === line.line_id),
          );
          if (missingPriorOutcome) {
            // FIXED: previously left the claim silently un-adjudicated --
            // ClaimStatus had an AWAITING_PRIMARY_EOB value that nothing
            // about COB ever assigned, so a pended-for-COB claim looked
            // identical in the list to one nobody had gotten to yet.
            // Persist the real reason so it's visible, not silent. Used
            // for both "secondary" (primacy resolved, genuinely waiting
            // on the primary's EOB) and "unknown" (primacy itself
            // couldn't be determined) -- not PENDED, which
            // import-to-claim.ts already uses for a claim under appeal;
            // reusing it here would let a successful COB adjudication
            // silently clobber that unrelated appeal status below.
            if (claim.status !== "AWAITING_PRIMARY_EOB") {
              await saveClaim({ ...claim, status: "AWAITING_PRIMARY_EOB" });
            }
            continue; // awaiting primary payer's EOB (or manual COB review) -- don't guess
          }
        }

        const { run, trace } = await executeAdjudicationWithReplay({
          claim,
          accumulators: acc,
          contract,
          plan,
          priorOutcomes,
          actor: "ClaimsWorkbench",
        });
        fresh.push({ claimId: claim.claim_id, run, trace });
        await saveAdjudication(claim.claim_id, run, trace, false);

        // A claim previously pended AWAITING_PRIMARY_EOB just adjudicated
        // successfully (a prior outcome arrived, or primacy resolved) --
        // clear the pended status now that it's real again, rather than
        // leaving it stuck. Deliberately does not touch PENDED --
        // import-to-claim.ts uses that for a claim under appeal, an
        // unrelated state this adjudication doesn't resolve.
        if (claim.status === "AWAITING_PRIMARY_EOB") {
          await saveClaim({ ...claim, status: "ADJUDICATED" });
        }

        // FIXED: nothing persisted the post-claim deductible/OOP/
        // benefit-limit usage, so accumulators never advanced between
        // claims -- every claim for a member was adjudicated against
        // the same frozen starting snapshot regardless of how many
        // claims came before it. Update the in-batch running state
        // too (see runningAccumulators above) so later claims in this
        // same loop see it immediately, not just on the next load.
        const updatedAcc = updateMemberAccumulators(acc, run.final_accumulator);
        runningAccumulators[acc.member_id] = updatedAcc;
        await saveAccumulators(updatedAcc);
      }
      setAccumulators(runningAccumulators);
      setAdjResults([...runs, ...fresh]);
    } catch (err) {
      if (!cancelledRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void (async () => {
      await loadAndAdjudicate();
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadAndAdjudicate]);

  const handleImportFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const content = await file.text();
        const result = await ingestEdiFile({ name: file.name, content });

        if (!result.valid) {
          toast.error(`${file.name}: rejected (${result.error_count} validation issue(s))`);
        } else {
          const parts = [`${result.segment_count} segments`];
          if (result.promoted_claim_count)
            parts.push(`${result.promoted_claim_count} claims promoted`);
          if (result.promotion_errors) parts.push(`${result.promotion_errors} promotion errors`);
          toast.success(`${file.name}: ${result.transaction_type} imported (${parts.join(", ")})`);
        }

        // Refresh + adjudicate whatever the import promoted, same as
        // the initial load -- otherwise imported claims would sit
        // unscored until the next full page reload.
        await loadAndAdjudicate();
      } catch (err) {
        toast.error(
          `Failed to import ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setImporting(false);
      }
    },
    [loadAndAdjudicate],
  );

  const selectedResult = adjResults.find((r) => r.claimId === selectedClaimId);
  const selectedClaim = claims.find((c) => c.claim_id === selectedClaimId);
  const selectedClaimOhi = selectedClaim
    ? selectedClaim.ohi_indicators.length > 0
      ? selectedClaim.ohi_indicators
      : (ohiByMember[selectedClaim.member_id] ?? [])
    : [];
  const selectedCase = useMemo(() => {
    if (!selectedClaim) return null;
    if (selectedClaim.case_id)
      return cases.find((c) => c.case_id === selectedClaim.case_id) ?? null;
    return cases.find((c) => c.claim_ids.includes(selectedClaim.claim_id)) ?? null;
  }, [selectedClaim, cases]);
  const selectedCaseEvents = selectedCase
    ? caseEvents.filter((e) => e.case_id === selectedCase.case_id)
    : [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Claims Workbench"
        subtitle="Deterministic adjudication · auditable decision path · COB transparency · payment waterfall · replayable trace."
      />
      <div className="flex items-center justify-end gap-2 px-5 py-2 border-b shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept=".835,.837,.txt,.edi,.x12"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleImportFile(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium hover:bg-muted disabled:opacity-50"
        >
          {importing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          Import EDI file (835/837)
        </button>
      </div>
      {error && (
        <div className="px-5 py-1.5 text-[11.5px] font-mono border-b text-destructive">
          Error: {error}
        </div>
      )}
      <ClaimOperationsKpis claims={claims} adjResults={adjResults} cases={cases} />
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading adjudication data…
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="w-[340px] shrink-0 border-r overflow-hidden">
            <ClaimList
              claims={claims}
              adjResults={adjResults}
              selectedClaimId={selectedClaimId}
              onSelect={setSelectedClaimId}
            />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            {selectedResult && selectedClaim ? (
              <ClaimWorkspace
                claim={selectedClaim}
                result={selectedResult}
                caseData={selectedCase}
                caseEvents={selectedCaseEvents}
                claims={claims}
                adjResults={adjResults}
                accumulators={accumulators}
                contract={isDemoModeEnabled() ? demoContract : LIVE_CONTRACT}
                plan={isDemoModeEnabled() ? demoPlan : LIVE_PLAN}
                priorOutcomes={isDemoModeEnabled() ? demoPriorOutcomes : []}
                ohiIndicators={selectedClaimOhi}
                onSelectClaim={setSelectedClaimId}
              />
            ) : (
              <EmptyState
                title="Select a claim to open its adjudication record"
                body="Each claim exposes the deterministic rule path, payment waterfall, COB determination, accumulator impact, and replayable audit trace."
                icon={<Inbox className="h-5 w-5" />}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
