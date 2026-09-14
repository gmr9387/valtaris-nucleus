// src/nucleus/tests/performanceSmoke.test.ts

import { describe, it, test, expect } from "vitest";

/**
 * Performance Smoke Tests (Phase 9.4)
 *
 * Purpose:
 *   Ensure batching + perf hooks behave sanely.
 */

import { NucleusBatchApi } from "../api/nucleusBatchApi";
import { RuntimeConfig } from "../runtime/runtimeConfig";

describe("Performance smoke", () => {
  it("emits a small batch within limits", () => {
    RuntimeConfig.update({ maxBatchSize: 10 });

    const api = new NucleusBatchApi("weaver", "org-perf");
    const result = api.emitBatch([
      { name: "opportunity", version: "v1", payload: { organizationId: "org-perf" } },
      { name: "recommendation", version: "v1", payload: { organizationId: "org-perf" } },
    ]);

    expect(result.ok).toBe(true);
    const samples = api.metrics();
    expect(samples.length).toBeGreaterThan(0);
  });

  it("rejects oversized batches", () => {
    RuntimeConfig.update({ maxBatchSize: 1 });

    const api = new NucleusBatchApi("weaver", "org-perf");
    expect(() =>
      api.emitBatch([
        { name: "opportunity", version: "v1", payload: { organizationId: "org-perf" } },
        { name: "recommendation", version: "v1", payload: { organizationId: "org-perf" } },
      ]),
    ).toThrow();
  });
});
