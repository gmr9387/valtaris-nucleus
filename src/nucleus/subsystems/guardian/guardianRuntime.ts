import { eventBus } from "../../events/eventBus";
import { recordTelemetry } from "../../telemetry/telemetry";
import { adjudicateClaim } from "./adjudication/calculationEngine";
import { demoContract, demoPlan } from "./adjudication/demoContractPlan";
import { fetchMemberAccumulators } from "./adjudication/accumulatorRepository";
import type { ClaimLine, MemberAccumulators } from "@/types/claim";

// A default accumulator used only when no real record exists yet for
// this member/year (e.g. brand-new member, no claims history). This is
// the correct "nothing used yet" state, not a guess -- deductible/OOP
// used = 0, no benefit limits consumed.
function emptyAccumulators(memberId: string, planYear: number): MemberAccumulators {
  return {
    member_id: memberId,
    plan_year: planYear,
    individual_deductible_used: 0,
    individual_deductible_max: demoPlan.deductible_individual,
    family_deductible_used: 0,
    family_deductible_max: demoPlan.deductible_family,
    individual_oop_used: 0,
    individual_oop_max: demoPlan.oop_max_individual,
    family_oop_used: 0,
    family_oop_max: demoPlan.oop_max_family,
    benefit_limits: [],
  };
}

// KNOWN LIMITATION: Nucleus's incoming claimPayload today only carries
// {claimId, amount} -- it does not yet capture real claim-line detail
// (procedure code, service date, diagnosis codes). Until the pipeline
// upstream is extended to pass that through, a placeholder procedure
// code is used so the demo fee schedule can resolve an allowed amount
// at all. This is flagged explicitly in the returned result
// (usedPlaceholderProcedureCode: true) rather than silently defaulted,
// since it changes what the "allowed" amount actually means.
const PLACEHOLDER_PROCEDURE_CODE = "99213";

function buildClaimLine(payload: any): { line: ClaimLine; usedPlaceholder: boolean } {
  const procedureCode = payload.claimPayload?.procedure_code;
  const usedPlaceholder = !procedureCode;

  const line: ClaimLine = {
    line_id: `${payload.claimId}-L1`,
    claim_id: payload.claimId,
    service_date: payload.claimPayload?.service_date ?? new Date().toISOString().slice(0, 10),
    claim_line_number: 1,
    procedure_code: procedureCode ?? PLACEHOLDER_PROCEDURE_CODE,
    diagnosis_codes: payload.claimPayload?.diagnosis_codes ?? [],
    billed_amount: Math.round((payload.claimPayload?.amount ?? 0) * 100), // dollars -> cents
    units: payload.claimPayload?.units ?? 1,
    place_of_service: payload.claimPayload?.place_of_service ?? "11",
  };

  return { line, usedPlaceholder };
}

export class GuardianRuntime {
  static async handle(contractName: string, payload: any) {
    switch (contractName) {
      case "authorization":
        return this.handleAuthorization(payload);

      default:
        throw new Error(`Guardian cannot handle contract: ${contractName}`);
    }
  }

  private static async handleAuthorization(payload: any) {
    const memberId = payload.claimPayload?.memberId ?? payload.organizationId;
    const planYear = payload.claimPayload?.planYear ?? new Date().getFullYear();

    let accumulators: MemberAccumulators;
    let usedEmptyAccumulators = false;
    try {
      const real = await fetchMemberAccumulators(memberId, planYear);
      if (real) {
        accumulators = real;
      } else {
        accumulators = emptyAccumulators(memberId, planYear);
        usedEmptyAccumulators = true;
      }
    } catch (err) {
      // Fail closed: if we can't verify real accumulator state, we
      // should not silently authorize as if the member has full
      // benefits remaining.
      const result = {
        ...payload,
        decision: "deny",
        reason: `Unable to verify member accumulators: ${(err as Error).message}`,
        timestamp: Date.now(),
      };
      eventBus.emit("guardian.authorization.processed", result);
      recordTelemetry("guardian", "authorization", result.claimId, result.organizationId, result);
      return result;
    }

    const { line, usedPlaceholder } = buildClaimLine(payload);

    // NOTE: demoContract/demoPlan are DEMO data (see demoContractPlan.ts)
    // -- real per-provider contract terms and per-plan benefit configs
    // don't exist as a queryable data source yet, even in DualPay's own
    // app. Accumulators above are real; these two inputs are not yet.
    const { run } = adjudicateClaim([line], accumulators, demoContract, demoPlan);

    const lineResult = run.line_results[0];
    const denied = lineResult.status === "denied" || lineResult.status === "benefit_limit_exhausted";

    const result = {
      ...payload,
      decision: denied ? "deny" : "allow",
      reason: denied
        ? (lineResult.denial_reasons?.[0] ?? `Adjudication status: ${lineResult.status}`)
        : `Adjudicated: plan pays $${(lineResult.plan_paid / 100).toFixed(2)}, member owes $${(lineResult.member_responsibility / 100).toFixed(2)}`,
      adjudication: {
        status: lineResult.status,
        allowed: lineResult.allowed,
        plan_paid: lineResult.plan_paid,
        member_responsibility: lineResult.member_responsibility,
        deductible_applied: lineResult.deductible_applied,
        coinsurance: lineResult.coinsurance,
      },
      usedEmptyAccumulators,
      usedPlaceholderProcedureCode: usedPlaceholder,
      timestamp: Date.now(),
    };

    eventBus.emit("guardian.authorization.processed", result);

    recordTelemetry(
      "guardian",
      "authorization",
      result.claimId,
      result.organizationId,
      result
    );

    return result;
  }
}
