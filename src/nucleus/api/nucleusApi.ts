// src/nucleus/api/nucleusApi.ts
//
// Constitutional contract-chain API: opportunity -> recommendation ->
// authorization -> execution -> payment. Each stage is owned by exactly
// one subsystem (Weaver: opportunity/recommendation, Guardian:
// authorization, Glue: execution, DualPay: payment) -- emit() enforces
// that boundary, cross-references the chain so execution/payment can't
// silently diverge from what was authorized/executed, and lineage()/
// finalize() let a subsystem inspect or close out the chain once built.
//
// This restores the shape every live per-stage runtime
// (src/nucleus/subsystems/contracts/*Runtime.ts) and the constitutional
// test suite (src/nucleus/tests/*.test.ts) already assume -- both call
// `new NucleusApi(subsystemName, organizationId)` and
// `.emit()`/`.lineage()`/`.finalize()`. A prior refactor replaced this
// class with an unrelated Express route binder that nothing on the live
// path actually instantiated.

import { lineageEngine } from "../lineage/lineageEngine";
import type { NucleusEvent } from "../events/nucleusEvent";

export type ContractName =
  "opportunity" | "recommendation" | "authorization" | "execution" | "payment";

const CHAIN_ORDER: ContractName[] = [
  "opportunity",
  "recommendation",
  "authorization",
  "execution",
  "payment",
];

const SUBSYSTEM_PERMISSIONS: Record<string, ContractName[]> = {
  weaver: ["opportunity", "recommendation"],
  guardian: ["authorization"],
  glue: ["execution"],
  dualpay: ["payment"],
};

export interface ChainRecord {
  opportunity?: any;
  recommendation?: any;
  authorization?: any;
  execution?: any;
  payment?: any;
}

// Keyed by organizationId. Module-level so every NucleusApi instance for
// the same org shares one chain, matching how the real runtimes each
// construct their own short-lived NucleusApi per request.
const chains = new Map<string, ChainRecord>();

export class NucleusApi {
  constructor(
    private subsystem: string,
    private organizationId: string,
  ) {}

  emit(contractName: ContractName, version: string, payload: any): void {
    const allowed = SUBSYSTEM_PERMISSIONS[this.subsystem];
    if (!allowed || !allowed.includes(contractName)) {
      throw new Error(
        `Subsystem "${this.subsystem}" is not permitted to emit the "${contractName}" contract.`,
      );
    }

    const chain = chains.get(this.organizationId) ?? {};
    chains.set(this.organizationId, chain);

    if (contractName === "execution" && chain.authorization) {
      const authorizedType = chain.authorization.payload?.executionType;
      if (authorizedType !== undefined && payload?.executionType !== authorizedType) {
        throw new Error(
          `Execution type "${payload?.executionType}" does not match the authorized executionType "${authorizedType}".`,
        );
      }
    }

    if (contractName === "payment" && chain.execution) {
      const executedAmount = chain.execution.payload?.amount;
      if (executedAmount !== undefined && payload?.amount !== executedAmount) {
        throw new Error(
          `Payment amount ${payload?.amount} does not match the executed amount ${executedAmount}.`,
        );
      }
    }

    chain[contractName] = payload;

    lineageEngine.recordEvent(
      {
        type: contractName,
        version,
        payload,
        source: this.subsystem,
        context: { organizationId: this.organizationId } as unknown as NucleusEvent["context"],
        timestamp: new Date().toISOString(),
      },
      payload?.id,
      contractName,
    );
  }

  lineage(): ChainRecord {
    const chain = chains.get(this.organizationId);
    if (!chain || !chain.opportunity) {
      throw new Error(
        `No constitutional lineage recorded for organization "${this.organizationId}".`,
      );
    }
    return chain;
  }

  finalize(): { ok: boolean } {
    const chain = this.lineage();
    const missing = CHAIN_ORDER.filter((stage) => !chain[stage]);
    if (missing.length > 0) {
      throw new Error(
        `Cannot finalize organization "${this.organizationId}": missing stage(s) [${missing.join(", ")}].`,
      );
    }
    return { ok: true };
  }
}
