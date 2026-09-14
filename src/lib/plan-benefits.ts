/**
 * Real, Supabase-backed plan benefits storage -- mirrors @/lib/contracts.ts
 * exactly. @/engine/plan-benefits-to-terms.ts converts what this returns
 * into the PlanBenefits shape the adjudication engine actually consumes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PlanBenefitRow } from "@/types/plan-benefits";

export async function listPlanBenefits(): Promise<PlanBenefitRow[]> {
  const { data, error } = await supabase
    .from("plan_benefits")
    .select("*")
    .order("payer_name", { ascending: true })
    .order("effective_date", { ascending: false });
  if (error) {
    console.error("[plan-benefits] listPlanBenefits failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as PlanBenefitRow[];
}

export async function getPlanBenefits(plan_id: string): Promise<PlanBenefitRow | null> {
  const { data, error } = await supabase
    .from("plan_benefits")
    .select("*")
    .eq("plan_id", plan_id)
    .maybeSingle();
  if (error) {
    console.error("[plan-benefits] getPlanBenefits failed", error.message);
    return null;
  }
  return (data as unknown as PlanBenefitRow) ?? null;
}
