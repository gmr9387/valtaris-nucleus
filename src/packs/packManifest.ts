// Strict. Aligned. No drift. No overengineering.

export type PackManifest = {
  pack_id: string;
  pack_name: string;
  pack_version: string;
  pack_description: string;
  capabilities: string[];
  workflows: string[];
  extensions: string[];
};

export const validatePackManifest = (manifest: PackManifest) => {
  if (!manifest.pack_id) throw new Error("pack_id missing");
  if (!manifest.pack_name) throw new Error("pack_name missing");
  if (!manifest.pack_version) throw new Error("pack_version missing");

  if (!Array.isArray(manifest.capabilities)) {
    throw new Error("capabilities must be array");
  }

  if (!Array.isArray(manifest.workflows)) {
    throw new Error("workflows must be array");
  }

  if (!Array.isArray(manifest.extensions)) {
    throw new Error("extensions must be array");
  }

  return true;
};
