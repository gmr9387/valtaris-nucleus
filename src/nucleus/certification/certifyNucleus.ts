// Phase 50 — Certification Entrypoint

import { certificationEngine } from "./certificationEngine";
import { certificationState } from "./certificationState";
import { ensureCertificationChecksRegistered } from "./registerCertificationChecks";
import { registerAllSubsystems } from "../subsystems/registerSubsystems";
import { loadAdapters } from "../adapters/loadAdapters";
import { constitutionalPipeline } from "../pipeline/constitutionalPipeline";

export async function certifyNucleus() {
  console.log("🔵 Phase 50 — Sovereign Certification Starting...");

  // certifyNucleus() can be invoked on its own (the CLI's `certify`
  // command) without a prior real boot in the same process -- so, like
  // ciSuites.ts's "autonomy.tests"/"dispatch.tests", it boots the state
  // it's about to certify itself, idempotently, rather than certifying
  // whatever this process happened to already have in memory.
  registerAllSubsystems();
  await loadAdapters();
  await constitutionalPipeline.execute();
  ensureCertificationChecksRegistered();

  const result = await certificationEngine.certify();

  certificationState.certified = result.ok;
  certificationState.lastCertifiedAt = new Date().toISOString();
  certificationState.proofs = result.results.map((r) => `${r.subsystem}.${r.name}`);

  console.log("🟢 Certification complete:", result);
  console.log("🔵 Phase 50 — Sovereign Certification Finished.");
  return result;
}
