/**
 * Runtime event utilities for the Valtaris ecosystem.
 * These helpers provide deterministic event envelopes,
 * metadata structures, and dispatch helpers used across
 * all runtimes.
 */

export interface RuntimeEventMetadata {
  context?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export interface RuntimeEventEnvelope {
  id: string;
  type: string;
  source: string; // workflow, decision, reimbursement, connector, runtime
  timestamp: string;
  metadata: RuntimeEventMetadata;
}

export class RuntimeEvent {
  static create(
    type: string,
    source: string,
    metadata: RuntimeEventMetadata = {},
  ): RuntimeEventEnvelope {
    return {
      id: crypto.randomUUID(),
      type,
      source,
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  static dispatch(
    handler: (event: RuntimeEventEnvelope) => Promise<void>,
    event: RuntimeEventEnvelope,
  ): Promise<void> {
    return handler(event);
  }
}
