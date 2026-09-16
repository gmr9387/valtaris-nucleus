/**
 * Client for the command-center-stats Edge Function
 * (supabase/functions/command-center-stats/) -- same pattern as
 * src/lib/api-clients.ts's invoke() helper, since the underlying
 * tables (api_clients, api_rate_limits, api_activity) all deliberately
 * have zero RLS policies and so can't be queried via supabase.from().
 */
import { supabase } from "@/integrations/supabase/client";
import type { CommandCenterStats } from "@/types/command-center";

export async function fetchCommandCenterStats(): Promise<CommandCenterStats> {
  const { data, error } = await supabase.functions.invoke("command-center-stats", { body: {} });
  if (error) throw error;
  if (data?.error) throw new Error(data.error as string);
  return data as CommandCenterStats;
}
