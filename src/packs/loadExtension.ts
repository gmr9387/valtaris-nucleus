// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export type LoadedExtension = {
  id: string;
  pack_id: string;
  name: string;
  version: string;
  hooks: string[];
  entrypoint: string;
};

export const loadExtensionById = async (extensionId: string): Promise<LoadedExtension> => {
  const { data, error } = await supabase
    .from("extension_registry")
    .select("id, pack_id, name, version, hooks, entrypoint")
    .eq("id", extensionId)
    .single();

  if (error) {
    throw new Error(`Failed to load extension: ${error.message}`);
  }

  return {
    id: data.id,
    pack_id: data.pack_id,
    name: data.name,
    version: data.version,
    hooks: data.hooks,
    entrypoint: data.entrypoint,
  };
};
