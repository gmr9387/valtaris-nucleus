// src/nucleus/api/internalStatusController.ts
//
// Every gap closed this session (Governance, Adapter Registry,
// Constitutional Pipeline, Recovery, Certification, plus the earlier
// Event Bus/Queue/Scheduler/Retry/State/Metrics work) produced real,
// live state -- but nothing anywhere exposed it. dashboardProviders.ts
// (Phase 48) looked like the obvious place, except several of its
// entries (`pipeline`, `activation`, `autonomy`) call the real
// action -- constitutionalPipeline.execute(), environmentActivationEngine
// .activateAll() -- as their "read", which would re-run the entire boot
// pipeline's side effects on every single status request. This reads
// the actual resulting STATE objects and pure getters those actions
// already populate instead, so hitting this endpoint is a real read,
// not a re-boot.

import { pipelineState } from "../pipeline/pipelineState";
import { adapterState } from "../adapters/adapterState";
import { ciState } from "../ci/ciState";
import { certificationState } from "../certification/certificationState";
import { deploymentState } from "../deployment/deploymentState";
import { nucleusGovernance } from "../governance/governanceEngine";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusMetrics } from "../metrics/metricsEngine";
import { subsystemHealthEngine } from "../autonomy/subsystemHealthEngine";
import { autonomyManifest } from "../autonomy/autonomyManifest";
import { federationEngine } from "../federation/federationEngine";
import { resourceGraph } from "../resources/resourceGraph";
import { lineageEngine } from "../lineage/lineageEngine";
import { telemetryEngine } from "../telemetry/telemetryEngine";

const RECENT_LIMIT = 25;

export async function getInternalStatus() {
  const health = await subsystemHealthEngine.checkAll(autonomyManifest.subsystems);

  const decisions = nucleusGovernance.getDecisions();
  const points = nucleusMetrics.getPoints();

  return {
    generatedAt: new Date().toISOString(),
    health,
    governance: {
      totalDecisions: decisions.length,
      recentDecisions: decisions.slice(-RECENT_LIMIT),
    },
    certification: certificationState,
    adapters: adapterState,
    pipeline: pipelineState,
    ci: ciState,
    deployment: deploymentState,
    federation: {
      nodes: federationEngine.getNodes(),
      links: federationEngine.getLinks(),
    },
    metrics: {
      totalPoints: points.length,
      recentPoints: points.slice(-RECENT_LIMIT),
    },
    audit: nucleusAudit.report(),
    resources: { total: resourceGraph.listResources().length },
    lineage: { total: lineageEngine.list().length },
    telemetry: { total: telemetryEngine.list().length },
  };
}
