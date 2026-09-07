// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "./federationClient";

export type ClusterTopology = {
  id: string;
  cluster_name: string;
  cluster_code: string;
  trust_anchor_id: string;
  federation_public_key: string;
  regions: {
    id: string;
    region_name: string;
    region_code: string;
    cluster_url: string;
    status: "active" | "inactive" | "degraded";
  }[];
};

export const loadClusterTopology = async (): Promise<ClusterTopology[]> => {
  const { data: clusters, error: clusterErr } = await supabaseFederation
    .from("cluster_registry")
    .select("*");

  if (clusterErr) {
    throw new Error(`Failed to load clusters: ${clusterErr.message}`);
  }

  const { data: regions, error: regionErr } = await supabaseFederation
    .from("region_registry")
    .select("*");

  if (regionErr) {
    throw new Error(`Failed to load regions: ${regionErr.message}`);
  }

  const regionsByCluster: Record<string, ClusterTopology["regions"]> = {};

  for (const region of regions ?? []) {
    if (!regionsByCluster[region.cluster_id]) {
      regionsByCluster[region.cluster_id] = [];
    }

    regionsByCluster[region.cluster_id].push({
      id: region.id,
      region_name: region.region_name,
      region_code: region.region_code,
      cluster_url: region.cluster_url,
      status: region.status,
    });
  }

  const topology: ClusterTopology[] = [];

  for (const cluster of clusters ?? []) {
    topology.push({
      id: cluster.id,
      cluster_name: cluster.cluster_name,
      cluster_code: cluster.cluster_code,
      trust_anchor_id: cluster.trust_anchor_id,
      federation_public_key: cluster.federation_public_key,
      regions: regionsByCluster[cluster.id] ?? [],
    });
  }

  return topology;
};
