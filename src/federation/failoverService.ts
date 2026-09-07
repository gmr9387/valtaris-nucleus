// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "./federationClient";
import { evaluateRegionHealth, RegionHealthStatus } from "./regionHealthService";

export type FailoverDecision =
  | { type: "no-action"; reason: string }
  | { type: "failover"; from_region_id: string; to_region_id: string; reason: string };

const FAILOVER_ELIGIBLE_STATUS: RegionHealthStatus[] = ["offline", "degraded"];

export const decideFailoverForRegion = async (
  region_id: string
): Promise<FailoverDecision> => {
  const health = await evaluateRegionHealth(region_id);

  if (!FAILOVER_ELIGIBLE_STATUS.includes(health)) {
    return { type: "no-action", reason: `Region healthy (${health})` };
  }

  // Find candidate regions in same cluster
  const { data: region, error: regionErr } = await supabaseFederation
    .from("region_registry")
    .select("*")
    .eq("id", region_id)
    .single();

  if (regionErr || !region) {
    throw new Error("Region not found for failover decision");
  }

  const { data: candidates, error: candErr } = await supabaseFederation
    .from("region_registry")
    .select("*")
    .eq("cluster_id", region.cluster_id)
    .eq("status", "active");

  if (candErr) {
    throw new Error(`Failed to load candidate regions: ${candErr.message}`);
  }

  const activeCandidates = (candidates ?? []).filter(
    (r) => r.id !== region_id
  );

  if (activeCandidates.length === 0) {
    return {
      type: "no-action",
      reason: "No active candidate regions available for failover",
    };
  }

  // Simple deterministic choice: first active candidate
  const target = activeCandidates[0];

  return {
    type: "failover",
    from_region_id: region_id,
    to_region_id: target.id,
    reason: `Region ${health}, failing over to active region ${target.id}`,
  };
};

export const decideFailoverForCluster = async (cluster_id: string) => {
  const { data: regions, error } = await supabaseFederation
    .from("region_registry")
    .select("id")
    .eq("cluster_id", cluster_id);

  if (error) {
    throw new Error(`Failed to load regions for cluster: ${error.message}`);
  }

  const decisions: FailoverDecision[] = [];

  for (const region of regions ?? []) {
    decisions.push(await decideFailoverForRegion(region.id));
  }

  return decisions;
};
