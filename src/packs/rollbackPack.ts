// Strict. Aligned. No drift. No overengineering.

import { createClient } from "@supabase/supabase-js";
import { loadPackById } from "./loadPack";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const rollbackPack = async (packId: string, targetVersion: string) => {
  // Validate version exists in history
  const { data: history, error: histErr } = await supabase
    .from("pack_registry_versions")
    .select("*")
    .eq("pack_id", packId)
    .eq("version", targetVersion)
    .single();

  if (histErr || !history) {
    throw new Error("Target version not found in history");
  }

  // Roll back
  const { error } = await supabase
    .from("pack_registry")
    .update({ version: targetVersion })
    .eq("id", packId);

  if (error) throw new Error(`Rollback failed: ${error.message}`);

  // Reload pack
  await loadPackById(packId);

  return { rolledBackTo: targetVersion };
};
