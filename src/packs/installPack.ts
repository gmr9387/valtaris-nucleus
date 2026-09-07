// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";
import { validatePackManifest, PackManifest } from "./manifestSchema";
import { loadPackById } from "./loadPack";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const installPack = async (manifest: unknown) => {
  if (!validatePackManifest(manifest)) {
    throw new Error("Invalid pack manifest");
  }

  const m = manifest as PackManifest;

  // Insert into registry
  const { data, error } = await supabase
    .from("pack_registry")
    .insert({
      name: m.name,
      version: m.version,
      description: m.description,
      capabilities: m.capabilities,
      entrypoint: m.entrypoint,
      publisher: m.publisher,
      version_pinned: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Install failed: ${error.message}`);

  // Load pack into Nucleus
  await loadPackById(data.id);

  return data;
};
