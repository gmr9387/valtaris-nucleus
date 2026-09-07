// Strict. Aligned. No drift. No overengineering.

import fs from "fs";
import path from "path";
import { ExtensionManifest, validateExtensionManifest } from "./extensionManifest";

export const loadExtensionManifest = (extensionPath: string): ExtensionManifest => {
  const manifestPath = path.join(extensionPath, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Extension manifest not found at ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);

  validateExtensionManifest(manifest);

  return manifest;
};

export const loadAllExtensions = (extensionsRoot: string): ExtensionManifest[] => {
  const dirs = fs.readdirSync(extensionsRoot, { withFileTypes: true });

  const extensions: ExtensionManifest[] = [];

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const extensionPath = path.join(extensionsRoot, dir.name);

    try {
      const manifest = loadExtensionManifest(extensionPath);
      extensions.push(manifest);
    } catch (err) {
      console.error(`Failed to load extension ${dir.name}:`, err);
    }
  }

  return extensions;
};
