// Strict. Aligned. No drift. No overengineering.

export type ExtensionManifest = {
  extension_id: string;
  extension_name: string;
  extension_version: string;
  extension_description: string;
  triggers: string[];
  inputs: Record<string, string>;
};

export const validateExtensionManifest = (manifest: ExtensionManifest) => {
  if (!manifest.extension_id) throw new Error("extension_id missing");
  if (!manifest.extension_name) throw new Error("extension_name missing");
  if (!manifest.extension_version) throw new Error("extension_version missing");

  if (!Array.isArray(manifest.triggers)) {
    throw new Error("triggers must be array");
  }

  if (typeof manifest.inputs !== "object") {
    throw new Error("inputs must be an object");
  }

  return true;
};
