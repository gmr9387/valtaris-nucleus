// Phase 19 — SubsystemContractAdapter with identity enforcement

import { NucleusEvent } from "../events/nucleusEvent";
import { NucleusIdentity, NucleusSubsystem } from "../identity/nucleusIdentity";
import { eventBus } from "../events/eventBus";
import { validateContract } from "../contracts/contractRegistry";

export interface SubsystemContractInput {
  subsystem: NucleusSubsystem;
  name: string;
  version: string;
  payload: unknown;
  identity: NucleusIdentity;
  simulated?: boolean;
  correlationId?: string;
  traceId?: string;
}

export class SubsystemContractAdapter {
  static emit(input: SubsystemContractInput): NucleusEvent {
    const identity: NucleusIdentity = {
      ...input.identity,
      subsystem: input.subsystem,
    };

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
      throw new Error(`Invalid subsystem contract: ${input.name}@${input.version}`);
    }

    const event: NucleusEvent = {
      type: input.name,
      version: input.version,
      payload: input.payload,
      source: input.subsystem,
      context: identity,
      timestamp: new Date().toISOString(),
      correlationId: input.correlationId,
      traceId: input.traceId,
      simulated: input.simulated,
    };

    eventBus.emit(event);
    return event;
  }
}
