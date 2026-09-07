// Strict. Aligned. No drift. No overengineering.

import { loadClusterTopology } from "./topologyService";
import { evaluateRegionHealth } from "./regionHealthService";
import { decideFailoverForRegion } from "./failoverService";
import { routeEvent, RoutingDecision } from "./globalRoutingService";
import { validateFederationSignature } from "./federationValidatorService";

export type FederationContext = {
  cluster_id: string;
  region_id: string;
};

export const getFederationTopology = async () => {
  return loadClusterTopology();
};

export const getRegionFederationStatus = async (region_id: string) => {
  const health = await evaluateRegionHealth(region_id);
  const failoverDecision = await decideFailoverForRegion(region_id);

  return {
    region_id,
    health,
    failoverDecision,
  };
};

export const routeFederatedEvent = async (params: {
  org_id: string;
  region_id: string;
  cluster_id: string;
  capability_scope: string;
  federation_signature: string;
}): Promise<RoutingDecision> => {
  return routeEvent(params);
};

export const validateFederatedCapability = async (params: {
  capability_scope: string;
  federation_signature: string;
  cluster_id: string;
}) => {
  return validateFederationSignature({
    subject_type: "capability",
    subject_id: params.capability_scope,
    signature: params.federation_signature,
    cluster_id: params.cluster_id,
  });
};
