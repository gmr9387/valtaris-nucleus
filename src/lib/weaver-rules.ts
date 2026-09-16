/**
 * Real, Supabase-backed Weaver rule storage -- mirrors @/lib/contracts.ts
 * and @/lib/plan-benefits.ts exactly. @/engine/weaver-rule-evaluator.ts
 * consumes these to score a claim's opportunity/recommendation stages.
 */
import { supabase } from "@/integrations/supabase/client";
import type { WeaverRule, WeaverRuleStage } from "@/types/weaver-rules";

export async function listWeaverRules(stage: WeaverRuleStage): Promise<WeaverRule[]> {
  const { data, error } = await supabase
    .from("weaver_rules")
    .select("*")
    .eq("stage", stage)
    .eq("enabled", true);
  if (error) {
    console.error("[weaver-rules] listWeaverRules failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as WeaverRule[];
}

export async function listAllWeaverRules(): Promise<WeaverRule[]> {
  const { data, error } = await supabase
    .from("weaver_rules")
    .select("*")
    .order("stage", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[weaver-rules] listAllWeaverRules failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as WeaverRule[];
}

export interface NewWeaverRule {
  organization_id?: string | null;
  stage: WeaverRuleStage;
  name: string;
  field_path: string;
  operator: WeaverRule["operator"];
  value?: unknown;
  weight: number;
}

/** Throws on failure so the calling form can surface the error. */
export async function createWeaverRule(input: NewWeaverRule): Promise<WeaverRule> {
  const { data, error } = await supabase
    .from("weaver_rules")
    .insert({
      organization_id: input.organization_id ?? null,
      stage: input.stage,
      name: input.name,
      field_path: input.field_path,
      operator: input.operator,
      value: input.value ?? null,
      weight: input.weight,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as WeaverRule;
}

/** Throws on failure so the calling form can surface the error. */
export async function setWeaverRuleEnabled(ruleId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("weaver_rules").update({ enabled }).eq("rule_id", ruleId);
  if (error) throw error;
}

/** Throws on failure so the calling form can surface the error. */
export async function deleteWeaverRule(ruleId: string): Promise<void> {
  const { error } = await supabase.from("weaver_rules").delete().eq("rule_id", ruleId);
  if (error) throw error;
}
