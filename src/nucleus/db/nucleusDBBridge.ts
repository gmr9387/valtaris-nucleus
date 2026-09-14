// src/nucleus/db/nucleusDbBridge.ts
// Constitutional Nucleus DB Bridge

import { createNucleusClient } from "./nucleusDB";
import { NucleusTelemetryAdapter } from "../telemetry/nucleusTelemetryAdapter";

export class NucleusDBBridge {
  private client = createNucleusClient();
  private telemetry: NucleusTelemetryAdapter;

  constructor(private organizationId?: string, private subsystem?: string) {
    this.telemetry = new NucleusTelemetryAdapter(
      organizationId ?? "nucleus-db-org",
      subsystem ?? "nucleus-db"
    );
  }

  /** Raw client access for read/query operations the insert* methods below don't cover. */
  getClient() {
    return this.client;
  }

  async insertContract(
    table: string,
    organizationId: string,
    version: string,
    payload: any
  ) {
    const span = this.telemetry.startSpan(`db:insertContract:${table}`);

    const { error } = await this.client.from(table).insert({
      organization_id: organizationId,
      version,
      payload,
    });

    if (error) {
      await this.telemetry.error("DB insertContract failed", { table, error });
      throw error;
    }

    await this.telemetry.info("DB contract inserted", { table, version });
    this.telemetry.endSpan(span.spanId);
  }

  async insertEvent(
    organizationId: string,
    subsystem: string,
    name: string,
    version: string,
    payload: any
  ) {
    const span = this.telemetry.startSpan(`db:insertEvent:${name}`);

    const { error } = await this.client.from("nucleus_events").insert({
      organization_id: organizationId,
      subsystem,
      name,
      version,
      payload,
    });

    if (error) {
      await this.telemetry.error("DB insertEvent failed", { name, error });
      throw error;
    }

    await this.telemetry.info("DB event inserted", { name, version });
    this.telemetry.endSpan(span.spanId);
  }

  async insertLineage(
    organizationId: string,
    chain: any,
    finalized: boolean = false
  ) {
    const span = this.telemetry.startSpan("db:insertLineage");

    const { error } = await this.client.from("nucleus_lineage").insert({
      organization_id: organizationId,
      chain,
      finalized,
    });

    if (error) {
      await this.telemetry.error("DB insertLineage failed", { error });
      throw error;
    }

    await this.telemetry.info("DB lineage inserted", {
      chainLength: chain.length,
      finalized,
    });

    this.telemetry.endSpan(span.spanId);
  }

  async insertTelemetry(
    organizationId: string,
    subsystem: string,
    level: string,
    message: string,
    metadata: any = null
  ) {
    const span = this.telemetry.startSpan("db:insertTelemetry");

    const { error } = await this.client.from("nucleus_telemetry").insert({
      organization_id: organizationId,
      subsystem,
      level,
      message,
      metadata,
      at: new Date().toISOString(),
    });

    if (error) {
      await this.telemetry.error("DB insertTelemetry failed", { error });
      throw error;
    }

    await this.telemetry.info("DB telemetry inserted", { level });
    this.telemetry.endSpan(span.spanId);
  }
}
