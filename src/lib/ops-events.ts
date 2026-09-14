/**
 * Lightweight, append-only activity feed (ops_events table) — a running
 * log of what the claims pipeline has done (files received, validated,
 * normalized, claims promoted) independent of any single feature's own
 * tables, so an operations view can show one timeline across all of them.
 */
import { supabase } from "@/integrations/supabase/client";

export interface OpsEventInput {
  kind: string;
  summary: string;
  payload?: Record<string, unknown>;
}

export async function appendOpsEvent(input: OpsEventInput): Promise<void> {
  const { error } = await supabase.from("ops_events").insert([
    {
      kind: input.kind,
      summary: input.summary,
      payload: (input.payload ?? null) as never,
    },
  ]);
  if (error) console.error("[ops-events] append failed", error.message);
}
