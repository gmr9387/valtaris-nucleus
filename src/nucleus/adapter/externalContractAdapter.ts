// Phase 19 — ExternalContractAdapter with identity enforcement

import { NucleusEvent } from "../events/nucleusEvent";
import { NucleusIdentity } from "../identity/nucleusIdentity";
import { eventBus } from "../events/eventBus";
import { validateContract } from "../contracts/contractRegistry";

export interface ExternalContractInput {
  name: string;
  version: string;
  payload: unknown;
  identity: NucleusIdentity;
  source: string;
  correlationId?: string;
  traceId?: string;
}

export class ExternalContractAdapter {
  static emit(input: ExternalContractInput): NucleusEvent {
    const identity = input.identity;

    if (!identity.tenantId) throw new Error("Missing tenantId");
    if (!identity.environmentId) throw new Error("Missing environmentId");
    if (!identity.projectId) throw new Error("Missing projectId");

    if (identity.actorId && typeof identity.actorId !== "string") {
      throw new Error("Invalid actorId");
    }

    if (!identity.subsystem) throw new Error("Missing subsystem");
    if (!identity.capability) throw new Error("Missing capability");

    const validation = validateContract(input.name, input.version, input.payload);
    if (!validation.ok) {
      throw new Error(`Invalid contract: ${input.name}@${input.version}`);
    }

    const event: NucleusEvent = {
      type: input.name,
      version: input.version,
      payload: input.payload,
      source: input.source,
      context: identity,
      timestamp: new Date().toISOString(),
      correlationId: input.correlationId,
      traceId: input.traceId,
    };

    eventBus.emit(event);
    return event;
  }
}
