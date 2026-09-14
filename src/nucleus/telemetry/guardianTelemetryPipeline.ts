// src/nucleus/telemetry/guardianTelemetryPipeline.ts

import { GuardianTelemetryAdapter } from "./guardianTelemetryAdapter";
import { GuardianTelemetryRecord } from "./guardianTelemetrySchema";

export class GuardianTelemetryPipeline {
  private adapter: GuardianTelemetryAdapter;

  constructor(private organizationId: string) {
    this.adapter = new GuardianTelemetryAdapter(organizationId);
  }

  async emitLifecycle(record: {
    claimId: string;
    lifecycleState: "INGESTED" | "EVALUATED" | "REPAIRED" | "ENFORCED" | "FINALIZED" | "REOPENED";
  }) {
    const payload: GuardianTelemetryRecord = {
      timestamp: "",
      subsystem: "guardian",
      organizationId: this.organizationId,
      claimId: record.claimId,

      riskTier: null,
      riskScore: null,
      riskFlags: [],

      rulesPassed: 0,
      rulesFailed: 0,

      scoringValue: null,

      killSwitchDecision: null,

      repairApplied: false,
      repairDiffSize: null,

      lifecycleState: record.lifecycleState,
    };

    return this.adapter.record(payload);
  }

  async emitFullGuardianEvent(event: GuardianTelemetryRecord) {
    return this.adapter.record(event);
  }
}
