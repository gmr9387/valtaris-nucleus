/**
 * Real, Supabase-backed Weaver rule storage -- mirrors @/lib/contracts.ts
 * and @/lib/plan-benefits.ts exactly. @/engine/weaver-rule-evaluator.ts
 * consumes these to score a claim's opportunity/recommendation stages.
 */
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { WeaverRule, WeaverRuleStage } from "@/types/weaver-rules";

/**
 * FIXED: this previously always used the anon-key browser client and
 * never threaded an organizationId through, relying on weaver_rules'
 * org-scoped SELECT policy (auth.uid() + organization_members match)
 * for tenant isolation. But this function's only real caller,
 * weaverRuntime.ts, runs inside nucleus's server-side Express process
 * (apiController.ts) -- there's no Supabase Auth session there, so
 * auth.uid() is always null and the org-scoped branch of that policy
 * never matches. In practice, only the two global (organization_id IS
 * NULL) seed rules ever fired for real internal claim processing --
 * any org-specific rule an operator created via the admin UI was
 * silently ignored.
 *
 * Fixed the same way supabase/functions/weaver-score/repo.ts's
 * listWeaverRules already does it for the external API surface: use
 * the service-role client (this is trusted server-side code, same
 * class of caller as NucleusDBBridge) and filter explicitly by
 * organizationId instead of depending on RLS to do it via a session
 * that doesn't exist here.
 */
export async function listWeaverRules(
  stage: WeaverRuleStage,
  organizationId?: string | null,
): Promise<WeaverRule[]> {
  let query = supabaseAdmin.from("weaver_rules").select("*").eq("stage", stage).eq("enabled", true);
  query = organizationId
    ? query.or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    : query.is("organization_id", null);
  const { data, error } = await query;
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
