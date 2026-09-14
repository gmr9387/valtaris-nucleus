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
