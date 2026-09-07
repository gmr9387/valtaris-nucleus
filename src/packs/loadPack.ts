// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export type LoadedPack = {
  id: string;
  name: string;
  version: string;
  capabilities: string[];
  entrypoint: string;
};

export const loadPackById = async (packId: string): Promise<LoadedPack> => {
  const { data, error } = await supabase
    .from("pack_registry")
    .select("id, name, version, capabilities, entrypoint")
    .eq("id", packId)
    .single();

  if (error) {
    throw new Error(`Failed to load pack: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    version: data.version,
    capabilities: data.capabilities,
    entrypoint: data.entrypoint,
  };
};
