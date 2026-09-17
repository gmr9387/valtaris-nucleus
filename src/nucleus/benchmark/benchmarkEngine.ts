// src/nucleus/benchmark/benchmarkEngine.ts
//
// gapMap.md's "Internal Benchmark Suite (runtime/pipelines/workflows)"
// (#20) -- unlike every other gap this pass, there was no existing
// module to wire in, and no synthetic-timing shortcut worth taking
// either: a benchmark that times a no-op stand-in proves nothing about
// the real system. This runs real claims through the real pipeline
// (OSPipeline.runClaim() -> RuntimeRouter.dispatch(), the same choke
// point Governance/State/Metrics/Lineage are all wired into) and
// reports real aggregate timing -- min/max/avg/p50/p95 end-to-end, and
// per-stage averages pulled from the real MetricsEngine points each run
// already produces, not a second, parallel timing mechanism.

import { OSPipeline } from "../runtime/osPipeline";
import { nucleusMetrics } from "../metrics/metricsEngine";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

const STAGE_NAMES = ["opportunity", "recommendation", "authorization", "execution", "payment"];

export type BenchmarkResult = {
  organizationId: string;
  iterations: number;
  totalDurationMs: number;
  perClaimDurationsMs: number[];
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  perStageAvgMs: Record<string, number>;
  timestamp: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

export class BenchmarkEngine {
  async run(organizationId: string, iterations: number = 10): Promise<BenchmarkResult> {
    const perClaimDurationsMs: number[] = [];
    const stageDurations: Record<string, number[]> = Object.fromEntries(
      STAGE_NAMES.map((s) => [s, []]),
    );

    const overallStart = Date.now();

    for (let i = 0; i < iterations; i++) {
      const claimId = `bench-${organizationId}-${i}-${Date.now()}`;
      const pointsBefore = nucleusMetrics.getPoints(organizationId).length;

      const claimStart = Date.now();
      await OSPipeline.runClaim(organizationId, { claimId, amount: 100 + i });
      perClaimDurationsMs.push(Date.now() - claimStart);

      // Pull this claim's real per-stage dispatch latency straight from
      // the real points RuntimeRouter.dispatch() just recorded via
      // MetricsEngine -- not a separate stopwatch around each stage.
      const newPoints = nucleusMetrics.getPoints(organizationId).slice(pointsBefore);
      for (const point of newPoints) {
        const match = point.name.match(/^dispatch\.(\w+)\.duration_ms$/);
        if (match && stageDurations[match[1]]) {
          stageDurations[match[1]].push(point.value);
        }
      }
    }

    const totalDurationMs = Date.now() - overallStart;
    const sorted = [...perClaimDurationsMs].sort((a, b) => a - b);

    const perStageAvgMs: Record<string, number> = {};
    for (const [stage, durations] of Object.entries(stageDurations)) {
      perStageAvgMs[stage] = average(durations);
    }

    const result: BenchmarkResult = {
      organizationId,
      iterations,
      totalDurationMs,
      perClaimDurationsMs,
      minMs: sorted[0] ?? 0,
      maxMs: sorted[sorted.length - 1] ?? 0,
      avgMs: average(perClaimDurationsMs),
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      perStageAvgMs,
      timestamp: Date.now(),
    };

    console.log(
      `[BENCHMARK] ${iterations} real claims: avg=${result.avgMs.toFixed(1)}ms p95=${result.p95Ms.toFixed(1)}ms min=${result.minMs}ms max=${result.maxMs}ms`,
    );

    nucleusAudit.log(organizationId, "benchmark", "benchmark.run", "benchmark-engine", {
      iterations,
      avgMs: result.avgMs,
      p95Ms: result.p95Ms,
    });

    nucleusBilling.recordEvent(
      organizationId,
      "benchmark",
      "benchmark.run",
      iterations,
      0.001 * iterations, // $0.001 per benchmarked claim
      { avgMs: result.avgMs },
    );

    return result;
  }
}

export const nucleusBenchmark = new BenchmarkEngine();
