/**
 * Real, Supabase-backed payer contract + fee schedule storage (Phase 15).
 * @/engine/contract-to-terms.ts converts what this returns into the
 * ContractTerms shape the adjudication engine actually consumes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PayerContract, FeeScheduleRow } from "@/types/contracts";

export async function listContracts(): Promise<PayerContract[]> {
  const { data, error } = await supabase
    .from("payer_contracts")
    .select("*")
    .order("payer_name", { ascending: true })
    .order("effective_date", { ascending: false });
  if (error) {
    console.error("[contracts] listContracts failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as PayerContract[];
}

export async function getContract(contract_id: string): Promise<PayerContract | null> {
  const { data, error } = await supabase
    .from("payer_contracts")
    .select("*")
    .eq("contract_id", contract_id)
    .maybeSingle();
  if (error) {
    console.error("[contracts] getContract failed", error.message);
    return null;
  }
  return (data as unknown as PayerContract) ?? null;
}

export async function listFeeSchedules(contract_id: string): Promise<FeeScheduleRow[]> {
  const { data, error } = await supabase
    .from("fee_schedules")
    .select("*")
    .eq("contract_id", contract_id);
  if (error) {
    console.error("[contracts] listFeeSchedules failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as FeeScheduleRow[];
}

export interface NewContract {
  organization_id?: string | null;
  payer_name: string;
  provider_npi?: string | null;
  version: string;
  effective_date: string;
  termination_date?: string | null;
  reimbursement_method: "fee_schedule" | "percent_of_billed";
  percent_of_billed?: number | null;
}

/** Throws on failure so the calling form can surface the error. */
export async function createContract(input: NewContract): Promise<PayerContract> {
  const { data, error } = await supabase
    .from("payer_contracts")
    .insert({
      organization_id: input.organization_id ?? null,
      payer_name: input.payer_name,
      provider_npi: input.provider_npi ?? null,
      version: input.version,
      effective_date: input.effective_date,
      termination_date: input.termination_date ?? null,
      reimbursement_method: input.reimbursement_method,
      percent_of_billed: input.percent_of_billed ?? null,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PayerContract;
}

export interface NewFeeScheduleRow {
  contract_id: string;
  procedure_code: string;
  contracted_amount_cents: number;
}

/** Throws on failure so the calling form can surface the error. */
export async function addFeeScheduleRow(input: NewFeeScheduleRow): Promise<FeeScheduleRow> {
  const { data, error } = await supabase
    .from("fee_schedules")
    .upsert([input] as never, { onConflict: "contract_id,procedure_code" })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as FeeScheduleRow;
}
