// src/integrations/supabase/supabaseClient.ts
//
// Unified Supabase client binding for Nucleus.
//
// FIXED: previously constructed the client eagerly at module import
// time (`export const supabase = createClient(...)`). Once
// guardianRuntime.ts started depending on this (via
// accumulatorRepository.ts) for real accumulator lookups, and
// registerSubsystems.ts imports Guardian during boot, this meant the
// ENTIRE app -- including boot, before any claim is ever processed --
// would crash with "supabaseUrl is required" if Supabase env vars
// weren't set. Now lazy: the client is only constructed the first time
// something actually calls a Supabase method, so boot no longer
// depends on Supabase being configured.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase is not configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. " +
          "This error only occurs when something actually tries to query Supabase " +
          "(e.g. fetching member accumulators) -- boot itself no longer requires these.",
      );
    }
    client = createClient(url, key);
  }
  return client;
}

// Proxy so existing call sites (`supabase.from(...)`, etc.) keep working
// unchanged -- only the timing of actual client construction changed.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});
