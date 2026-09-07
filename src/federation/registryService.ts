// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "./federationClient";

export type Cluster = {
  id: string;
  cluster_name: string;
  cluster_code: string;
  trust_anchor_id: string;
  federation_public_key: string;
};

export type Region = {
  id: string;
  region_name: string;
  region_code: string;
  cluster_id: string;
  cluster_url: string;
  status: "active" | "inactive" | "degraded";
};

export const getClusters = async (): Promise<Cluster[]> => {
  const { data, error } = await supabaseFederation
    .from("cluster_registry")
    .select("*");

  if (error) throw new Error(`Failed to load clusters: ${error.message}`);
  return (data ?? []) as Cluster[];
};

export const getRegions = async (): Promise<Region[]> => {
  const { data, error } = await supabaseFederation
    .from("region_registry")
    .select("*");

  if (error) throw new Error(`Failed to load regions: ${error.message}`);
  return (data ?? []) as Region[];
};

export const getActiveRegions = async (): Promise<Region[]> => {
  const { data, error } = await supabaseFederation
    .from("region_registry")
    .select("*")
    .eq("status", "active");

  if (error) throw new Error(`Failed to load active regions: ${error.message}`);
  return (data ?? []) as Region[];
};
