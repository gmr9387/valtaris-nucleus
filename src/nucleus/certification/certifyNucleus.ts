// Phase 50 — Certification Entrypoint

import { certificationEngine } from "./certificationEngine";
import { certificationState } from "./certificationState";
import { ensureCertificationChecksRegistered } from "./registerCertificationChecks";
import { registerAllSubsystems } from "../subsystems/registerSubsystems";
import { loadAdapters } from "../adapters/loadAdapters";
import { constitutionalPipeline } from "../pipeline/constitutionalPipeline";
import { nucleusState } from "../state/stateEngine";

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

  // gapMap.md's Certification Engine gap "Versioned certifications
  // (history + snapshots)": certificationState above only ever held the
  // latest sweep, overwritten every run -- no history of past sweeps
  // survived the next one. Every real sweep now also goes through
  // StateEngine (the same diff/snapshot mechanism RuntimeRouter.dispatch()
  // already trusts for claim state), so certificationState.certified
  // flipping over time -- and each sweep's snapshot of its own proofs --
  // is a real, queryable version history instead of a single overwritten
  // value.
  nucleusState.set("platform", "certification", "result", {
    certified: certificationState.certified,
    lastCertifiedAt: certificationState.lastCertifiedAt,
    proofs: certificationState.proofs,
  });
  nucleusState.snapshot("platform", "certification");

  console.log("🟢 Certification complete:", result);
  console.log("🔵 Phase 50 — Sovereign Certification Finished.");
  return result;
}

/**
 * The real version history of past certification sweeps -- gapMap.md's
 * "Versioned certifications" gap, closed via StateEngine rather than a
 * second, parallel history mechanism.
 */
export function getCertificationHistory() {
  return {
    diffs: nucleusState.getDiffs("platform", "certification"),
    snapshots: nucleusState.getSnapshots("platform", "certification"),
  };
}
