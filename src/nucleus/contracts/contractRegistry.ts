// Phase 26 — Contract Registry (Constitutional)

import { ContractDefinition, ContractValidationResult } from "./contractDefinition";

export type { ContractDefinition, ContractValidationResult };

const registry = new Map<string, ContractDefinition>();

export function registerContract(def: ContractDefinition) {
  const key = `${def.name}@${def.version}`;
  registry.set(key, def);
}

export function getContract(name: string, version: string): ContractDefinition | undefined {
  const key = `${name}@${version}`;
  return registry.get(key);
}

export function validateContract(
  name: string,
  version: string,
  payload: unknown,
  subsystem?: string,
  capability?: string,
): ContractValidationResult {
  const def = getContract(name, version);

  if (!def) {
    return { ok: false, errors: [`Unknown contract: ${name}@${version}`] };
  }

  const errors: string[] = [];

  // Subsystem/capability binding only applies to contracts that declare it.
  if (subsystem !== undefined && def.subsystem !== undefined && def.subsystem !== subsystem) {
    errors.push(`Subsystem mismatch: expected ${def.subsystem}, got ${subsystem}`);
  }

  if (capability !== undefined && def.capability !== undefined && def.capability !== capability) {
    errors.push(`Capability mismatch: expected ${def.capability}, got ${capability}`);
  }

  if (def.validatePayload && !def.validatePayload(payload)) {
    errors.push(`Payload validation failed for ${name}@${version}`);
  }

  if (def.invariant && !def.invariant(payload)) {
    errors.push(`${name}@${version} failed its invariant check.`);
  }

  if (def.validate) {
    const result = def.validate(payload);
    if (!result.ok) {
      errors.push(...(result.errors ?? [`${name}@${version} failed validation.`]));
    }
  }

  return {
    ok: errors.length === 0,
    errors: errors.length ? errors : undefined,
  };
}
