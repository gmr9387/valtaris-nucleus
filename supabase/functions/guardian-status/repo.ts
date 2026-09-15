// Deno-native data access for this Edge Function -- same pattern as
// adjudicate-claim/repo.ts and weaver-score/repo.ts's headers explain:
// same tables, same project, just a runtime-appropriate client
// construction.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export interface KillSwitchState {
  active: boolean;
  reason: string | null;
  activated_by: string | null;
  updated_at: string;
}

/** Mirrors src/lib/guardian-kill-switch.ts's fetchKillSwitch(). */
export async function fetchKillSwitch(): Promise<KillSwitchState> {
  const { data, error } = await supabase
    .from("guardian_kill_switch")
    .select("active, reason, activated_by, updated_at")
    .eq("id", "global")
    .single();
  if (error) throw new Error(`Failed to fetch kill switch: ${error.message}`);
  return data as unknown as KillSwitchState;
}

/**
 * Real API-key auth: identical to adjudicate-claim/repo.ts's and
 * weaver-score/repo.ts's verifyApiKey -- same api_clients table gates
 * every nucleus external API.
 */
export async function verifyApiKey(rawKey: string | null): Promise<string | null> {
  if (!rawKey) return null;

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawKey));
  const hashHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data, error } = await supabase
    .from("api_clients")
    .select("client_id, enabled")
    .eq("key_hash", hashHex)
    .maybeSingle();
  if (error || !data || !data.enabled) return null;
  return data.client_id as string;
}
