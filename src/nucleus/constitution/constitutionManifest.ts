// Phase 34 — Constitutional Manifest

import { constitution } from "./constitution";

export function getConstitutionManifest() {
  return {
    version: constitution.version,
    subsystems: constitution.subsystems.map((s) => s.name),
    capabilities: constitution.subsystems.flatMap((s) =>
      s.capabilities.map((c) => `${s.name}.${c}`),
    ),
    contracts: constitution.contracts.map(
      (c) => `${c.name}@${c.version} (${c.subsystem}.${c.capability})`,
    ),
    resources: constitution.resources.map((r) => `${r.type} (${r.subsystem}.${r.capability})`),
    identityBoundary: constitution.identityBoundary,
  };
}
