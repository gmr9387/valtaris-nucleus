// src/nucleus/runtime/nucleusRuntime.ts

import { eventBus } from "../events/eventBus";
import { nucleusState } from "../state/stateEngine";
import { nucleusTelemetry } from "../telemetry/telemetryEngine";

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

    // FIXED (self-correction): recordEvent() takes four positional
    // arguments (org, subsystem, type, payload) -- it was called here
    // with a single object, which left `subsystem` undefined inside
    // recordEvent() and crashed on subsystem.toUpperCase(). Caught by
    // actually running the boot chain, not by inspection.
    nucleusTelemetry.recordEvent(
      this.organizationId,
      this.subsystem,
      "runtime.boot",
      { subsystem: this.subsystem, organizationId: this.organizationId }
    );

    // FIXED: eventBus.publish() requires four positional arguments
    // (org, subsystem, type, payload) -- it was being called with a
    // single object, which would have left subsystem/type/payload
    // undefined on every boot event.
    eventBus.publish(this.organizationId, this.subsystem, "nucleus.boot", {
      timestamp: new Date().toISOString(),
    });
  }

  // REMOVED: weaver/guardian/glue/dualpay accessors and their backing
  // files (subsystems/weaverRuntime.ts, guardianRuntime.ts, glueRuntime.ts,
  // dualpayRuntime.ts, subsystemRuntime.ts, subsystems/index.ts) were
  // deleted -- their only real callers were the 20 orphaned diagnostic
  // files under verification/, certification/, audit/, stress/, and
  // orchestration/, which were also deleted. Confirmed by grep across
  // the full codebase that nothing outside this file referenced these
  // accessors once those 20 files were gone.
}

// Legacy singleton compatibility
export const nucleus = new NucleusRuntime();
