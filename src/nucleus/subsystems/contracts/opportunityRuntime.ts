// src/nucleus/subsystems/contracts/opportunityRuntime.ts
// Full file — Opportunity Contract Runtime

import { NucleusApi } from "../../api/nucleusApi";
import { NucleusTelemetryAdapter } from "../../telemetry/nucleusTelemetryAdapter";
import type { Dynamic } from "../../types/dynamic";

export class OpportunityRuntime {
  private telemetry: NucleusTelemetryAdapter;
  private api: NucleusApi;

  constructor(private organizationId: string) {
    this.telemetry = new NucleusTelemetryAdapter(organizationId, "opportunity-contract");

    this.api = new NucleusApi("opportunity", organizationId);
  }

  async run(version: string, payload: Dynamic) {
    const span = this.telemetry.startSpan("opportunity:run");

    try {
      await this.api.emit("opportunity", version, payload);
      const result = await this.api.finalize();

      await this.telemetry.info("Opportunity contract processed", {
        version,
        payload,
      });

      return result;
    } catch (err) {
      await this.telemetry.error("Opportunity runtime failed", {
        error: err,
      });
      throw err;
    } finally {
      this.telemetry.endSpan(span.spanId);
    }
  }
}
