// src/nucleus/subsystems/contracts/contractsRuntime.ts

/**
 * NEW FILE: registerSubsystems.ts imports `ContractsRuntime` from
 * "./contracts/contractsRuntime" -- this file did not exist. The real
 * per-stage runtimes (OpportunityRuntime, RecommendationRuntime,
 * AuthorizationRuntime, ExecutionRuntime, PaymentRuntime) are five
 * separate classes, each requiring `new X(organizationId)` and calling
 * an instance method `.run(version, payload)` -- a different shape
 * than the static `.handle(contractName, payload, ctx?)` every other
 * subsystem (Guardian, Glue, Weaver, DualPay) already implements.
 *
 * This provides that missing static `.handle()` surface, routing to
 * the correct per-stage class based on contractName, so registerSubsystems.ts
 * can register "contracts" the same way it registers everything else.
 *
 * Without this file, calling registerAllSubsystems() throws
 * ERR_MODULE_NOT_FOUND immediately on boot -- confirmed by actually
 * running the boot chain, not just compiling it.
 */

import { OpportunityRuntime } from "./opportunityRuntime";
import { RecommendationRuntime } from "./recommendationRuntime";
import { AuthorizationRuntime } from "./authorizationRuntime";
import { ExecutionRuntime } from "./executionRuntime";
import { PaymentRuntime } from "./paymentRuntime";

const DEFAULT_VERSION = "v1";

export class ContractsRuntime {
  static async handle(contractName: string, payload: any, ctx?: { organizationId?: string }) {
    const organizationId = ctx?.organizationId ?? payload?.organizationId ?? "unassigned";
    const version = payload?.version ?? DEFAULT_VERSION;

    switch (contractName) {
      case "opportunity":
        return new OpportunityRuntime(organizationId).run(version, payload);
      case "recommendation":
        return new RecommendationRuntime(organizationId).run(version, payload);
      case "authorization":
        return new AuthorizationRuntime(organizationId).run(version, payload);
      case "execution":
        return new ExecutionRuntime(organizationId).run(version, payload);
      case "payment":
        return new PaymentRuntime(organizationId).run(version, payload);
      default:
        throw new Error(`ContractsRuntime: unknown contract "${contractName}"`);
    }
  }
}
