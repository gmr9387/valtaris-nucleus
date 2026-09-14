// Phase 24 — Event Simulation

import { NucleusEvent } from "../events/nucleusEvent";
import { eventBus } from "../events/eventBus";
import { SimulationContext } from "./simulationContext";

export class EventSimulation {
  simulateEvent(
    type: string,
    version: string,
    payload: unknown,
    ctx: SimulationContext,
  ): NucleusEvent {
    const event: NucleusEvent = {
      type,
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

export const eventSimulation = new EventSimulation();
