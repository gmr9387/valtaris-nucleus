/**
 * COB (Coordination of Benefits) Rules Engine — ported verbatim from
 * valtaris-nucleus's
 * src/nucleus/subsystems/guardian/adjudication/cobRules.ts.
 *
 * Kernel goals:
 * - deterministic
 * - timezone-safe birthday rule
 * - explicit behavior for every COB policy type
 * - no silent unknown-policy fallthrough
 * - allocation rounding preserves cents
 */

import type { PriorPayerOutcome, COBAllocation, COBPolicyType, OHIIndicator } from "./types.ts";
import type { RuleFiring } from "./types.ts";
import { createRuleFiring } from "./traceBuilder.ts";

export interface COBPrimacyRule {
  rule_id: string;
  name: string;
  priority: number;
  evaluate: (indicators: OHIIndicator[], context: PrimacyContext) => PrimacyResult | null;
}

export interface PrimacyContext {
  member_dob?: string;
  spouse_dob?: string;
  custody_decree?: boolean;
  custodial_parent_payer_id?: string;
  employment_status?: string;
  coverage_start_dates?: Map<string, string>;
  msp_type?: string;
}

export interface PrimacyResult {
  primary_payer_id: string;
  secondary_payer_id: string;
  rationale: string;
  rule_id: string;
}

function extractMonthDayFromISO(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return `${match[2]}-${match[3]}`;
}

function validatePrimacyResult(result: PrimacyResult, indicators: OHIIndicator[]): void {
  if (indicators.length === 0) return;
  const validPayerIds = new Set(indicators.map((indicator) => indicator.payer_id));
  const primaryIsSynthetic =
    result.primary_payer_id === "member_plan" || result.primary_payer_id === "spouse_plan";
  const secondaryIsSynthetic =
    result.secondary_payer_id === "member_plan" || result.secondary_payer_id === "spouse_plan";

  if (!primaryIsSynthetic && !validPayerIds.has(result.primary_payer_id)) {
    throw new Error(
      `COB primacy rule ${result.rule_id} returned invalid primary payer ${result.primary_payer_id}`,
    );
  }
  if (!secondaryIsSynthetic && !validPayerIds.has(result.secondary_payer_id)) {
    throw new Error(
      `COB primacy rule ${result.rule_id} returned invalid secondary payer ${result.secondary_payer_id}`,
    );
  }
}

export const birthdayRule: COBPrimacyRule = {
  rule_id: "COB_BIRTHDAY_001",
  name: "Birthday Rule",
  priority: 10,
  evaluate: (_indicators, context) => {
    if (!context.member_dob || !context.spouse_dob) return null;
    const memberKey = extractMonthDayFromISO(context.member_dob);
    const spouseKey = extractMonthDayFromISO(context.spouse_dob);
    if (!memberKey || !spouseKey) return null;

    if (memberKey <= spouseKey) {
      return {
        primary_payer_id: "member_plan",
        secondary_payer_id: "spouse_plan",
        rationale: "Member birthday earlier in calendar year (Birthday Rule)",
        rule_id: "COB_BIRTHDAY_001",
      };
    }
    return {
      primary_payer_id: "spouse_plan",
      secondary_payer_id: "member_plan",
      rationale: "Spouse birthday earlier in calendar year (Birthday Rule)",
      rule_id: "COB_BIRTHDAY_001",
    };
  },
};

export const lengthOfCoverageRule: COBPrimacyRule = {
  rule_id: "COB_LENGTH_001",
  name: "Length of Coverage",
  priority: 20,
  evaluate: (_indicators, context) => {
    if (!context.coverage_start_dates || context.coverage_start_dates.size < 2) {
      return null;
    }
    const entries = Array.from(context.coverage_start_dates.entries()).sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
    return {
      primary_payer_id: entries[0][0],
      secondary_payer_id: entries[1][0],
      rationale: `Longer coverage period determines primacy (${entries[0][0]} started ${entries[0][1]})`,
      rule_id: "COB_LENGTH_001",
    };
  },
};

export const MEMBER_PLAN_ID = "member_plan";

export const declaredOrderRule: COBPrimacyRule = {
  rule_id: "COB_DECLARED_001",
  name: "Declared Primacy Order",
  priority: 0,
  evaluate: (indicators) => {
    const ordered = indicators.filter(
      (indicator): indicator is OHIIndicator & { primacy_order: number } =>
        typeof indicator.primacy_order === "number",
    );
    if (ordered.length === 0) return null;

    const sorted = [...ordered].sort((a, b) => a.primacy_order - b.primacy_order);
    const declaredPrimary = sorted[0];

    if (declaredPrimary.primacy_order === 1) {
      return {
        primary_payer_id: declaredPrimary.payer_id,
        secondary_payer_id: MEMBER_PLAN_ID,
        rationale: `${declaredPrimary.payer_name} is declared primary (primacy_order 1).`,
        rule_id: "COB_DECLARED_001",
      };
    }
    return {
      primary_payer_id: MEMBER_PLAN_ID,
      secondary_payer_id: declaredPrimary.payer_id,
      rationale: "No OHI indicator declares primacy_order 1 -- this plan adjudicates as primary.",
      rule_id: "COB_DECLARED_001",
    };
  },
};

export function determineCOBPrimacy(
  indicators: OHIIndicator[],
  context: PrimacyContext,
  rulePacks: COBPrimacyRule[] = [declaredOrderRule, birthdayRule, lengthOfCoverageRule],
  ruleFirings: RuleFiring[] = [],
): PrimacyResult | null {
  const sorted = [...rulePacks].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    const result = rule.evaluate(indicators, context);
    if (result) {
      validatePrimacyResult(result, indicators);
      ruleFirings.push(
        createRuleFiring(
          ruleFirings.length,
          rule.rule_id,
          "cob_primacy",
          {
            indicators: indicators.map((i) => i.payer_id),
            context_keys: Object.keys(context),
          },
          {
            primary: result.primary_payer_id,
            secondary: result.secondary_payer_id,
          },
          [`frag_cob_${rule.rule_id.toLowerCase()}`],
        ),
      );
      return result;
    }
  }
  return null;
}

function distributeByLargestRemainder(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  if (total <= 0) return weights.map(() => 0);

  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);

  if (weightTotal <= 0) {
    const base = Math.floor(total / weights.length);
    const remainder = total - base * weights.length;
    return weights.map((_, index) => base + (index < remainder ? 1 : 0));
  }

  const ideals = weights.map((weight) => (Math.max(0, weight) / weightTotal) * total);
  const floors = ideals.map((value) => Math.floor(value));
  const floorTotal = floors.reduce((sum, value) => sum + value, 0);
  const remainder = total - floorTotal;

  const ranked = ideals
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort((a, b) => {
      if (b.remainder !== a.remainder) return b.remainder - a.remainder;
      return a.index - b.index;
    });

  const output = [...floors];
  for (let i = 0; i < remainder; i += 1) {
    output[ranked[i]?.index ?? i % output.length] += 1;
  }
  return output;
}

function buildAllocations(
  priorOutcomes: PriorPayerOutcome[],
  method: COBPolicyType,
  totalAdjustment: number,
): COBAllocation[] {
  if (priorOutcomes.length === 0) return [];

  const weights = priorOutcomes.map((outcome) => Math.max(0, outcome.paid));
  const distributedAdjustments = distributeByLargestRemainder(totalAdjustment, weights);

  return priorOutcomes.map((po, index) => ({
    payer_id: po.payer_id,
    payer_order: 1,
    allowed: po.allowed,
    paid: po.paid,
    adjustment: distributedAdjustments[index] ?? 0,
    method,
  }));
}

export function calculateCOBAllocation(
  allowed: number,
  priorOutcomes: PriorPayerOutcome[],
  cobPolicy: COBPolicyType,
): { total_prior_paid: number; adjustment: number; allocations: COBAllocation[] } {
  const safeAllowed = Math.max(0, allowed);
  const rawPriorPaid = priorOutcomes.reduce((sum, po) => sum + Math.max(0, po.paid), 0);
  const totalPriorPaid = Math.min(rawPriorPaid, safeAllowed);
  const remainingAllowed = Math.max(0, safeAllowed - totalPriorPaid);

  let adjustment: number;

  switch (cobPolicy) {
    case "standard": {
      adjustment = 0;
      break;
    }
    case "non_duplication": {
      adjustment = remainingAllowed;
      break;
    }
    case "carve_out": {
      adjustment = remainingAllowed;
      break;
    }
    case "maintenance_of_benefits": {
      adjustment = totalPriorPaid >= safeAllowed ? remainingAllowed : 0;
      break;
    }
    default: {
      throw new Error(
        `Unknown COB policy type: ${String(cobPolicy)}. Valid types: standard, non_duplication, carve_out, maintenance_of_benefits`,
      );
    }
  }

  const cappedAdjustment = Math.max(0, Math.min(adjustment, remainingAllowed));

  return {
    total_prior_paid: totalPriorPaid,
    adjustment: cappedAdjustment,
    allocations: buildAllocations(priorOutcomes, cobPolicy, cappedAdjustment),
  };
}
