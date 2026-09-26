// Parity test between the two hand-synced copies of Weaver's rule
// interpreter: src/engine/weaver-rule-evaluator.ts (nucleus's internal
// engine) and supabase/functions/weaver-score/ruleEvaluator.ts (the
// external Edge Function -- can't import the Vite-built src/ tree, so
// it's a maintained-by-hand copy; see that file's own header comment).
// Nothing enforced these two stay behaviorally identical -- this test
// exercises all 12 operators against both implementations and fails
// the moment a future edit to one isn't mirrored to the other.
import { describe, it, expect } from "vitest";
import { evaluateRules as evaluateRulesInternal } from "@/engine/weaver-rule-evaluator";
import { evaluateRules as evaluateRulesEdge } from "../../../supabase/functions/weaver-score/ruleEvaluator.ts";
import type { WeaverRule } from "@/types/weaver-rules";

function rule(overrides: Partial<WeaverRule>): WeaverRule {
  return {
    rule_id: "r1",
    organization_id: null,
    stage: "opportunity",
    name: "test rule",
    field_path: "claimPayload.amount",
    operator: "gt",
    value: null,
    weight: 10,
    enabled: true,
    created_at: new Date().toISOString(),
    ...overrides,
  } as WeaverRule;
}

const facts = {
  claimId: "c1",
  organizationId: "org-1",
  claimPayload: {
    amount: 500,
    procedure_code: "99213",
    diagnosis_codes: ["A00", "B01"],
    payer: "Acme Payer",
  },
};

describe("weaver rule evaluator parity (internal vs. Edge Function copy)", () => {
  const cases: Array<{ name: string; rule: Partial<WeaverRule> }> = [
    { name: "exists (true)", rule: { operator: "exists", field_path: "claimPayload.amount" } },
    { name: "exists (false)", rule: { operator: "exists", field_path: "claimPayload.missing" } },
    {
      name: "not_exists (true)",
      rule: { operator: "not_exists", field_path: "claimPayload.missing" },
    },
    {
      name: "not_exists (false)",
      rule: { operator: "not_exists", field_path: "claimPayload.amount" },
    },
    {
      name: "eq (true)",
      rule: { operator: "eq", field_path: "claimPayload.procedure_code", value: "99213" },
    },
    {
      name: "eq (false)",
      rule: { operator: "eq", field_path: "claimPayload.procedure_code", value: "00000" },
    },
    {
      name: "ne (true)",
      rule: { operator: "ne", field_path: "claimPayload.procedure_code", value: "00000" },
    },
    {
      name: "ne (false)",
      rule: { operator: "ne", field_path: "claimPayload.procedure_code", value: "99213" },
    },
    { name: "gt (true)", rule: { operator: "gt", field_path: "claimPayload.amount", value: 100 } },
    {
      name: "gt (false)",
      rule: { operator: "gt", field_path: "claimPayload.amount", value: 1000 },
    },
    {
      name: "gte (true, equal)",
      rule: { operator: "gte", field_path: "claimPayload.amount", value: 500 },
    },
    { name: "lt (true)", rule: { operator: "lt", field_path: "claimPayload.amount", value: 1000 } },
    {
      name: "lte (true, equal)",
      rule: { operator: "lte", field_path: "claimPayload.amount", value: 500 },
    },
    {
      name: "nonempty_string (true)",
      rule: { operator: "nonempty_string", field_path: "claimPayload.payer" },
    },
    {
      name: "nonempty_string (false, missing)",
      rule: { operator: "nonempty_string", field_path: "claimPayload.missing" },
    },
    {
      name: "nonempty_array (true)",
      rule: { operator: "nonempty_array", field_path: "claimPayload.diagnosis_codes" },
    },
    {
      name: "nonempty_array (false, not array)",
      rule: { operator: "nonempty_array", field_path: "claimPayload.amount" },
    },
    {
      name: "contains (true)",
      rule: { operator: "contains", field_path: "claimPayload.diagnosis_codes", value: "A00" },
    },
    {
      name: "contains (false)",
      rule: { operator: "contains", field_path: "claimPayload.diagnosis_codes", value: "Z99" },
    },
    {
      name: "in (true)",
      rule: {
        operator: "in",
        field_path: "claimPayload.procedure_code",
        value: ["99213", "99214"],
      },
    },
    {
      name: "in (false)",
      rule: { operator: "in", field_path: "claimPayload.procedure_code", value: ["11111"] },
    },
    {
      name: "unknown operator falls through to false",
      rule: { operator: "not_a_real_operator" as WeaverRule["operator"] },
    },
    {
      name: "disabled rule never fires",
      rule: { operator: "exists", field_path: "claimPayload.amount", enabled: false },
    },
  ];

  for (const { name, rule: ruleOverrides } of cases) {
    it(`${name} -- identical result from both copies`, () => {
      const rules = [rule(ruleOverrides)];
      const internal = evaluateRulesInternal(rules, facts);
      const edge = evaluateRulesEdge(rules as never, facts);
      expect(edge).toEqual(internal);
    });
  }

  it("accumulates weight across multiple fired rules identically", () => {
    const rules = [
      rule({
        rule_id: "r1",
        operator: "gt",
        field_path: "claimPayload.amount",
        value: 100,
        weight: 15,
      }),
      rule({
        rule_id: "r2",
        operator: "eq",
        field_path: "claimPayload.procedure_code",
        value: "99213",
        weight: 20,
      }),
      rule({
        rule_id: "r3",
        operator: "eq",
        field_path: "claimPayload.procedure_code",
        value: "never-matches",
        weight: 999,
      }),
    ];
    const internal = evaluateRulesInternal(rules, facts);
    const edge = evaluateRulesEdge(rules as never, facts);
    expect(edge).toEqual(internal);
    expect(internal.totalWeight).toBe(35);
    expect(internal.firedRules).toEqual(["test rule", "test rule"]);
  });
});
