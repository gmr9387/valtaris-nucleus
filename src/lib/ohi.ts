/**
 * Real, Supabase-backed member OHI (other health insurance) storage.
 * Closes the gap noted alongside the COB primacy engine
 * (@/nucleus/subsystems/guardian/adjudication/cobRules.ts): that engine
 * had real, tested primacy logic but nothing populated
 * claim.ohi_indicators from a live data path. This is that live path --
 * OHI recorded per member (from a COB questionnaire, eligibility
 * response, etc.), not per claim, matching how member_accumulators is
 * already member-scoped rather than claim-scoped.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OHIIndicator } from "@/types/claim";

interface MemberOhiRow {
  member_id: string;
  payer_id: string;
  payer_name: string;
  coverage_type: string;
  primacy_order: number | null;
  subscriber_id: string | null;
  group_number: string | null;
}

function rowToIndicator(row: MemberOhiRow): OHIIndicator {
  return {
    payer_id: row.payer_id,
    payer_name: row.payer_name,
    coverage_type: row.coverage_type,
    primacy_order: row.primacy_order ?? undefined,
    subscriber_id: row.subscriber_id ?? undefined,
    group_number: row.group_number ?? undefined,
  };
}

export async function listMemberOhi(memberId: string): Promise<OHIIndicator[]> {
  const { data, error } = await supabase
    .from("member_ohi")
    .select(
      "member_id, payer_id, payer_name, coverage_type, primacy_order, subscriber_id, group_number",
    )
    .eq("member_id", memberId);
  if (error) {
    console.error("[ohi] listMemberOhi failed", error.message);
    return [];
  }
  return ((data ?? []) as unknown as MemberOhiRow[]).map(rowToIndicator);
}

/** Batch-loads OHI for every member with at least one record on file, keyed by member_id -- mirrors loadAccumulators()'s shape in @/data/repository.ts. */
export async function listAllMemberOhi(): Promise<Record<string, OHIIndicator[]>> {
  const { data, error } = await supabase
    .from("member_ohi")
    .select(
      "member_id, payer_id, payer_name, coverage_type, primacy_order, subscriber_id, group_number",
    );
  if (error) {
    console.error("[ohi] listAllMemberOhi failed", error.message);
    return {};
  }
  const result: Record<string, OHIIndicator[]> = {};
  for (const row of (data ?? []) as unknown as MemberOhiRow[]) {
    (result[row.member_id] ??= []).push(rowToIndicator(row));
  }
  return result;
}

/** Throws on failure so the calling form can surface the error. */
export async function upsertMemberOhi(
  memberId: string,
  indicator: OHIIndicator,
  organizationId?: string | null,
): Promise<void> {
  const { error } = await supabase.from("member_ohi").upsert(
    [
      {
        member_id: memberId,
        organization_id: organizationId ?? null,
        payer_id: indicator.payer_id,
        payer_name: indicator.payer_name,
        coverage_type: indicator.coverage_type,
        primacy_order: indicator.primacy_order ?? null,
        subscriber_id: indicator.subscriber_id ?? null,
        group_number: indicator.group_number ?? null,
        updated_at: new Date().toISOString(),
      },
    ] as never,
    { onConflict: "member_id,payer_id" },
  );
  if (error) throw error;
}

/** Throws on failure so the calling form can surface the error. */
export async function deleteMemberOhi(memberId: string, payerId: string): Promise<void> {
  const { error } = await supabase
    .from("member_ohi")
    .delete()
    .eq("member_id", memberId)
    .eq("payer_id", payerId);
  if (error) throw error;
}
