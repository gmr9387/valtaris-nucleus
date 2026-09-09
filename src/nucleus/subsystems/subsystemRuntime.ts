// Phase 25 — Base Subsystem Runtime

import { NucleusIdentity } from "../identity/nucleusIdentity";
import { eventSimulation } from "../simulation/eventSimulation";
import { contractSimulation } from "../simulation/contractSimulation";
// FIXED: real export is "nucleusState", not "stateEngine". Confirmed
// by actually running the boot chain -- this threw a SyntaxError at
// import time, not just a runtime error.
import { nucleusState } from "../state/stateEngine";

export abstract class SubsystemRuntime {
  constructor(public subsystem: NucleusIdentity["subsystem"]) {}

  protected buildIdentity(capability: string, identity: NucleusIdentity): NucleusIdentity {
    return {
      ...identity,
      subsystem: this.subsystem,
      capability,
    };
  }

  emitEvent(
    type: string,
    version: string,
    payload: unknown,
    identity: NucleusIdentity
  ) {
    const event = eventSimulation.simulateEvent(
      type,
      version,
      payload,
      { identity: { ...identity, subsystem: this.subsystem }, simulated: true }
    );

    // FIXED: StateEngine has no applyEvent() method, only
    // set(org, subsystem, key, value). Using tenantId as the org
    // identifier here since that's the field NucleusIdentity/NucleusEvent
    // actually carries (not organizationId, which is used elsewhere in
    // the codebase -- these two naming conventions coexist and haven't
    // been reconciled; flagging rather than silently picking one).
    nucleusState.set(identity.tenantId, this.subsystem, type, event);
    return event;
  }

  emitContract(
    name: string,
    version: string,
    payload: unknown,
    identity: NucleusIdentity
  ) {
    const event = contractSimulation.simulateContract(
      name,
      version,
      payload,
      { identity: { ...identity, subsystem: this.subsystem }, simulated: true }
    );

    nucleusState.set(identity.tenantId, this.subsystem, name, event);
    return event;
  }
}
