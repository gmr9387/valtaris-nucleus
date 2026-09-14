/**
 * Adjudication Orchestrator
 *
 * Wraps the real adjudication kernel (@/engine/calculation-engine, which
 * re-exports src/nucleus/subsystems/guardian/adjudication/calculationEngine)
 * with the one guarantee the rest of the app relies on: "replayable" —
 * running the exact same inputs twice must produce the exact same run and
 * trace. Rather than assert that in theory, this actually re-runs the
 * kernel a second time and compares, so a future change to the kernel
 * that quietly introduces non-determinism (a stray Date.now(), Map
 * iteration order, etc.) fails loudly here instead of surfacing as an
 * unreproducible audit trail downstream.
 */
import type {
  Claim,
  MemberAccumulators,
  ContractTerms,
  PlanBenefits,
  PriorPayerOutcome,
  AdjudicationRun,
} from "@/types/claim";
import type { TraceObject } from "@/types/trace";
import { adjudicateClaim } from "@/engine/calculation-engine";

export interface ExecuteAdjudicationInput {
  claim: Claim;
  accumulators: MemberAccumulators;
  contract: ContractTerms;
  plan: PlanBenefits;
  priorOutcomes: PriorPayerOutcome[];
  /** Who/what triggered this run — carried for audit purposes by callers that persist it. */
  actor: string;
}

export interface ExecuteAdjudicationResult {
  run: AdjudicationRun;
  trace: TraceObject;
}

function mapAwareReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return { __map__: Array.from(value.entries()) };
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, mapAwareReplacer);
}

export async function executeAdjudicationWithReplay(
  input: ExecuteAdjudicationInput,
): Promise<ExecuteAdjudicationResult> {
  const options = {
    runId: `run_${input.claim.claim_id}_replay`,
    timestamp: "1970-01-01T00:00:00.000Z",
  };

  const first = adjudicateClaim(
    input.claim.lines,
    input.accumulators,
    input.contract,
    input.plan,
    input.priorOutcomes,
    options,
  );

  const second = adjudicateClaim(
    input.claim.lines,
    input.accumulators,
    input.contract,
    input.plan,
    input.priorOutcomes,
    options,
  );

  const runMatches = stableStringify(first.run) === stableStringify(second.run);
  const traceMatches = stableStringify(first.trace) === stableStringify(second.trace);

  if (!runMatches || !traceMatches) {
    throw new Error(
      `Adjudication for claim ${input.claim.claim_id} is not deterministic: replaying identical inputs produced a different ` +
        `${runMatches ? "" : "run "}${traceMatches ? "" : "trace"}. Refusing to return an unreproducible result.`,
    );
  }

  return { run: first.run, trace: first.trace };
}
