// Regression coverage for weaverRuntime.ts's recommendation
// confidence/action and glueRuntime.ts's execution gate. Both used to be
// hardcoded ("approve"/0.7 in Weaver; no check at all in Glue beyond
// authorization.decision), so the gate could never actually fail. Now
// confidence reflects real claim-data completeness and Glue holds
// execution when Weaver flags the input as too incomplete to act on.

import { describe, it, expect } from "vitest";
import { WeaverRuntime } from "../subsystems/weaver/weaverRuntime";
import { GlueRuntime } from "../subsystems/glue/glueRuntime";

describe("WeaverRuntime.handleRecommendation — confidence from real data completeness", () => {
  it("scores full claim data (procedure, diagnosis, positive amount) as high-confidence approve", () => {
    const result = WeaverRuntime.handle("recommendation", {
      claimId: "c1",
      organizationId: "org-1",
      claimPayload: { amount: 500, procedure_code: "99213", diagnosis_codes: ["Z00.00"] },
    });

    expect(result.confidence).toBe(1);
    expect(result.action).toBe("approve");
  });

  it("scores a bare amount-only claim right at the approve threshold", () => {
    const result = WeaverRuntime.handle("recommendation", {
      claimId: "c2",
      organizationId: "org-1",
      claimPayload: { amount: 800 },
    });

    expect(result.confidence).toBe(0.55);
    expect(result.action).toBe("approve");
  });

  it("flags a claim with no usable data at all for review, not approve", () => {
    const result = WeaverRuntime.handle("recommendation", {
      claimId: "c3",
      organizationId: "org-1",
      claimPayload: {},
    });

    expect(result.confidence).toBe(0.4);
    expect(result.action).toBe("review");
  });

  it("does not count a non-numeric or zero amount as a positive amount", () => {
    const result = WeaverRuntime.handle("recommendation", {
      claimId: "c4",
      organizationId: "org-1",
      claimPayload: { amount: 0, procedure_code: "99213" },
    });

    // baseline 0.4 + procedure code 0.3 = 0.7, amount contributes nothing
    expect(result.confidence).toBe(0.7);
  });
});

describe("GlueRuntime.handleExecution — gates on Weaver's review flag", () => {
  it("executes when authorization allows and recommendation is a confident approve", () => {
    const result = GlueRuntime.handle("execution", {
      claimId: "c5",
      organizationId: "org-1",
      authorization: { decision: "allow" },
      recommendation: { action: "approve", confidence: 1 },
    });

    expect(result.status).toBe("executed");
  });

  it("holds execution when authorization allows but recommendation is 'review'", () => {
    const result = GlueRuntime.handle("execution", {
      claimId: "c6",
      organizationId: "org-1",
      authorization: { decision: "allow" },
      recommendation: { action: "review", confidence: 0.4 },
    });

    expect(result.status).toBe("skipped");
    expect(result.reason).toContain("review");
  });

  it("still skips on authorization denial regardless of recommendation", () => {
    const result = GlueRuntime.handle("execution", {
      claimId: "c7",
      organizationId: "org-1",
      authorization: { decision: "deny" },
      recommendation: { action: "approve", confidence: 1 },
    });

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("Authorization denied");
  });
});
