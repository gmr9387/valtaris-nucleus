// Phase 27 — Unified Nucleus Runtime

import { eventBus } from "../events/eventBus";
import { nucleusState } from "../state/stateEngine";
import { weaverRuntime } from "../subsystems/weaverRuntime";
import { guardianRuntime } from "../subsystems/guardianRuntime";
import { glueRuntime } from "../subsystems/glueRuntime";
import { dualpayRuntime } from "../subsystems/dualpayRuntime";
import { contractSimulation } from "../simulation/contractSimulation";
import { eventSimulation } from "../simulation/eventSimulation";
import { resourceGraph } from "../resources/resourceGraph";
import { lineageEngine } from "../lineage/lineageEngine";
import { nucleusTelemetry } from "../telemetry/telemetryEngine";
import { Subsystem } from "./runtimeGuards";

export class NucleusRuntime {
  private booted = false;

  /**
   * FIXED: params are now defaulted rather than required. 21 other files
   * import the zero-arg `nucleus` singleton at the bottom of this file
   * (`new NucleusRuntime()`), while nucleusBoot.ts constructs its own
   * instance with real values (`new NucleusRuntime(subsystem, organizationId)`).
   * Making these required would have broken all 21 callers to fix the one.
   */
  constructor(
    private subsystem: Subsystem = "nucleus",
    private organizationId: string = "unassigned"
  ) {
    // Wire eventBus -> stateEngine for every event, regardless of
    // subsystem/type. (FIXED: eventBus.subscribe() requires a specific
    // (subsystem, type, handler) key and cannot express "listen to
    // everything" -- subscribeAll() was added to eventBus.ts for this.
    // ALSO FIXED: StateEngine has no applyEvent() method -- only
    // set(org, subsystem, key, value). EventRecord's shape maps onto
    // that directly: type as key, payload as value.)
    eventBus.subscribeAll((event) => {
      nucleusState.set(event.org, event.subsystem, event.type, event.payload);
    });
  }

  /**
   * FIXED: this method did not exist. nucleusBoot() (runtime/nucleusBoot.ts)
   * calls `runtime.boot()` immediately after construction -- without this,
   * every real call to nucleusBoot() throws
   * "runtime.boot is not a function" at startup.
   */
  boot() {
    if (this.booted) {
      console.warn(
        `[NucleusRuntime] boot() called again for subsystem=${this.subsystem}, ` +
          `organizationId=${this.organizationId} -- already booted, no-op.`
      );
      return this;
    }

    console.log(
      `[NucleusRuntime] Booted for subsystem=${this.subsystem}, ` +
        `organizationId=${this.organizationId}`
    );

    this.booted = true;
    return this;
  }

  get isBooted() {
    return this.booted;
  }

  // Subsystem accessors
  get weaver() {
    return weaverRuntime;
  }

  get guardian() {
    return guardianRuntime;
  }

  get glue() {
    return glueRuntime;
  }

  get dualpay() {
    return dualpayRuntime;
  }

  // Simulation accessors
  get simulateEvent() {
    return eventSimulation;
  }

  get simulateContract() {
    return contractSimulation;
  }

  // Resource graph access
  get resources() {
    return resourceGraph;
  }

  // Lineage access
  get lineage() {
    return lineageEngine;
  }

  // Telemetry access
  get telemetry() {
    return nucleusTelemetry;
  }
}

export const nucleus = new NucleusRuntime();
