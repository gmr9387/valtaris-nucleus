// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "./federationClient";

export type FederationValidationResult =
  | { valid: true; reason: string }
  | { valid: false; reason: string };

export const validateFederationSignature = async (params: {
  subject_type: string;
  subject_id: string;
  signature: string;
  cluster_id: string;
}) => {
  const { data, error } = await supabaseFederation
    .from("federation_signature")
    .select("*")
    .eq("subject_type", params.subject_type)
    .eq("subject_id", params.subject_id)
    .eq("cluster_id", params.cluster_id);

  if (error) {
    throw new Error(`Failed to validate federation signature: ${error.message}`);
  }

  const signatures = data ?? [];

  if (signatures.length === 0) {
    return {
      valid: false,
      reason: "No federation signature found for subject",
    } as FederationValidationResult;
  }

  const match = signatures.find((sig) => sig.signature === params.signature);

  if (!match) {
    return {
      valid: false,
      reason: "Signature mismatch",
    } as FederationValidationResult;
  }

  return {
    valid: true,
    reason: "Federation signature validated",
  } as FederationValidationResult;
};

export const validateRegionSignature = async (region_id: string, signature: string) => {
  const { data, error } = await supabaseFederation
    .from("federation_signature")
    .select("*")
    .eq("subject_type", "region")
    .eq("subject_id", region_id);

  if (error) {
    throw new Error(`Failed to validate region signature: ${error.message}`);
  }

  const signatures = data ?? [];

  if (signatures.length === 0) {
    return {
      valid: false,
      reason: "No region signature found",
    } as FederationValidationResult;
  }

  const match = signatures.find((sig) => sig.signature === signature);

  if (!match) {
    return {
      valid: false,
      reason: "Region signature mismatch",
    } as FederationValidationResult;
  }

  return {
    valid: true,
    reason: "Region signature validated",
  } as FederationValidationResult;
};

export const validateClusterSignature = async (cluster_id: string, signature: string) => {
  const { data, error } = await supabaseFederation
    .from("federation_signature")
    .select("*")
    .eq("subject_type", "cluster")
    .eq("subject_id", cluster_id);

  if (error) {
    throw new Error(`Failed to validate cluster signature: ${error.message}`);
  }

  const signatures = data ?? [];

  if (signatures.length === 0) {
    return {
      valid: false,
      reason: "No cluster signature found",
    } as FederationValidationResult;
  }

  const match = signatures.find((sig) => sig.signature === signature);

  if (!match) {
    return {
      valid: false,
      reason: "Cluster signature mismatch",
    } as FederationValidationResult;
  }

  return {
    valid: true,
    reason: "Cluster signature validated",
  } as FederationValidationResult;
};
