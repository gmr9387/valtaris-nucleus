// Phase 49 — Deployment Providers

import { startDashboard } from "../dashboard/startDashboard";
import { apiServer } from "../api/apiServer"; // your existing API server
import { GuardianRuntime } from "../subsystems/guardian/guardianRuntime";
import { supabase } from "@/integrations/supabase/supabaseClient";

export const deploymentProviders = {
  supabase: async () => {
    // The client is lazy by design (see supabaseClient.ts) so boot never
    // depends on Supabase being configured; deployment is the point where
    // we *do* want to fail fast if the env vars are missing.
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      throw new Error(
        "Supabase is not configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set.",
      );
    }
    await supabase.auth.getSession();
    return "supabase";
  },

  apiServer: async () => {
    await apiServer.start();
    return "apiServer";
  },

  osGuardian: async () => {
    // GuardianRuntime is stateless (accumulators are fetched fresh per
    // authorization call) -- nothing to warm up, just confirm it loads.
    void GuardianRuntime;
    return "osGuardian";
  },

  dashboard: async () => {
    await startDashboard();
    return "dashboard";
  },
};
