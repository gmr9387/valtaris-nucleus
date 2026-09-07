// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "../federation/federationClient";
import { PackManifest } from "./packManifest";

export const registerPack = async (manifest: PackManifest) => {
  const { error } = await supabaseFederation
    .from("pack_registry")
    .insert({
      pack_id: manifest.pack_id,
      pack_name: manifest.pack_name,
      pack_version: manifest.pack_version,
      pack_description: manifest.pack_description,
      installed: false,
    });

  if (error) {
    throw new Error(`Failed to register pack: ${error.message}`);
  }
};

export const updatePackVersion = async (
  pack_id: string,
  newVersion: string,
  changelog: string
) => {
  const { error: versionErr } = await supabaseFederation
    .from("pack_versions")
    .insert({
      pack_id,
      version: newVersion,
      changelog,
    });

  if (versionErr) {
    throw new Error(`Failed to record pack version: ${versionErr.message}`);
  }

  const { error: registryErr } = await supabaseFederation
    .from("pack_registry")
    .update({
      pack_version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("pack_id", pack_id);

  if (registryErr) {
    throw new Error(`Failed to update pack registry: ${registryErr.message}`);
  }
};

export const listRegisteredPacks = async () => {
  const { data, error } = await supabaseFederation
    .from("pack_registry")
    .select("*");

  if (error) {
    throw new Error(`Failed to list packs: ${error.message}`);
  }

  return data ?? [];
};

export const getPackById = async (pack_id: string) => {
  const { data, error } = await supabaseFederation
    .from("pack_registry")
    .select("*")
    .eq("pack_id", pack_id)
    .single();

  if (error) {
    throw new Error(`Failed to load pack: ${error.message}`);
  }

  return data;
};
