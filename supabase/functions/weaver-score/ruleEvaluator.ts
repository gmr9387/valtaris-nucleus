// Rule evaluation -- ported verbatim from valtaris-nucleus's
// src/engine/weaver-rule-evaluator.ts (same operators, same field-path
// semantics). Kept in sync by hand since Edge Functions can't import
// the Vite-built src/ tree; if you change one, change both.
import type { WeaverRule } from "./types.ts";

function getPath(facts: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
      facts,
    );
}

function evaluateCondition(rule: WeaverRule, facts: Record<string, unknown>): boolean {
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

export function evaluateRules(rules: WeaverRule[], facts: Record<string, unknown>): WeaverEvaluation {
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
