// src/nucleus/runtime/nucleusRuntime.ts

import { eventBus } from "../events/eventBus";
import { StateEngine } from "../state/stateEngine";
import { TelemetryEngine } from "../telemetry/telemetryEngine";

export class NucleusRuntime {
  private subsystem: string;
  private organizationId: string;

  constructor(subsystem: string = "nucleus", organizationId: string = "dev-org") {
    this.subsystem = subsystem;
    this.organizationId = organizationId;
  }

  boot() {
    console.log(`Booting NucleusRuntime for subsystem=${this.subsystem}, org=${this.organizationId}`);

    // Initialize engines
    StateEngine.set(this.organizationId, this.subsystem, "boot", "ok");
    TelemetryEngine.record("runtime.boot", {
      subsystem: this.subsystem,
      organizationId: this.organizationId
    });

    eventBus.publish({
      type: "nucleus.boot",
      subsystem: this.subsystem,
      organizationId: this.organizationId,
      timestamp: new Date().toISOString()
    });
  }
}

// Legacy singleton compatibility
export const nucleus = new NucleusRuntime();
