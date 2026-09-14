// Phase 26 — Contract Definition
//
// Two designs have accreted onto this one interface: the original
// subsystem/capability/resources-bound shape (still used by
// validateContract() below and its adapter/runtimeGuards callers), and
// the invariant/validate/compatibleWith shape every real
// src/nucleus/contracts/*Contract.ts file actually builds. Both are
// optional here rather than picking one, since real callers depend on
// each independently -- see runtimeGuards.ts's own stopgap comment for
// why the two were never reconciled.

export interface ContractValidationResult {
  ok: boolean;
  errors?: string[];
}

export interface ContractDefinition {
  name: string;
  version: string;

  subsystem?: "weaver" | "guardian" | "glue" | "dualpay";
  capability?: string;
  resources?: string[];
  validatePayload?: (payload: unknown) => boolean;

  invariant?: (payload: any) => boolean;
  validate?: (payload: any) => ContractValidationResult;
  compatibleWith?: string[];
}
