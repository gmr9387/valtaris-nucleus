// src/nucleus/capabilityRegistry.ts

export type Capability =
  | "discover_financial_opportunity"
  | "detect_cross_system_anomaly"
  | "identify_recovery_candidate"
  | "analyze_healthcare_reimbursement"
  | "reconcile_remittance"
  | "identify_claim_recovery"
  | "authorize_financial_action"
  | "evaluate_policy"
  | "enforce_approval_threshold"
  | "execute_workflow"
  | "schedule_action"
  | "retry_operation"
  | "reconcile_execution";

export interface RegisteredCapability {
  subsystem: string;
  capability: Capability;
}

const registry: RegisteredCapability[] = [];

export function registerCapability(subsystem: string, capability: Capability) {
  registry.push({ subsystem, capability });
}

export function getCapabilitiesFor(subsystem: string): Capability[] {
  return registry.filter((c) => c.subsystem === subsystem).map((c) => c.capability);
}

export function findSubsystemsWith(capability: Capability): string[] {
  return registry.filter((c) => c.capability === capability).map((c) => c.subsystem);
}

export function listAllCapabilities(): RegisteredCapability[] {
  return [...registry];
}
