// src/nucleus/subsystems/registerSubsystems.ts

import { registerSubsystem } from "./subsystemRegistry";

import { GuardianRuntime } from "./guardian/guardianRuntime";
import { GlueRuntime } from "./glue/glueRuntime";
import { WeaverRuntime } from "./weaver/weaverRuntime";
import { DualPayRuntime } from "./dualpay/dualPayRuntime";
import { TelemetryRuntime } from "./telemetry/telemetryRuntime";

// The "contracts" subsystem (ContractsRuntime -> OpportunityRuntime/
// RecommendationRuntime/AuthorizationRuntime/ExecutionRuntime/
// PaymentRuntime) was retired along with NucleusApi -- it existed only
// to be driven by NucleusApi.emit(), a parallel, incompatible
// constitutional contract-chain prototype with hardcoded fixture
// tenants and a payload shape (executionType, flat amount) the real
// weaver/guardian/glue/dualpay runtimes never produced. It was never
// dispatched via RuntimeRouter on the real claim path. See
// gapMap.md's changelog for the decision.
export function registerAllSubsystems() {
  registerSubsystem({
    id: "guardian",
    label: "Guardian Risk Engine",
    enabled: true,
    runtime: GuardianRuntime,
  });

  registerSubsystem({
    id: "glue",
    label: "Glue Integration Engine",
    enabled: true,
    runtime: GlueRuntime,
  });

  registerSubsystem({
    id: "weaver",
    label: "Weaver Intelligence Engine",
    enabled: true,
    runtime: WeaverRuntime,
  });

  registerSubsystem({
    id: "dualpay",
    label: "DualPay Payment Intelligence",
    enabled: true,
    runtime: DualPayRuntime,
  });

  registerSubsystem({
    id: "telemetry",
    label: "Telemetry Subsystem",
    enabled: true,
    runtime: TelemetryRuntime,
  });
}
