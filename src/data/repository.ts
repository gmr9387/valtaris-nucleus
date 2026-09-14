/**
 * Claims Workbench data access layer — everything reads/writes through
 * here rather than touching Supabase directly, so ClaimsWorkbench.tsx
 * and edi-gateway.ts share one persistence contract.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Claim, AdjudicationRun, MemberAccumulators } from "@/types/claim";
import type { TraceObject } from "@/types/trace";
import type { Case, CaseEvent } from "@/types/case";
import type { ParsedRow, ImportSourceType } from "@/types/import";
import { rowToClaim } from "@/engine/import-to-claim";

export async function loadClaims(): Promise<Claim[]> {
  const { data, error } = await supabase
    .from("claims")
    .select("payload")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[repository] loadClaims failed", error.message);
    return [];
  }
  return (data ?? []).map((row) => (row as { payload: unknown }).payload as Claim);
}

export async function saveClaim(claim: Claim): Promise<void> {
  const { error } = await supabase.from("claims").upsert(
    [
      {
        claim_id: claim.claim_id,
        case_id: claim.case_id ?? null,
        payload: claim as unknown as never,
        updated_at: new Date().toISOString(),
      },
    ] as never,
    { onConflict: "claim_id" },
  );
  if (error) console.error("[repository] saveClaim failed", error.message);
}

export async function loadCases(): Promise<Case[]> {
  const { data, error } = await supabase
    .from("cases")
    .select("payload")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[repository] loadCases failed", error.message);
    return [];
  }
  return (data ?? []).map((row) => (row as { payload: unknown }).payload as Case);
}

export async function loadCaseEvents(): Promise<CaseEvent[]> {
  const { data, error } = await supabase
    .from("case_events")
    .select("payload")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("[repository] loadCaseEvents failed", error.message);
    return [];
  }
  return (data ?? []).map((row) => (row as { payload: unknown }).payload as CaseEvent);
}

export async function loadAccumulators(): Promise<Record<string, MemberAccumulators>> {
  const { data, error } = await supabase.from("member_accumulators").select("member_id, payload");
  if (error) {
    console.error("[repository] loadAccumulators failed", error.message);
    return {};
  }
  const result: Record<string, MemberAccumulators> = {};
  for (const row of (data ?? []) as Array<{ member_id: string; payload: unknown }>) {
    result[row.member_id] = row.payload as MemberAccumulators;
  }
  return result;
}

export interface LatestRun {
  claimId: string;
  run: AdjudicationRun;
  trace: TraceObject;
}

export async function loadLatestRuns(): Promise<LatestRun[]> {
  const { data, error } = await supabase
    .from("adjudication_runs")
    .select("claim_id, run, trace, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[repository] loadLatestRuns failed", error.message);
    return [];
  }

  const seen = new Set<string>();
  const latest: LatestRun[] = [];
  for (const row of (data ?? []) as Array<{ claim_id: string; run: unknown; trace: unknown }>) {
    if (seen.has(row.claim_id)) continue;
    seen.add(row.claim_id);
    latest.push({
      claimId: row.claim_id,
      run: row.run as AdjudicationRun,
      trace: row.trace as TraceObject,
    });
  }
  return latest;
}

export async function saveAdjudication(
  claimId: string,
  run: AdjudicationRun,
  trace: TraceObject,
  isSeed: boolean,
): Promise<void> {
  const { error } = await supabase.from("adjudication_runs").insert([
    {
      run_id: run.run_id,
      claim_id: claimId,
      run: run as unknown as never,
      trace: trace as unknown as never,
      is_seed: isSeed,
    },
  ] as never);
  if (error) console.error("[repository] saveAdjudication failed", error.message);
}

const DEMO_MEMBER_ID = "MEM-DEMO-1";
const DEMO_PLAN_YEAR = new Date().getUTCFullYear();

interface SeedRowSpec {
  source: ImportSourceType;
  normalized: ParsedRow["normalized"];
}

const SEED_ROWS: SeedRowSpec[] = [
  {
    source: "manual_upload",
    normalized: {
      claim_id: "CLM-DEMO-1001",
      member_id: DEMO_MEMBER_ID,
      payer_name: "Aetna",
      provider_npi: "1234567890",
      provider_name: "Valtaris Family Medicine",
      procedure_code: "99214",
      service_date: "2026-07-01",
      submitted_date: "2026-07-03",
      billed_amount: 18000,
      paid_amount: 0,
      carc_code: "16",
      group_code: "CO",
      denial_message: "Claim/service lacks information or has submission/billing error(s).",
    },
  },
  {
    source: "underpayment_report",
    normalized: {
      claim_id: "CLM-DEMO-1002",
      member_id: DEMO_MEMBER_ID,
      payer_name: "UnitedHealthcare",
      provider_npi: "1234567890",
      provider_name: "Valtaris Family Medicine",
      procedure_code: "99213",
      service_date: "2026-06-15",
      submitted_date: "2026-06-16",
      billed_amount: 12000,
      paid_amount: 6000,
      amount_at_risk: 3000,
      denial_message: "Paid below contracted rate.",
    },
  },
  {
    source: "remittance_835",
    normalized: {
      claim_id: "CLM-DEMO-1003",
      member_id: DEMO_MEMBER_ID,
      payer_name: "Cigna",
      provider_npi: "1234567890",
      provider_name: "Valtaris Family Medicine",
      procedure_code: "85025",
      service_date: "2026-07-10",
      submitted_date: "2026-07-11",
      billed_amount: 3500,
      paid_amount: 3500,
      allowed_amount: 3500,
    },
  },
];

function buildSeedRow(spec: SeedRowSpec, index: number): ParsedRow {
  return { index, raw: {}, normalized: spec.normalized, issues: [], status: "ok" };
}

/**
 * Populates a small, realistic starting dataset the first time the
 * claims tables are empty, so the Workbench isn't a blank screen on
 * first load. Built through the real rowToClaim() pipeline (same
 * scoring/denial logic every other import goes through) rather than
 * hand-authored Claim objects, so seed data can't drift from what the
 * app actually produces.
 */
export async function seedIfEmpty(): Promise<void> {
  const { count, error } = await supabase
    .from("claims")
    .select("claim_id", { count: "exact", head: true });
  if (error) {
    console.error("[repository] seedIfEmpty count check failed", error.message);
    return;
  }
  if ((count ?? 0) > 0) return;

  const accumulators: MemberAccumulators = {
    member_id: DEMO_MEMBER_ID,
    plan_year: DEMO_PLAN_YEAR,
    individual_deductible_used: 25_000,
    individual_deductible_max: 150_000,
    family_deductible_used: 25_000,
    family_deductible_max: 300_000,
    individual_oop_used: 25_000,
    individual_oop_max: 500_000,
    family_oop_used: 25_000,
    family_oop_max: 1_000_000,
    benefit_limits: [],
  };

  const { error: accError } = await supabase.from("member_accumulators").upsert(
    [
      {
        member_id: DEMO_MEMBER_ID,
        plan_year: DEMO_PLAN_YEAR,
        payload: accumulators as unknown as never,
      },
    ] as never,
    { onConflict: "member_id,plan_year" },
  );
  if (accError) console.error("[repository] seedIfEmpty accumulator seed failed", accError.message);

  const claimIds: string[] = [];
  for (let i = 0; i < SEED_ROWS.length; i++) {
    const row = buildSeedRow(SEED_ROWS[i], i);
    const { claim } = rowToClaim(row, SEED_ROWS[i].source, "seed-batch-001");
    claimIds.push(claim.claim_id);
    await saveClaim(claim);
  }

  const nowIso = new Date().toISOString();
  const demoCase: Case = {
    case_id: "CASE-DEMO-1",
    title: "Aetna denial — missing information",
    claim_ids: [claimIds[0]],
    status: "open",
    owner: "unassigned",
    opened_at: nowIso,
    priority: "high",
  };
  const { error: caseError } = await supabase
    .from("cases")
    .upsert(
      [
        { case_id: demoCase.case_id, payload: demoCase as unknown as never, updated_at: nowIso },
      ] as never,
      { onConflict: "case_id" },
    );
  if (caseError) console.error("[repository] seedIfEmpty case seed failed", caseError.message);

  const demoEvent: CaseEvent = {
    event_id: "EVT-DEMO-1",
    case_id: demoCase.case_id,
    occurred_at: nowIso,
    actor: "system",
    kind: "note",
    description: "Case opened from seed data — claim missing information per CO-16.",
  };
  const { error: eventError } = await supabase.from("case_events").insert([
    {
      event_id: demoEvent.event_id,
      case_id: demoEvent.case_id,
      payload: demoEvent as unknown as never,
    },
  ] as never);
  if (eventError)
    console.error("[repository] seedIfEmpty case event seed failed", eventError.message);
}
