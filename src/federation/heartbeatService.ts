// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "./federationClient";

export const emitRegionHeartbeat = async (params: {
  region_id: string;
  cluster_id: string;
  status: "active" | "inactive" | "degraded";
  health_signature: string;
}) => {
  const { error } = await supabaseFederation
    .from("region_heartbeat")
    .insert({
      region_id: params.region_id,
      cluster_id: params.cluster_id,
      status: params.status,
      health_signature: params.health_signature,
    });

  if (error) throw new Error(`Failed to emit heartbeat: ${error.message}`);
};

export const getLatestHeartbeatForRegion = async (region_id: string) => {
  const { data, error } = await supabaseFederation
    .from("region_heartbeat")
    .select("*")
    .eq("region_id", region_id)
    .order("emitted_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw new Error(`Failed to load heartbeat: ${error.message}`);
  return data;
};
