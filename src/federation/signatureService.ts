// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "./federationClient";

export const recordFederationSignature = async (params: {
  cluster_id: string;
  region_id?: string;
  subject_type: string;
  subject_id: string;
  signature: string;
}) => {
  const { error } = await supabaseFederation
    .from("federation_signature")
    .insert({
      cluster_id: params.cluster_id,
      region_id: params.region_id ?? null,
      subject_type: params.subject_type,
      subject_id: params.subject_id,
      signature: params.signature,
    });

  if (error) throw new Error(`Failed to record federation signature: ${error.message}`);
};

export const getFederationSignaturesForSubject = async (subject_type: string, subject_id: string) => {
  const { data, error } = await supabaseFederation
    .from("federation_signature")
    .select("*")
    .eq("subject_type", subject_type)
    .eq("subject_id", subject_id);

  if (error) throw new Error(`Failed to load federation signatures: ${error.message}`);
  return data ?? [];
};
