/**
 * Claims Workbench — refactored from legacy DualPay Index.
 * Provides the deep adjudication / trace / state machine / case view
 * for individual claims as a secondary surface to Claim Clarity.
 */
import { useEffect, useMemo, useState } from 'react';
import { resetIdCounter } from '@/engine/calculation-engine';
import { executeAdjudicationWithReplay } from '@/engine/adjudication-orchestrator';
import { demoContract, demoPlan, demoPriorOutcomes } from '@/data/demo-scenarios';
import { isDemoModeEnabled } from '@/lib/demo-flag';
import { LIVE_CONTRACT, LIVE_PLAN } from '@/lib/live-stubs';
import { findActiveContractIdForPayer, fetchContractTerms } from '@/engine/contract-to-terms';
import {
  loadClaims, loadCases, loadCaseEvents, loadAccumulators, loadLatestRuns,
  saveAdjudication, seedIfEmpty,
} from '@/data/repository';
import type { Claim, AdjudicationRun, MemberAccumulators } from '@/types/claim';
import type { TraceObject } from '@/types/trace';
import type { Case, CaseEvent } from '@/types/case';
import { ClaimList } from '@/components/admin/ClaimList';
import { ClaimOperationsKpis } from '@/components/admin/ClaimOperationsKpis';
import { ClaimWorkspace } from '@/components/admin/ClaimWorkspace';
import { PageHeader, EmptyState } from '@/components/clarity/primitives';
import { Inbox, Loader2 } from 'lucide-react';

interface AdjResult { claimId: string; run: AdjudicationRun; trace: TraceObject; }

export default function ClaimsWorkbench() {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [caseEvents, setCaseEvents] = useState<CaseEvent[]>([]);
  const [accumulators, setAccumulators] = useState<Record<string, MemberAccumulators>>({});
  const [adjResults, setAdjResults] = useState<AdjResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await seedIfEmpty();
        const [c, k, e, a, runs] = await Promise.all([
          loadClaims(), loadCases(), loadCaseEvents(), loadAccumulators(), loadLatestRuns(),
        ]);
        if (cancelled) return;
        setClaims(c); setCases(k); setCaseEvents(e); setAccumulators(a);
        resetIdCounter();
        const haveRun = new Set(runs.map(r => r.claimId));
        const fresh: AdjResult[] = [];
        for (const claim of c) {
          if (haveRun.has(claim.claim_id)) continue;
          const acc = a[claim.member_id] ?? Object.values(a)[0];
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
            const contractId = await findActiveContractIdForPayer(claim.payer_name, claim.service_date_from);
            if (!contractId) continue; // no real contract uploaded yet for this payer -- skip, don't guess
            const real = await fetchContractTerms(contractId);
            if (!real) continue;
            contract = real;
            // KNOWN GAP (unchanged from before this fix): there is still
            // no real plan-benefits persistence layer, so plan remains
            // LIVE_PLAN in production. This means deductible/OOP/
            // coinsurance math will be $0 across the board until a real
            // plan upload feature exists -- fee-schedule-based allowed
            // amounts (from the real contract) will be correct, but
            // member-responsibility splits will not be, in production,
            // today.
            plan = LIVE_PLAN;
            priorOutcomes = [];
          }

          const { run, trace } = await executeAdjudicationWithReplay({
            claim,
            accumulators: acc,
            contract,
            plan,
            priorOutcomes,
            actor: 'ClaimsWorkbench',
          });
          fresh.push({ claimId: claim.claim_id, run, trace });
          await saveAdjudication(claim.claim_id, run, trace, false);
        }
        setAdjResults([...runs, ...fresh]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedResult = adjResults.find(r => r.claimId === selectedClaimId);
  const selectedClaim = claims.find(c => c.claim_id === selectedClaimId);
  const selectedCase = useMemo(() => {
    if (!selectedClaim) return null;
    if (selectedClaim.case_id) return cases.find(c => c.case_id === selectedClaim.case_id) ?? null;
    return cases.find(c => c.claim_ids.includes(selectedClaim.claim_id)) ?? null;
  }, [selectedClaim, cases]);
  const selectedCaseEvents = selectedCase ? caseEvents.filter(e => e.case_id === selectedCase.case_id) : [];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Claims Workbench"
        subtitle="Deterministic adjudication · auditable decision path · COB transparency · payment waterfall · replayable trace."
      />
      {error && <div className="px-5 py-1.5 text-[11.5px] font-mono border-b text-destructive">Error: {error}</div>}
      <ClaimOperationsKpis claims={claims} adjResults={adjResults} cases={cases} />
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading adjudication data…
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="w-[340px] shrink-0 border-r overflow-hidden">
            <ClaimList claims={claims} adjResults={adjResults} selectedClaimId={selectedClaimId} onSelect={setSelectedClaimId} />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            {selectedResult && selectedClaim ? (
              <ClaimWorkspace
                claim={selectedClaim} result={selectedResult}
                caseData={selectedCase} caseEvents={selectedCaseEvents}
                claims={claims} adjResults={adjResults} accumulators={accumulators}
                contract={isDemoModeEnabled() ? demoContract : LIVE_CONTRACT}
                plan={isDemoModeEnabled() ? demoPlan : LIVE_PLAN}
                priorOutcomes={isDemoModeEnabled() ? demoPriorOutcomes : []}
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
