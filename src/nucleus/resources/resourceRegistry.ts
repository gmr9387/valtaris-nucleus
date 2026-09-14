// Phase 20 — Resource Registry
//
// Registers resource *definitions* (canonical shape + invariant +
// validation rules + dependency list for a resource type/version), not
// resource instances -- resourceGraph.ts is the separate, instance-level
// registry (ResourceState objects) that autonomy/, federation/,
// certification/, dashboard/ already use via resourceGraph.getResource()/
// .listResources(). This registry is what connectorResource.ts and its
// four siblings (credential/environment/organization/project) register
// themselves into.

export interface ResourceValidationResult {
  ok: boolean;
  errors?: string[];
}

export interface ResourceDefinition<T = any> {
  type: string;
  version: string;
  invariant: (resource: T) => boolean;
  validate: (resource: T) => ResourceValidationResult;
  dependencies: string[];
}

const registry = new Map<string, ResourceDefinition>();

function key(type: string, version: string): string {
  return `${type}@${version}`;
}

export function registerResource(resource: ResourceDefinition): void {
  registry.set(key(resource.type, resource.version), resource);
}

export function getResourceDefinition(type: string, version: string): ResourceDefinition | undefined {
  return registry.get(key(type, version));
}

export function listResourceDefinitions(): ResourceDefinition[] {
  return [...registry.values()];
}

export function validateResource(type: string, version: string, payload: any): ResourceValidationResult {
  const definition = getResourceDefinition(type, version);
  if (!definition) {
    return { ok: false, errors: [`No resource definition registered for ${type}@${version}.`] };
  }
  if (!definition.invariant(payload)) {
    return { ok: false, errors: [`${type}@${version} failed its invariant check.`] };
  }
  return definition.validate(payload);
}
