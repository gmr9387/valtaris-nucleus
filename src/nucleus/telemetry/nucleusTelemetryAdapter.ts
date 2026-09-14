// src/nucleus/telemetry/nucleusTelemetryAdapter.ts
// Full file swap — Unified Telemetry + Tracing Adapter

import { NucleusTelemetry } from "./nucleusTelemetry";
import { NucleusTracing } from "./nucleusTracing";
import type { Dynamic } from "../types/dynamic";

export class NucleusTelemetryAdapter {
  private telemetry = new NucleusTelemetry();
  private tracing = new NucleusTracing();

  constructor(
    private organizationId: string,
    private subsystem: string,
  ) {}

  startSpan(name: string) {
    return this.tracing.startSpan(name, this.subsystem);
  }

  endSpan(spanId: string) {
    this.tracing.endSpan(spanId);
  }

  async info(message: string, metadata: Dynamic = null) {
    await this.telemetry.emit(this.organizationId, this.subsystem, "info", message, metadata);
  }

  async warn(message: string, metadata: Dynamic = null) {
    await this.telemetry.emit(this.organizationId, this.subsystem, "warn", message, metadata);
  }

  async error(message: string, metadata: Dynamic = null) {
    await this.telemetry.emit(this.organizationId, this.subsystem, "error", message, metadata);
  }

  async debug(message: string, metadata: Dynamic = null) {
    await this.telemetry.emit(this.organizationId, this.subsystem, "debug", message, metadata);
  }

  getSpans() {
    return this.tracing.getSpans();
  }
}
