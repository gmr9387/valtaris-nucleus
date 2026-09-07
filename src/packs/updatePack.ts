// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";
import { loadPackById } from "./loadPack";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const updatePack = async (packId: string, newVersion: string) => {
  // Fetch current pack
  const { data: current, error: currentErr } = await supabase
    .from("pack_registry")
    .select("*")
    .eq("id", packId)
    .single();

  if (currentErr || !current) {
    throw new Error("Pack not found");
  }

  // Store previous version in version history
  await supabase.from("pack_registry_versions").insert({
    pack_id: packId,
    version: current.version,
    changelog: `Auto-saved before update to ${newVersion}`,
  });

  // Update pack version
  const { data, error } = await supabase
    .from("pack_registry")
    .update({ version: newVersion })
    .eq("id", packId)
    .select()
    .single();

  if (error) throw new Error(`Update failed: ${error.message}`);

  // Reload pack
  await loadPackById(packId);

  return data;
};
