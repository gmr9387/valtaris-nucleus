// src/nucleus/telemetry/guardianTelemetrySchema.ts

export interface GuardianTelemetryRecord {
  timestamp: string;

  riskTier: string | null;
  riskScore: number | null;
  riskFlags: string[];

  rulesPassed: number;
  rulesFailed: number;

  scoringValue: number | null;

  killSwitchDecision: "ALLOW" | "ADVISORY" | "SOFT_STOP" | "HARD_STOP" | null;

  repairApplied: boolean;
  repairDiffSize: number | null;

  lifecycleState: "INGESTED" | "EVALUATED" | "REPAIRED" | "ENFORCED" | "FINALIZED" | "REOPENED";

  subsystem: "guardian";
  organizationId: string;
  claimId: string;
}
