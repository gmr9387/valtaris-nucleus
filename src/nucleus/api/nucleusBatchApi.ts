// src/nucleus/api/nucleusBatchApi.ts
//
// Batches multiple contract emissions through the same NucleusApi
// permission/chain rules, respecting RuntimeConfig.maxBatchSize, and
// records lightweight per-emit timing samples for smoke/perf checks.

import { NucleusApi, type ContractName } from "./nucleusApi";
import { RuntimeConfig } from "../runtime/runtimeConfig";

export interface BatchItem {
  name: ContractName;
  version: string;
  payload: any;
}

export interface BatchSample {
  contractName: ContractName;
  durationMs: number;
  at: number;
}

export class NucleusBatchApi {
  private api: NucleusApi;
  private samples: BatchSample[] = [];

  constructor(subsystem: string, organizationId: string) {
    this.api = new NucleusApi(subsystem, organizationId);
  }

  emitBatch(items: BatchItem[]): { ok: boolean } {
    const { maxBatchSize } = RuntimeConfig.get();
    if (items.length > maxBatchSize) {
      throw new Error(
        `Batch size ${items.length} exceeds configured maxBatchSize ${maxBatchSize}.`,
      );
    }

    for (const item of items) {
      const start = Date.now();
      this.api.emit(item.name, item.version, item.payload);
      this.samples.push({
        contractName: item.name,
        durationMs: Date.now() - start,
        at: Date.now(),
      });
    }

    return { ok: true };
  }

  metrics(): BatchSample[] {
    return [...this.samples];
  }
}
