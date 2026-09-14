// Phase 34 — Nucleus Constitution v1.0

export interface ConstitutionalSubsystem {
  name: string;
  capabilities: string[];
}

export interface ConstitutionalContract {
  name: string;
  version: string;
  subsystem: string;
  capability: string;
  resources: string[];
}

export interface ConstitutionalResource {
  type: string;
  subsystem: string;
  capability: string;
}

export interface ConstitutionalIdentityBoundary {
  tenant: boolean;
  environment: boolean;
  project: boolean;
  subsystem: boolean;
  capability: boolean;
  actor: boolean;
}

export interface NucleusConstitution {
  version: string;

  subsystems: ConstitutionalSubsystem[];
  contracts: ConstitutionalContract[];
  resources: ConstitutionalResource[];

  identityBoundary: ConstitutionalIdentityBoundary;

  description: string;
}

export const constitution: NucleusConstitution = {
  version: "1.0.0",

  description:
    "The Nucleus Constitution defines the identity boundaries, subsystem capabilities, contract bindings, resource bindings, and enforcement rules that govern the Valtaris Nucleus runtime.",

  subsystems: [
    { name: "weaver", capabilities: ["discover", "evaluate", "propose"] },
    { name: "guardian", capabilities: ["authorize", "validate", "guard"] },
    { name: "glue", capabilities: ["bind", "orchestrate", "coordinate"] },
    { name: "dualpay", capabilities: ["charge", "settle", "reconcile"] },
  ],

  contracts: [
    {
      name: "OpportunityProposed",
      version: "1.0.0",
      subsystem: "weaver",
      capability: "propose",
      resources: ["OpportunityResource"],
    },
    {
      name: "AuthorizationRequested",
      version: "1.0.0",
      subsystem: "guardian",
      capability: "authorize",
      resources: ["AuthorizationResource"],
    },
    {
      name: "WorkflowBound",
      version: "1.0.0",
      subsystem: "glue",
      capability: "bind",
      resources: ["WorkflowResource"],
    },
    {
      name: "PaymentInitiated",
      version: "1.0.0",
      subsystem: "dualpay",
      capability: "charge",
      resources: ["PaymentResource"],
    },
  ],

  resources: [
    { type: "OpportunityResource", subsystem: "weaver", capability: "discover" },
    { type: "AuthorizationResource", subsystem: "guardian", capability: "authorize" },
    { type: "WorkflowResource", subsystem: "glue", capability: "bind" },
    { type: "PaymentResource", subsystem: "dualpay", capability: "charge" },
  ],

  identityBoundary: {
    tenant: true,
    environment: true,
    project: true,
    subsystem: true,
    capability: true,
    actor: true,
  },
};

/**
 * Validates the constitution's internal consistency: every contract's
 * subsystem/capability must be declared on that subsystem, every
 * contract's resource references must exist in the resource list, and
 * every resource's subsystem/capability must likewise be declared.
 * Throws with the specific violation rather than returning a boolean,
 * since a broken constitution should stop pipeline boot, not degrade
 * silently.
 */
export function enforceConstitution(c: NucleusConstitution = constitution): { valid: true } {
  const subsystemCapabilities = new Map(c.subsystems.map((s) => [s.name, new Set(s.capabilities)]));
  const resourceTypes = new Set(c.resources.map((r) => r.type));

  for (const contract of c.contracts) {
    const capabilities = subsystemCapabilities.get(contract.subsystem);
    if (!capabilities) {
      throw new Error(
        `Constitution violation: contract "${contract.name}" references unknown subsystem "${contract.subsystem}"`,
      );
    }
    if (!capabilities.has(contract.capability)) {
      throw new Error(
        `Constitution violation: contract "${contract.name}" references capability "${contract.capability}" not declared on subsystem "${contract.subsystem}"`,
      );
    }
    for (const resourceType of contract.resources) {
      if (!resourceTypes.has(resourceType)) {
        throw new Error(
          `Constitution violation: contract "${contract.name}" references undeclared resource type "${resourceType}"`,
        );
      }
    }
  }

  for (const resource of c.resources) {
    const capabilities = subsystemCapabilities.get(resource.subsystem);
    if (!capabilities || !capabilities.has(resource.capability)) {
      throw new Error(
        `Constitution violation: resource "${resource.type}" references capability "${resource.capability}" not declared on subsystem "${resource.subsystem}"`,
      );
    }
  }

  return { valid: true };
}
