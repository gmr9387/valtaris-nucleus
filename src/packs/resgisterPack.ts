// Strict. Aligned. No drift. No overengineering.

import { PackManifest, validatePackManifest } from "./manifestSchema";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export const registerPack = async (manifest: unknown) => {
  if (!validatePackManifest(manifest)) {
    throw new Error("Invalid pack manifest");
  }

  const m = manifest as PackManifest;

  const { data, error } = await supabase
    .from("pack_registry")
    .insert({
      name: m.name,
      version: m.version,
      description: m.description,
      capabilities: m.capabilities,
      entrypoint: m.entrypoint,
      publisher: m.publisher,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register pack: ${error.message}`);
  }

  return data;
};
