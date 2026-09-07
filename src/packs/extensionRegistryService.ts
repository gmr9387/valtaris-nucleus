// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "../federation/federationClient";
import { ExtensionManifest } from "./extensionManifest";

export const registerExtension = async (manifest: ExtensionManifest) => {
  const { error } = await supabaseFederation
    .from("extension_registry")
    .insert({
      extension_id: manifest.extension_id,
      extension_name: manifest.extension_name,
      extension_version: manifest.extension_version,
      extension_description: manifest.extension_description,
      installed: false,
    });

  if (error) {
    throw new Error(`Failed to register extension: ${error.message}`);
  }
};

export const updateExtensionVersion = async (
  extension_id: string,
  newVersion: string,
  changelog: string
) => {
  const { error: versionErr } = await supabaseFederation
    .from("extension_versions")
    .insert({
      extension_id,
      version: newVersion,
      changelog,
    });

  if (versionErr) {
    throw new Error(`Failed to record extension version: ${versionErr.message}`);
  }

  const { error: registryErr } = await supabaseFederation
    .from("extension_registry")
    .update({
      extension_version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("extension_id", extension_id);

  if (registryErr) {
    throw new Error(`Failed to update extension registry: ${registryErr.message}`);
  }
};

export const listRegisteredExtensions = async () => {
  const { data, error } = await supabaseFederation
    .from("extension_registry")
    .select("*");

  if (error) {
    throw new Error(`Failed to list extensions: ${error.message}`);
  }

  return data ?? [];
};

export const getExtensionById = async (extension_id: string) => {
  const { data, error } = await supabaseFederation
    .from("extension_registry")
    .select("*")
    .eq("extension_id", extension_id)
    .single();

  if (error) {
    throw new Error(`Failed to load extension: ${error.message}`);
  }

  return data;
};
