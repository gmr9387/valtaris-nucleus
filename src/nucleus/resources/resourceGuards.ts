// Phase 20 — Resource Guards

import { ResourceState } from "./resourceState";
import { ResourceIdentity } from "./resourceIdentity";

export function enforceResourceGuards(resource: ResourceState, identity: ResourceIdentity) {
  if (resource.identity.tenantId !== identity.tenantId) {
    throw new Error("Tenant boundary violation");
  }

  if (resource.identity.environmentId !== identity.environmentId) {
    throw new Error("Environment boundary violation");
  }

  if (resource.identity.projectId !== identity.projectId) {
    throw new Error("Project boundary violation");
  }

  if (resource.identity.subsystem !== identity.subsystem) {
    throw new Error("Subsystem boundary violation");
  }

  if (resource.identity.capability !== identity.capability) {
    throw new Error("Capability boundary violation");
  }
}
