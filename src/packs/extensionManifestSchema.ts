// Strict. Aligned. No drift. No overengineering.

export type ExtensionManifest = {
  name: string;
  version: string;
  description: string;
  hooks: string[];
  entrypoint: string;
};

export const validateExtensionManifest = (
  manifest: unknown
): manifest is ExtensionManifest => {
  if (!manifest || typeof manifest !== "object") return false;

  const m = manifest as Record<string, unknown>;

  const requiredKeys: (keyof ExtensionManifest)[] = [
    "name",
    "version",
    "description",
    "hooks",
    "entrypoint",
  ];

  for (const key of requiredKeys) {
    if (!(key in m)) return false;
  }

  if (typeof m.name !== "string") return false;
  if (typeof m.version !== "string") return false;
  if (typeof m.description !== "string") return false;
  if (!Array.isArray(m.hooks)) return false;
  if (!m.hooks.every((h) => typeof h === "string")) return false;
  if (typeof m.entrypoint !== "string") return false;

  return true;
};
