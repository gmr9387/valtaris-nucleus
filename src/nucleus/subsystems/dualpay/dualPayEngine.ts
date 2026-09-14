export type DualPayInput = {
  claimId: string;
  organizationId: string;

  execution?: {
    status: "executed" | "skipped" | "escalated";
    reason: string;
  };

  opportunity?: {
    score?: number;
  };

  authorization?: {
    decision: "allow" | "deny";
    // FIXED: added -- Guardian now attaches the real adjudication result
    // (deductible/coinsurance/benefit-limit math) to every authorization
    // it emits. plan_paid is in cents, matching the calculation engine's
    // convention throughout.
    adjudication?: {
      status: string;
      allowed: number;
      plan_paid: number;
      member_responsibility: number;
      deductible_applied: number;
      coinsurance: number;
    };
  };

  recommendation?: {
    action: "approve" | "deny" | "review" | "escalate";
    confidence: number;
  };
};

export type DualPayOutput = {
  financialAction: "charge" | "hold" | "release" | "deny";
  amount: number;
  reason: string;
};

export class DualPayEngine {
  static react(input: DualPayInput): DualPayOutput {
    const { execution, authorization } = input;

    if (authorization?.decision === "deny") {
      return {
        financialAction: "deny",
        amount: 0,
        reason: "Authorization denied by Guardian",
      };
    }

    if (execution?.status === "escalated") {
      return {
        financialAction: "hold",
        amount: 0,
        reason: "Glue escalated workflow",
      };
    }

    if (execution?.status === "skipped") {
      return {
        financialAction: "release",
        amount: 0,
        reason: "Workflow skipped",
      };
    }

    if (execution?.status === "executed") {
      // FIXED: previously computed a fabricated amount from
      // baseAmount(25) * (score/100) * (0.5 + confidence/2) -- a formula
      // with no relationship to the claim's actual financials. Now uses
      // the real plan_paid amount Guardian's adjudication already
      // calculated (deductible applied, coinsurance, benefit limits).
      const adjudication = authorization?.adjudication;

      if (!adjudication) {
        // Authorization was allowed but carries no real adjudication
        // data -- fail closed rather than guess at an amount.
        return {
          financialAction: "hold",
          amount: 0,
          reason: "Execution allowed but no adjudication data available to determine payment",
        };
      }

      // plan_paid is in cents (calculation engine convention); convert
      // to dollars for the amount this engine reports.
      const amountDollars = Math.round(adjudication.plan_paid) / 100;

      return {
        financialAction: amountDollars > 0 ? "charge" : "hold",
        amount: amountDollars,
        reason:
          amountDollars > 0
            ? `Plan payment per adjudication: $${amountDollars.toFixed(2)}`
            : `No plan payment due (status: ${adjudication.status})`,
      };
    }

    return {
      financialAction: "hold",
      amount: 0,
      reason: "Insufficient data for financial decision",
    };
  }
}
