// Row shape for the weaver_rules table -- ported verbatim from
// valtaris-nucleus's src/types/weaver-rules.ts. Same table, same
// project (bpqukcsaoporhvdtfyza); this copy exists only because Edge
// Functions run on Deno and can't import from the Vite-built src/ tree.
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
