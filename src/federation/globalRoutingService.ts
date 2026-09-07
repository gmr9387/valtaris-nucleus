// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "./federationClient";
import { loadClusterTopology } from "./topologyService";
import { validateFederationSignature } from "./federationValidatorService";

export type RoutingDecision =
  | {
      type: "route";
      target_region_id: string;
      target_cluster_id: string;
      reason: string;
    }
  | {
      type: "reject";
      reason: string;
    };

export const routeEvent = async (params: {
  org_id: string;
  region_id: string;
  cluster_id: string;
  capability_scope: string;
  federation_signature: string;
}) => {
  // 1. Validate federation signature
  const signatureCheck = await validateFederationSignature({
    subject_type: "capability",
    subject_id: params.capability_scope,
    signature: params.federation_signature,
    cluster_id: params.cluster_id,
  });

  if (!signatureCheck.valid) {
    return {
      type: "reject",
      reason: `Invalid federation signature: ${signatureCheck.reason}`,
    } as RoutingDecision;
  }

  // 2. Load topology
  const topology = await loadClusterTopology();

  const cluster = topology.find((c) => c.id === params.cluster_id);
  if (!cluster) {
    return {
      type: "reject",
      reason: "Cluster not found in topology",
    } as RoutingDecision;
  }

  const region = cluster.regions.find((r) => r.id === params.region_id);
  if (!region) {
    return {
      type: "reject",
      reason: "Region not found in cluster topology",
    } as RoutingDecision;
  }

  // 3. Region status check
  if (region.status === "inactive") {
    return {
      type: "reject",
      reason: "Region inactive — cannot route event",
    } as RoutingDecision;
  }

  if (region.status === "degraded") {
    return {
      type: "reject",
      reason: "Region degraded — write operations blocked",
    } as RoutingDecision;
  }

  // 4. Deterministic routing rule:
  //    If capability_scope matches region_id → local execution
  if (params.capability_scope.startsWith(region.region_code)) {
    return {
      type: "route",
      target_region_id: region.id,
      target_cluster_id: cluster.id,
      reason: "Capability scope matches region — local routing",
    } as RoutingDecision;
  }

  // 5. Otherwise route to first active region in cluster
  const activeRegion = cluster.regions.find((r) => r.status === "active");

  if (!activeRegion) {
    return {
      type: "reject",
      reason: "No active regions available for routing",
    } as RoutingDecision;
  }

  return {
    type: "route",
    target_region_id: activeRegion.id,
    target_cluster_id: cluster.id,
    reason: "Capability scope does not match region — routed to active region",
  } as RoutingDecision;
};
