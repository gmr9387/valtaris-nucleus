/**
 * Client for the manage-api-clients Edge Function (supabase/functions/
 * manage-api-clients/) -- the only sanctioned way this app touches
 * api_clients, which deliberately has no RLS policies (see that
 * migration's header) and so can't be queried via the normal
 * supabase.from(...) pattern every other src/lib/*.ts file here uses.
 *
 * Before this existed, provisioning a new external caller (DualPay,
 * valtaris-glue, ...) required hand-running SQL. This lets an operator
 * do it through the admin UI instead.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ApiClient } from "@/types/api-clients";

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-api-clients", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error as string);
  return data as T;
}

export async function listApiClients(): Promise<ApiClient[]> {
  try {
    const { clients } = await invoke<{ clients: ApiClient[] }>({ action: "list" });
    return clients;
  } catch (err) {
    console.error("[api-clients] listApiClients failed", (err as Error).message);
    return [];
  }
}

export interface NewApiClient {
  client_id: string;
  label: string;
}

/**
 * Throws on failure so the calling form can surface the error.
 * Returns the plaintext key alongside the created row -- the ONLY
 * time it ever exists outside the account it authenticates. The
 * caller must display and let the operator copy it immediately;
 * nothing can retrieve it again afterward.
 */
export async function createApiClient(
  input: NewApiClient,
): Promise<{ client: ApiClient; rawKey: string }> {
  const { client, raw_key } = await invoke<{ client: ApiClient; raw_key: string }>({
    action: "create",
    client_id: input.client_id,
    label: input.label,
  });
  return { client, rawKey: raw_key };
}

/**
 * Throws on failure. Same one-time-reveal contract as createApiClient
 * -- the old key stops working the moment this succeeds (key_hash is
 * overwritten, not appended), so rotating invalidates immediately.
 */
export async function rotateApiClientKey(clientId: string): Promise<string> {
  const { raw_key } = await invoke<{ raw_key: string }>({ action: "rotate", client_id: clientId });
  return raw_key;
}

/** Throws on failure so the calling form can surface the error. */
export async function setApiClientEnabled(clientId: string, enabled: boolean): Promise<void> {
  await invoke({ action: "set_enabled", client_id: clientId, enabled });
}
