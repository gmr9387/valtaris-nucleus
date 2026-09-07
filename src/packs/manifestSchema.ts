// Strict. Aligned. No drift. No overengineering.

export type PackManifest = {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  entrypoint: string;
  publisher: string;
};

export const validatePackManifest = (manifest: unknown): manifest is PackManifest => {
  if (!manifest || typeof manifest !== "object") return false;

  const m = manifest as Record<string, unknown>;

  const requiredKeys: (keyof PackManifest)[] = [
    "name",
    "version",
    "description",
    "capabilities",
    "entrypoint",
    "publisher",
  ];

  for (const key of requiredKeys) {
    if (!(key in m)) return false;
  }

  if (typeof m.name !== "string") return false;
  if (typeof m.version !== "string") return false;
  if (typeof m.description !== "string") return false;
  if (!Array.isArray(m.capabilities)) return false;
  if (!m.capabilities.every((c) => typeof c === "string")) return false;
  if (typeof m.entrypoint !== "string") return false;
  if (typeof m.publisher !== "string") return false;

  return true;
};
