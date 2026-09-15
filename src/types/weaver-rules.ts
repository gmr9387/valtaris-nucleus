// Row shape for the weaver_rules table.
// @/engine/weaver-rule-evaluator.ts consumes these to score the
// "opportunity" and "recommendation" stages of a claim run.

export type WeaverRuleStage = "opportunity" | "recommendation";

export type WeaverRuleOperator =
  | "exists"
  | "not_exists"
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "nonempty_string"
  | "nonempty_array"
  | "contains"
  | "in";

export interface WeaverRule {
  rule_id: string;
  organization_id: string | null;
  stage: WeaverRuleStage;
  name: string;
  field_path: string;
  operator: WeaverRuleOperator;
  value: unknown;
  weight: number;
  enabled: boolean;
  created_at: string;
}
