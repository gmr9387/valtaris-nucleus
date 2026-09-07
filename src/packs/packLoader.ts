// Strict. Aligned. No drift. No overengineering.

import fs from "fs";
import path from "path";
import { PackManifest, validatePackManifest } from "./packManifest";

export const loadPackManifest = (packPath: string): PackManifest => {
  const manifestPath = path.join(packPath, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Pack manifest not found at ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);

  validatePackManifest(manifest);

  return manifest;
};

export const loadAllPacks = (packsRoot: string): PackManifest[] => {
  const dirs = fs.readdirSync(packsRoot, { withFileTypes: true });

  const packs: PackManifest[] = [];

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const packPath = path.join(packsRoot, dir.name);

    try {
      const manifest = loadPackManifest(packPath);
      packs.push(manifest);
    } catch (err) {
      console.error(`Failed to load pack ${dir.name}:`, err);
    }
  }

  return packs;
};
