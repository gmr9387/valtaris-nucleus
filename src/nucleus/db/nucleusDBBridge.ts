// src/nucleus/db/nucleusDbBridge.ts
// Constitutional Nucleus DB Bridge

import { createNucleusClient } from "./nucleusDB";
import type { Dynamic } from "../types/dynamic";

/**
 * FIXED: this class used to construct its own NucleusTelemetryAdapter
 * to log each DB operation's own success/failure -- but
 * NucleusTelemetryAdapter -> NucleusTelemetry -> `new NucleusDBBridge()`
 * (nucleusTelemetry.ts constructs a fresh bridge internally), and
 * *that* bridge's insertTelemetry() call would again try to log its
 * own success via its own freshly-constructed adapter, forever. Every
 * real DB write through this class would recurse without bound the
 * moment anything actually called it -- confirmed by tracing the
 * constructor chain, not by ever letting it run. Self-logging here now
 * uses plain console output, which is what actually breaks the cycle;
 * NucleusTelemetry/NucleusTelemetryAdapter remain real and safe to use
 * from any OTHER caller that isn't itself the DB bridge.
 *
 * FIXED: insertEvent/insertTelemetry previously inserted columns
 * (subsystem/name/version on nucleus_events; the misspelled `at` on
 * nucleus_telemetry) that don't exist on the real tables -- see
 * supabase/migrations/20260824_nucleus_core.sql for the actual shape
 * (nucleus_events: id/source/type/context/payload/timestamp;
 * nucleus_telemetry: id/subsystem/level/message/metadata/timestamp).
 * Both also omitted `id`, which has no DB default on either table, so
 * every real call would have hit a NOT NULL violation. Neither method
 * had a real caller before now, which is exactly why this had never
 * surfaced. Fixed to match the live schema and to generate `id`
 * client-side.
 */
export class NucleusDBBridge {
  private client = createNucleusClient();

  constructor(
    private organizationId?: string,
    private subsystem?: string,
  ) {}

  /** Raw client access for read/query operations the insert* methods below don't cover. */
  getClient() {
    return this.client;
  }

  async insertContract(table: string, organizationId: string, version: string, payload: Dynamic) {
    const { error } = await this.client.from(table).insert({
      organization_id: organizationId,
      version,
      payload,
    });

    if (error) {
      console.error(`[NucleusDBBridge] insertContract(${table}) failed`, error);
      throw error;
    }

    console.log(`[NucleusDBBridge] contract inserted: ${table} v${version}`);
  }

  async insertEvent(
    organizationId: string,
    subsystem: string,
    type: string,
    context: Dynamic,
    payload: Dynamic,
  ) {
    const { error } = await this.client.from("nucleus_events").insert({
      id: crypto.randomUUID(),
      organization_id: organizationId,
      source: subsystem,
      type,
      context: context ?? {},
      payload: payload ?? {},
    });

    if (error) {
      console.error(`[NucleusDBBridge] insertEvent(${type}) failed`, error);
      throw error;
    }

    console.log(`[NucleusDBBridge] event inserted: ${subsystem}.${type}`);
  }

  async insertLineage(organizationId: string, chain: Dynamic[], finalized: boolean = false) {
    const { error } = await this.client.from("nucleus_lineage").insert({
      organization_id: organizationId,
      chain,
      finalized,
      finalized_at: finalized ? new Date().toISOString() : null,
    });

    if (error) {
      console.error("[NucleusDBBridge] insertLineage failed", error);
      throw error;
    }

    console.log(
      `[NucleusDBBridge] lineage inserted: ${chain.length} stages, finalized=${finalized}`,
    );
  }

  async insertTelemetry(
    organizationId: string,
    subsystem: string,
    level: string,
    message: string,
    metadata: Dynamic = null,
  ) {
    const { error } = await this.client.from("nucleus_telemetry").insert({
      id: crypto.randomUUID(),
      organization_id: organizationId,
      subsystem,
      level,
      message,
      metadata,
    });

    if (error) {
      console.error("[NucleusDBBridge] insertTelemetry failed", error);
      throw error;
    }

    console.log(`[NucleusDBBridge] telemetry inserted: [${subsystem}][${level}] ${message}`);
  }
}
