// Strict. Aligned. No drift. No overengineering.

import { ExtensionManifest, validateExtensionManifest } from "./extensionManifestSchema";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export const registerExtension = async (packId: string, manifest: unknown) => {
  if (!validateExtensionManifest(manifest)) {
    throw new Error("Invalid extension manifest");
  }

  const m = manifest as ExtensionManifest;

  // Validate parent pack exists
  const { data: packCheck, error: packError } = await supabase
    .from("pack_registry")
    .select("id")
    .eq("id", packId)
    .single();

  if (packError || !packCheck) {
    throw new Error("Parent pack does not exist");
  }

  const { data, error } = await supabase
    .from("extension_registry")
    .insert({
      pack_id: packId,
      name: m.name,
      version: m.version,
      description: m.description,
      hooks: m.hooks,
      entrypoint: m.entrypoint,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register extension: ${error.message}`);
  }

  return data;
};
