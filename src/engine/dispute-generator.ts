/**
 * Opens a real dispute record (disputes table — see
 * supabase/migrations/20260914_claims_core.sql) when an underpayment
 * clears the de-minimis threshold. This is what Workflow 3 (appeal
 * generation) reads from — detecting an underpayment that never becomes
 * a persisted dispute is invisible to everything downstream.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PayerContract } from "@/types/contracts";
import type { UnderpaymentResult } from "./contract-underpayment";

const MIN_DISPUTE_CENTS = 500; // $5 — below this, staff time to dispute costs more than the recovery

export interface MaybeGenerateDisputeInput {
  claim_id: string;
  payer_name: string;
  procedure_code: string | null;
  contract: PayerContract | null;
  allowed_cents: number;
  paid_cents: number;
  underpayment: UnderpaymentResult;
}

export interface MaybeGenerateDisputeResult {
  created: boolean;
  dispute_id?: string;
}

export async function maybeGenerateDispute(
  input: MaybeGenerateDisputeInput,
): Promise<MaybeGenerateDisputeResult> {
  if (!input.underpayment.is_underpaid || input.underpayment.shortfall_cents < MIN_DISPUTE_CENTS) {
    return { created: false };
  }

  const { data, error } = await supabase
    .from("disputes")
    .insert([
      {
        claim_id: input.claim_id,
        payer_name: input.payer_name,
        procedure_code: input.procedure_code,
        contract_id: input.contract?.contract_id ?? null,
        allowed_cents: input.allowed_cents,
        paid_cents: input.paid_cents,
        shortfall_cents: input.underpayment.shortfall_cents,
        basis: input.underpayment.basis,
        confidence: input.underpayment.confidence,
        status: "open",
      },
    ] as never)
    .select("dispute_id")
    .single();

  if (error || !data) {
    console.error("[dispute-generator] failed to create dispute", error?.message);
    return { created: false };
  }

  return { created: true, dispute_id: (data as { dispute_id: string }).dispute_id };
}
