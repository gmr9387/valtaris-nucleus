// src/nucleus/subsystems/telemetry/telemetryRuntime.ts

import { eventBus } from "../../events/eventBus";
import { TelemetryEngine } from "./telemetryEngine";

export class TelemetryRuntime {
  static emit(subsystem: string, payload: any) {
    const event = TelemetryEngine.format(subsystem, payload);
    eventBus.emit(`telemetry.${subsystem}`, event);
    return event;
  }

  // Matches the `{ handle: (contractName, payload, ctx?) => any }` shape
  // registerSubsystem() requires of every runtime -- registerSubsystems.ts
  // registers Telemetry the same way as every other subsystem.
  static handle(contractName: string, payload: any) {
    return this.emit(contractName, payload);
  }
}
