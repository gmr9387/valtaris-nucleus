// Regression coverage for weaverRuntime.ts's recommendation
// confidence/action and glueRuntime.ts's execution gate. Confidence used
// to be a hardcoded constant (0.7), then a fixed if-chain of weights
// baked into this file; it's now a persisted, configurable rule set
// (weaver_rules -- see supabase/migrations/20260915_weaver_rules.sql)
// evaluated at runtime. These tests mock @/lib/weaver-rules so the
// exact default rules the migration seeds (reproducing the prior
// if-chain's weights) are exercised without a live Supabase call --
// this is unit coverage of the evaluator wiring, not an integration
// test of Supabase itself.

import { describe, it, expect, vi } from "vitest";
import type { WeaverRule } from "../../types/weaver-rules";

const DEFAULT_RECOMMENDATION_RULES: WeaverRule[] = [
  {
    rule_id: "r1",
    organization_id: null,
    stage: "recommendation",
    name: "Has procedure code",
    field_path: "claimPayload.procedure_code",
    operator: "nonempty_string",
    value: null,
    weight: 0.3,
    enabled: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    rule_id: "r2",
    organization_id: null,
    stage: "recommendation",
    name: "Has diagnosis codes",
    field_path: "claimPayload.diagnosis_codes",
    operator: "nonempty_array",
    value: null,
    weight: 0.15,
    enabled: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    rule_id: "r3",
    organization_id: null,
    stage: "recommendation",
    name: "Positive claim amount",
    field_path: "claimPayload.amount",
    operator: "gt",
    value: "0",
    weight: 0.15,
    enabled: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

vi.mock("@/lib/weaver-rules", () => ({
  listWeaverRules: (stage: string) =>
    Promise.resolve(stage === "recommendation" ? DEFAULT_RECOMMENDATION_RULES : []),
}));

const { WeaverRuntime } = await import("../subsystems/weaver/weaverRuntime");
const { GlueRuntime } = await import("../subsystems/glue/glueRuntime");

describe("WeaverRuntime.handleRecommendation — confidence from real data completeness", () => {
  it("scores full claim data (procedure, diagnosis, positive amount) as high-confidence approve", async () => {
    const result = await WeaverRuntime.handle("recommendation", {
      claimId: "c1",
      organizationId: "org-1",
      claimPayload: { amount: 500, procedure_code: "99213", diagnosis_codes: ["Z00.00"] },
    });

    expect(result.confidence).toBe(1);
    expect(result.action).toBe("approve");
  });

  it("scores a bare amount-only claim right at the approve threshold", async () => {
    const result = await WeaverRuntime.handle("recommendation", {
      claimId: "c2",
      organizationId: "org-1",
      claimPayload: { amount: 800 },
    });

    expect(result.confidence).toBe(0.55);
    expect(result.action).toBe("approve");
  });

  it("flags a claim with no usable data at all for review, not approve", async () => {
    const result = await WeaverRuntime.handle("recommendation", {
      claimId: "c3",
      organizationId: "org-1",
      claimPayload: {},
    });

    expect(result.confidence).toBe(0.4);
    expect(result.action).toBe("review");
  });

  it("does not count a non-numeric or zero amount as a positive amount", async () => {
    const result = await WeaverRuntime.handle("recommendation", {
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
