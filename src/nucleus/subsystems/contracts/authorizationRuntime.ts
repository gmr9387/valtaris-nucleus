// src/nucleus/subsystems/contracts/authorizationRuntime.ts
// Full file — Authorization Contract Runtime

import { NucleusApi } from "../../api/nucleusApi";
import { NucleusTelemetryAdapter } from "../../telemetry/nucleusTelemetryAdapter";
import type { Dynamic } from "../../types/dynamic";

export class AuthorizationRuntime {
  private telemetry: NucleusTelemetryAdapter;
  private api: NucleusApi;

  constructor(private organizationId: string) {
    this.telemetry = new NucleusTelemetryAdapter(organizationId, "authorization-contract");

    this.api = new NucleusApi("authorization", organizationId);
  }

  async run(version: string, payload: Dynamic) {
    const span = this.telemetry.startSpan("authorization:run");

    try {
      // Emit authorization contract + event
      await this.api.emit("authorization", version, payload);

      // Finalize lineage
      const result = await this.api.finalize();

      await this.telemetry.info("Authorization contract processed", {
        version,
        payload,
      });

      return result;
    } catch (err) {
      await this.telemetry.error("Authorization runtime failed", {
        error: err,
      });
      throw err;
    } finally {
      this.telemetry.endSpan(span.spanId);
    }
  }
}
