/**
 * Real, Supabase-backed Guardian kill switch -- a single global row
 * (see supabase/migrations/20260915c_guardian_kill_switch.sql).
 * guardianRuntime.ts checks this before any adjudication work.
 */
import { supabase } from "@/integrations/supabase/client";

export interface KillSwitchState {
  active: boolean;
  reason: string | null;
  activated_by: string | null;
  updated_at: string;
}

/** Throws on failure -- callers decide the fail-safe behavior (Guardian fails closed). */
export async function fetchKillSwitch(): Promise<KillSwitchState> {
  const { data, error } = await supabase
    .from("guardian_kill_switch")
    .select("active, reason, activated_by, updated_at")
    .eq("id", "global")
    .single();
  if (error) throw error;
  return data as unknown as KillSwitchState;
}

/** Throws on failure so the calling form can surface the error. */
export async function setKillSwitch(
  active: boolean,
  reason: string | null,
  activatedBy: string | null,
): Promise<KillSwitchState> {
  const { data, error } = await supabase
    .from("guardian_kill_switch")
    .update({
      active,
      reason,
      activated_by: activatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "global")
    .select("active, reason, activated_by, updated_at")
    .single();
  if (error) throw error;
  return data as unknown as KillSwitchState;
}
