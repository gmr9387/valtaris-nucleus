// Phase 50 — Real Certification Checks
//
// certificationEngine.certify() (see certificationEngine.ts) runs every
// registered check -- but nothing anywhere in the codebase ever called
// certificationEngine.register(), so certify() always ran zero checks
// and returned `{ ok: true, results: [] }`: a vacuous pass, the same
// "constitutional assumption" shape as subsystemHealthEngine's old
// hardcoded stub. This registers the real checks a "sovereign
// certification" sweep should actually mean: every claim-processing
// subsystem is registered and enabled, every manifest adapter loaded,
// and the constitutional boot pipeline completed -- the same live
// signals RuntimeGuards/GovernanceEngine, adapterAutoWireEngine, and
// constitutionalPipeline already produce elsewhere this session.

import { getSubsystem, type SubsystemId } from "../subsystems/subsystemRegistry";
import { adapterState } from "../adapters/adapterState";
import { adapterManifest } from "../adapters/adapterManifest";
import { pipelineState } from "../pipeline/pipelineState";
import { certificationEngine } from "./certificationEngine";

const CERT_ORG = "platform";
const SUBSYSTEMS: SubsystemId[] = ["weaver", "guardian", "glue", "dualpay"];

let registered = false;

export function ensureCertificationChecksRegistered(): void {
  if (registered) return;
  registered = true;

  for (const subsystem of SUBSYSTEMS) {
    certificationEngine.register(
      CERT_ORG,
      subsystem,
      "subsystem.enabled",
      `Subsystem "${subsystem}" must be registered and enabled to certify.`,
      () => {
        const s = getSubsystem(subsystem);
        return !!s && s.enabled;
      },
    );
  }

  certificationEngine.register(
    CERT_ORG,
    "adapters",
    "adapters.loaded",
    "Every manifest adapter must have completed dependency-ordered loading.",
    () => adapterManifest.adapters.every((a) => adapterState.loaded.includes(a)),
  );

  certificationEngine.register(
    CERT_ORG,
    "pipeline",
    "pipeline.completed",
    "The constitutional boot pipeline must have run to completion.",
    () => pipelineState.completed,
  );
}
