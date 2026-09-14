// Phase 24 — Contract Simulation

import { NucleusEvent } from "../events/nucleusEvent";
import { eventBus } from "../events/eventBus";
import { validateContract } from "../contracts/contractRegistry";
import { SimulationContext } from "./simulationContext";

export class ContractSimulation {
  simulateContract(
    name: string,
    version: string,
    payload: unknown,
    ctx: SimulationContext
  ): NucleusEvent {
    const validation = validateContract(name, version, payload);
    if (!validation.ok) {
      throw new Error(`Invalid contract: ${name}@${version}`);
    }

    const event: NucleusEvent = {
      type: name,
      version,
      payload,
      source: ctx.identity.subsystem,
      context: ctx.identity,
      timestamp: new Date().toISOString(),
      simulated: true,
    };

    eventBus.emit(event);
    return event;
  }
}

export const contractSimulation = new ContractSimulation();
