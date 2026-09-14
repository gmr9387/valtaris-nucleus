// Phase 49 — Deployment Manifest

export interface DeploymentManifest {
  enabled: boolean;
  supabase: boolean;
  apiServer: boolean;
  osGuardian: boolean;
  dashboard: boolean;
  version: string;
  environments: string[];
  // Matches the subsystem ids registerSubsystems.ts registers.
  subsystems: string[];
  // "<subsystem>.<capability>" — filtered by subsystemDeploymentMap.ts
  // via `.startsWith(\`${subsystem}.\`)`.
  capabilities: string[];
  // "<contractName>(<subsystem>.<verb>)" — filtered by
  // subsystemDeploymentMap.ts via `.includes(\`(${subsystem}.\`)`.
  contracts: string[];
  resources: string[];
}

export const deploymentManifest: DeploymentManifest = {
  enabled: true,
  supabase: true,
  apiServer: true,
  osGuardian: true,
  dashboard: true,
  version: "1.0.0",
  environments: ["development", "staging", "production"],
  subsystems: ["guardian", "contracts", "glue", "weaver", "dualpay", "telemetry"],
  capabilities: [
    "guardian.authorization",
    "contracts.opportunity",
    "contracts.recommendation",
    "contracts.authorization",
    "contracts.execution",
    "contracts.payment",
    "glue.execution",
    "weaver.opportunity",
    "weaver.recommendation",
    "dualpay.payment",
    "telemetry.emit",
  ],
  contracts: [
    "opportunity(weaver.emit)",
    "recommendation(weaver.emit)",
    "authorization(guardian.emit)",
    "execution(glue.emit)",
    "payment(dualpay.emit)",
  ],
  resources: [
    "member_accumulators(guardian.resource)",
    "payer_contracts(contracts.resource)",
    "fee_schedules(contracts.resource)",
    "lineage(telemetry.resource)",
  ],
};
