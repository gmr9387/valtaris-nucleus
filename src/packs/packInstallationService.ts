// Strict. Aligned. No drift. No overengineering.

import { supabaseFederation } from "../federation/federationClient";
import { PackManifest } from "./packManifest";
import { loadPackManifest } from "./packLoader";
import path from "path";

export const installPack = async (packsRoot: string, packFolder: string) => {
  const packPath = path.join(packsRoot, packFolder);

  // 1. Load manifest
  const manifest: PackManifest = loadPackManifest(packPath);

  // 2. Check if pack already registered
  const { data: existing, error: existingErr } = await supabaseFederation
    .from("pack_registry")
    .select("*")
    .eq("pack_id", manifest.pack_id)
    .single();

  if (existingErr && existingErr.code !== "PGRST116") {
    throw new Error(`Failed to check pack registry: ${existingErr.message}`);
  }

  // 3. Register if not present
  if (!existing) {
    const { error: regErr } = await supabaseFederation
      .from("pack_registry")
      .insert({
        pack_id: manifest.pack_id,
        pack_name: manifest.pack_name,
        pack_version: manifest.pack_version,
        pack_description: manifest.pack_description,
        installed: true,
        installed_at: new Date().toISOString(),
      });

    if (regErr) {
      throw new Error(`Failed to register pack: ${regErr.message}`);
    }
  } else {
    // 4. Update existing pack entry
    const { error: updateErr } = await supabaseFederation
      .from("pack_registry")
      .update({
        pack_version: manifest.pack_version,
        installed: true,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("pack_id", manifest.pack_id);

    if (updateErr) {
      throw new Error(`Failed to update pack registry: ${updateErr.message}`);
    }
  }

  return {
    status: "installed",
    pack_id: manifest.pack_id,
    pack_name: manifest.pack_name,
    version: manifest.pack_version,
  };
};

export const uninstallPack = async (pack_id: string) => {
  const { error } = await supabaseFederation
    .from("pack_registry")
    .update({
      installed: false,
      installed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("pack_id", pack_id);

  if (error) {
    throw new Error(`Failed to uninstall pack: ${error.message}`);
  }

  return {
    status: "uninstalled",
    pack_id,
  };
};

export const listInstalledPacks = async () => {
  const { data, error } = await supabaseFederation
    .from("pack_registry")
    .select("*")
    .eq("installed", true);

  if (error) {
    throw new Error(`Failed to list installed packs: ${error.message}`);
  }

  return data ?? [];
};
