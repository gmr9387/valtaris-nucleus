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

export interface NewPlanBenefit {
  organization_id?: string | null;
  payer_name: string;
  plan_name: string;
  version: string;
  plan_year: number;
  effective_date: string;
  termination_date?: string | null;
  deductible_individual: number;
  deductible_family: number;
  oop_max_individual: number;
  oop_max_family: number;
  coinsurance_rate: number;
  copay_amount?: number | null;
  copay_applies_to?: string[] | null;
  cob_policy: PlanBenefitRow["cob_policy"];
  covered_services: PlanBenefitRow["covered_services"];
}

/** Throws on failure so the calling form can surface the error. */
export async function createPlanBenefit(input: NewPlanBenefit): Promise<PlanBenefitRow> {
  const { data, error } = await supabase
    .from("plan_benefits")
    .insert({
      organization_id: input.organization_id ?? null,
      payer_name: input.payer_name,
      plan_name: input.plan_name,
      version: input.version,
      plan_year: input.plan_year,
      effective_date: input.effective_date,
      termination_date: input.termination_date ?? null,
      deductible_individual: input.deductible_individual,
      deductible_family: input.deductible_family,
      oop_max_individual: input.oop_max_individual,
      oop_max_family: input.oop_max_family,
      coinsurance_rate: input.coinsurance_rate,
      copay_amount: input.copay_amount ?? null,
      copay_applies_to: input.copay_applies_to ?? null,
      cob_policy: input.cob_policy,
      covered_services: input.covered_services,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PlanBenefitRow;
}
