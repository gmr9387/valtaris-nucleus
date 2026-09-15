/**
 * Real rule evaluation for the Weaver arm -- turns a set of persisted
 * WeaverRule rows plus a claim's facts (claimId, claimPayload,
 * opportunity, etc.) into fired-rule names and a total weight.
 * @/nucleus/subsystems/weaver/weaverRuntime.ts adds this to an
 * intrinsic base score/confidence per stage.
 */
import type { Dynamic } from "@/nucleus/types/dynamic";
import type { WeaverRule } from "@/types/weaver-rules";

function getPath(facts: Dynamic, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === "object" ? (acc as Dynamic)[key] : undefined),
      facts,
    );
}

function evaluateCondition(rule: WeaverRule, facts: Dynamic): boolean {
  const actual = getPath(facts, rule.field_path);

  switch (rule.operator) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "not_exists":
      return actual === undefined || actual === null;
    case "eq":
      return actual === rule.value;
    case "ne":
      return actual !== rule.value;
    case "gt":
      return typeof actual === "number" && actual > Number(rule.value);
    case "gte":
      return typeof actual === "number" && actual >= Number(rule.value);
    case "lt":
      return typeof actual === "number" && actual < Number(rule.value);
    case "lte":
      return typeof actual === "number" && actual <= Number(rule.value);
    case "nonempty_string":
      return typeof actual === "string" && actual.trim() !== "";
    case "nonempty_array":
      return Array.isArray(actual) && actual.length > 0;
    case "contains":
      return Array.isArray(actual) && actual.includes(rule.value);
    case "in":
      return Array.isArray(rule.value) && (rule.value as unknown[]).includes(actual);
    default:
      return false;
  }
}

export interface WeaverEvaluation {
  firedRules: string[];
  totalWeight: number;
}

export function evaluateRules(rules: WeaverRule[], facts: Dynamic): WeaverEvaluation {
  const firedRules: string[] = [];
  let totalWeight = 0;

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (evaluateCondition(rule, facts)) {
      firedRules.push(rule.name);
      totalWeight += rule.weight;
    }
  }

  return { firedRules, totalWeight };
}
