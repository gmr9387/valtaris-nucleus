// src/nucleus/runtime/nucleusRuntime.ts

import { eventBus } from "../events/eventBus";
import { nucleusState } from "../state/stateEngine";
import { nucleusTelemetry } from "../telemetry/telemetryEngine";
import { weaverRuntime } from "../subsystems/weaverRuntime";
import { guardianRuntime } from "../subsystems/guardianRuntime";
import { glueRuntime } from "../subsystems/glueRuntime";
import { dualpayRuntime } from "../subsystems/dualpayRuntime";

export class NucleusRuntime {
  private subsystem: string;
  private organizationId: string;

  constructor(subsystem: string = "nucleus", organizationId: string = "dev-org") {
    this.subsystem = subsystem;
    this.organizationId = organizationId;
  }

  boot() {
    console.log(`Booting NucleusRuntime for subsystem=${this.subsystem}, org=${this.organizationId}`);

    // FIXED: StateEngine.set() was called as a static method, but set()
    // is an instance method on the nucleusState singleton, not the class.
    nucleusState.set(this.organizationId, this.subsystem, "boot", "ok");

    // FIXED: TelemetryEngine.record() does not exist under any name.
    // The real method is recordEvent(), and it lives on the nucleusTelemetry
    // singleton instance, not as a static on the class.
    nucleusTelemetry.recordEvent({
      organizationId: this.organizationId,
      subsystem: this.subsystem,
      type: "runtime.boot",
      payload: { subsystem: this.subsystem, organizationId: this.organizationId },
    });

    // FIXED: eventBus.publish() requires four positional arguments
    // (org, subsystem, type, payload) -- it was being called with a
    // single object, which would have left subsystem/type/payload
    // undefined on every boot event.
    eventBus.publish(this.organizationId, this.subsystem, "nucleus.boot", {
      timestamp: new Date().toISOString(),
    });
  }

  // RESTORED: removed in the last rewrite, but 32+ files under
  // verification/, activation/, orchestration/, certification/,
  // audit/, and stress/ call nucleus.weaver.discover(),
  // nucleus.guardian.authorize(), nucleus.glue.bind(),
  // nucleus.dualpay.charge(), etc. Without these accessors every
  // one of those files throws "Cannot read properties of undefined".
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
}

// Legacy singleton compatibility
export const nucleus = new NucleusRuntime();
