// src/nucleus/subsystems/contracts/contractTelemetrySchema.ts
// Full file — Contract Subsystem Telemetry Schema

export const ContractTelemetrySchema = {
  eventTypes: ["contract.start", "contract.step", "contract.complete", "contract.error"],

  metrics: {
    executionTimeMs: {
      type: "number",
      description: "Total execution time for the contract runtime",
    },
    stepsExecuted: {
      type: "number",
      description: "Number of steps executed inside the contract runtime",
    },
  },

  trace: {
    fields: {
      traceId: "string",
      type: "string",
      version: "string",
      startedAt: "string",
      completedAt: "string | null",
      steps: "TelemetryTraceStep[]",
    },
  },

  replay: {
    fields: {
      runId: "string",
      createdAt: "string",
      metadata: "Record<string, unknown>",
    },
  },
};
