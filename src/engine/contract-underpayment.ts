/**
 * Underpayment Detection
 *
 * Real fee-schedule-based detection when a contracted rate is known;
 * otherwise falls back to comparing against the remittance's own allowed
 * amount (lower confidence, since a payer's stated "allowed" amount can
 * itself already reflect an underpaying adjustment).
 */
export interface UnderpaymentInput {
  billed_cents: number;
  allowed_cents: number;
  paid_cents: number;
  /** Real per-procedure contracted rate, when a fee schedule lookup succeeded. */
  contracted_rate_cents?: number;
}

export interface UnderpaymentResult {
  is_underpaid: boolean;
  shortfall_cents: number;
  basis: "fee_schedule" | "allowed_amount_estimate";
  confidence: number; // 0-1
}

export function detectUnderpayment(input: UnderpaymentInput): UnderpaymentResult {
  if (input.contracted_rate_cents !== undefined) {
    const expected = Math.min(input.contracted_rate_cents, input.billed_cents);
    const shortfall = Math.max(0, expected - input.paid_cents);
    return {
      is_underpaid: shortfall > 0,
      shortfall_cents: shortfall,
      basis: "fee_schedule",
      confidence: 0.9,
    };
  }

  const expected = input.allowed_cents > 0 ? input.allowed_cents : input.billed_cents;
  const shortfall = Math.max(0, expected - input.paid_cents);
  return {
    is_underpaid: shortfall > 0,
    shortfall_cents: shortfall,
    basis: "allowed_amount_estimate",
    confidence: input.allowed_cents > 0 ? 0.6 : 0.35,
  };
}
