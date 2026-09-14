// src/nucleus/subsystems/guardian/adjudication/accumulatorRepository.ts
//
// Fetches REAL member accumulator data from the same Supabase table
// DualPay's own app reads (member_accumulators). Confirmed schema via
// DualPay's migrations: member_id + plan_year is the composite primary
// key, with a payload JSONB column holding the full MemberAccumulators
// object. This queries a single member directly rather than loading
// every row like DualPay's own loadAccumulators() does.

import { supabase } from "../../../../integrations/supabase/supabaseClient";
import type { MemberAccumulators } from "@/types/claim";

/**
 * Returns null if no accumulator record exists yet for this member/year
 * (e.g. a brand-new member with no claims history). Callers must decide
 * what a "no accumulator record" case means for authorization -- this
 * function does not assume a default.
 */
export async function fetchMemberAccumulators(
  memberId: string,
  planYear: number,
): Promise<MemberAccumulators | null> {
  const { data, error } = await supabase
    .from("member_accumulators")
    .select("payload")
    .eq("member_id", memberId)
    .eq("plan_year", planYear)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch accumulators for member ${memberId}: ${error.message}`);
  }

  if (!data?.payload) {
    return null;
  }

  return data.payload as unknown as MemberAccumulators;
}

/**
 * Persists updated deductible/OOP/benefit-limit usage after a claim is
 * adjudicated. Previously nothing called this at all: fetchMemberAccumulators()
 * only reads, so every claim was adjudicated against the same frozen
 * snapshot forever -- a member's deductible never actually advanced
 * between claims processed through this pipeline.
 */
export async function saveMemberAccumulators(accumulators: MemberAccumulators): Promise<void> {
  const { error } = await supabase.from("member_accumulators").upsert(
    {
      member_id: accumulators.member_id,
      plan_year: accumulators.plan_year,
      payload: accumulators as unknown as never,
    } as never,
    { onConflict: "member_id,plan_year" },
  );

  if (error) {
    throw new Error(
      `Failed to save updated accumulators for member ${accumulators.member_id}: ${error.message}`,
    );
  }
}
