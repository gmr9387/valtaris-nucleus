// Phase 34 — Constitutional Integrity Report

import { constitution } from "./constitution";
import { lineageEngine } from "../lineage/lineageEngine";
import { telemetryEngine } from "../telemetry/telemetryEngine";
import { resourceGraph } from "../resources/resourceGraph";

export function runConstitutionIntegrityCheck() {
  console.log("🔵 Running constitutional integrity check...");

  const lineage = lineageEngine.list();
  const telemetry = telemetryEngine.list();
  const resources = resourceGraph.listResources();

  const identityBoundaryCheck =
    lineage.every((entry) => entry.identity.tenantId) &&
    telemetry.every((entry) => entry.identity?.environmentId) &&
    resources.every((r) => r.identity.projectId);

  const subsystemCapabilityCheck = constitution.subsystems.every((s) =>
    s.capabilities.every((cap) =>
      constitution.contracts.some(
        (c) => c.subsystem === s.name && c.capability === cap
      )
    )
  );

  const resourceBindingCheck = constitution.resources.every((r) =>
    constitution.contracts.some(
      (c) => c.resources.includes(r.type)
    )
  );

  return {
    identityBoundaryCheck,
    subsystemCapabilityCheck,
    resourceBindingCheck,
    lineageCount: lineage.length,
    telemetryCount: telemetry.length,
    resourceCount: resources.length,
  };
}
