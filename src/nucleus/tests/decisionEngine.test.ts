// Decision engine constitutional test.
//
// Verifies the decision engine actually derives its verdict from real
// Guardian/Weaver signals passed in `context` -- not a hardcoded
// {allowed: true, confidence: 0.9} -- and that governance rules fire by
// name rather than the default always-allow (see decision/engine.ts,
// decision/executor.ts, decision/governance.ts).

import { describe, test, expect } from "vitest";

import { DecisionEngine } from "../decision/engine";
import { Executor } from "../decision/executor";
import { Governance } from "../decision/governance";
import { Confidence } from "../decision/confidence";

describe("Executor", () => {
  test("allows and computes real confidence from Weaver signals when Guardian allows", () => {
    const result = new Executor().execute({
      organizationId: "org-1",
      subsystem: "decision",
      context: {
        authorization: { decision: "allow", risk_tier: "low" },
        opportunity: { score: 80 },
        recommendation: { confidence: 0.6 },
      },
    });

    expect(result.allowed).toBe(true);
    // (80/100 + 0.6) / 2 = 0.7
    expect(result.confidence).toBeCloseTo(0.7, 5);
    expect(result.reasons).toContain("no denial signals present");
  });

  test("denies and explains why when Guardian denies", () => {
    const result = new Executor().execute({
      organizationId: "org-1",
      subsystem: "decision",
      context: {
        authorization: { decision: "deny", reason: "benefit exhausted" },
      },
    });

    expect(result.allowed).toBe(false);
    expect(
      result.reasons.some((r) => r.includes("guardian denied") && r.includes("benefit exhausted")),
    ).toBe(true);
  });

  test("denies on critical risk tier even without an explicit deny decision", () => {
    const result = new Executor().execute({
      organizationId: "org-1",
      subsystem: "decision",
      context: {
        authorization: {
          decision: "allow",
          risk_tier: "critical",
          reason: "kill switch unreachable",
        },
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("risk tier critical"))).toBe(true);
  });

  test("returns 0 confidence and says so when no Weaver signals are present", () => {
    const result = new Executor().execute({
      organizationId: "org-1",
      subsystem: "decision",
      context: {},
    });

    expect(result.confidence).toBe(0);
    expect(result.reasons).toContain("no weaver signals present in context");
  });
});

describe("Governance", () => {
  test("has no rules by default and falls through to allow", () => {
    const governance = new Governance();
    expect(governance.evaluate({ authorization: { risk_tier: "critical" } })).toBe("allow");
  });

  test("a registered rule actually governs evaluate()", () => {
    const governance = new Governance();
    governance.addRule({
      id: "test-rule",
      name: "deny critical risk",
      condition: (ctx) => ctx?.authorization?.risk_tier === "critical",
      effect: "deny",
    });

    expect(governance.evaluate({ authorization: { risk_tier: "critical" } })).toBe("deny");
    expect(governance.evaluate({ authorization: { risk_tier: "low" } })).toBe("allow");
  });
});

describe("Confidence", () => {
  test("blends multiple real signals rather than echoing a single input", () => {
    const confidence = new Confidence();
    expect(confidence.score([0.9, 0.8, 0.6])).toBeCloseTo(0.7666666, 5);
    // The pre-fix call site was confidence.score([base.confidence]) --
    // a single-element average is mathematically a no-op; this asserts
    // that specific degenerate case still behaves correctly too.
    expect(confidence.score([0.9])).toBe(0.9);
  });
});

describe("DecisionEngine (wired, as OSPipeline actually calls it)", () => {
  test("registers real default governance rules that fire on Guardian's real signals", () => {
    const engine = new DecisionEngine("org-1", "decision");

    const denied = engine.evaluate({
      authorization: { decision: "deny", reason: "benefit exhausted" },
      opportunity: { score: 50 },
      recommendation: { confidence: 0.5 },
    });
    expect(denied.allowed).toBe(false);

    const criticalRisk = engine.evaluate({
      authorization: { decision: "allow", risk_tier: "critical" },
      opportunity: { score: 50 },
      recommendation: { confidence: 0.5 },
    });
    expect(criticalRisk.allowed).toBe(false);

    const allowed = engine.evaluate({
      authorization: { decision: "allow", risk_tier: "low" },
      opportunity: { score: 60 },
      recommendation: { confidence: 0.5 },
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.confidence).toBeGreaterThan(0);
  });

  test("getReplay() records every real evaluate() call", () => {
    const engine = new DecisionEngine("org-1", "decision");
    engine.evaluate({ authorization: { decision: "allow", risk_tier: "low" } });
    engine.evaluate({ authorization: { decision: "deny" } });

    const replay = engine.getReplay();
    expect(replay.length).toBe(2);
    expect(replay[0].name).toBe("decision");
  });
});
