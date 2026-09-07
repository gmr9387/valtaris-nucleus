// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "./federationClient";

export type RegionHealthStatus = "healthy" | "degraded" | "offline";

export const evaluateRegionHealth = async (region_id: string): Promise<RegionHealthStatus> => {
  // Get latest heartbeat
  const { data: heartbeat, error } = await supabaseFederation
    .from("region_heartbeat")
    .select("*")
    .eq("region_id", region_id)
    .order("emitted_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw new Error(`Failed to evaluate region health: ${error.message}`);
  }

  if (!heartbeat) {
    return "offline";
  }

  const now = Date.now();
  const emitted = new Date(heartbeat.emitted_at).getTime();
  const diffMs = now - emitted;

  // Heartbeat older than 60 seconds = offline
  if (diffMs > 60000) {
    return "offline";
  }

  // Heartbeat status determines degraded vs healthy
  if (heartbeat.status === "degraded") {
    return "degraded";
  }

  return "healthy";
};

export const evaluateAllRegions = async () => {
  const { data: regions, error } = await supabaseFederation
    .from("region_registry")
    .select("id");

  if (error) {
    throw new Error(`Failed to load regions: ${error.message}`);
  }

  const results: Record<string, RegionHealthStatus> = {};

  for (const region of regions ?? []) {
    results[region.id] = await evaluateRegionHealth(region.id);
  }

  return results;
};
