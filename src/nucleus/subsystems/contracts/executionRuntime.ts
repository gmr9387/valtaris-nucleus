// src/nucleus/subsystems/contracts/executionRuntime.ts
// Full file — Execution Contract Runtime

import { NucleusApi } from "../../api/nucleusApi";
import { NucleusTelemetryAdapter } from "../../telemetry/nucleusTelemetryAdapter";

export class ExecutionRuntime {
  private telemetry: NucleusTelemetryAdapter;
  private api: NucleusApi;

  constructor(private organizationId: string) {
    this.telemetry = new NucleusTelemetryAdapter(organizationId, "execution-contract");

    this.api = new NucleusApi("execution", organizationId);
  }

  async run(version: string, payload: any) {
    const span = this.telemetry.startSpan("execution:run");

    try {
      // Emit execution contract + event
      await this.api.emit("execution", version, payload);

      // Finalize lineage
      const result = await this.api.finalize();

      await this.telemetry.info("Execution contract processed", {
        version,
        payload,
      });

      return result;
    } catch (err) {
      await this.telemetry.error("Execution runtime failed", {
        error: err,
      });
      throw err;
    } finally {
      this.telemetry.endSpan(span.spanId);
    }
  }
}
