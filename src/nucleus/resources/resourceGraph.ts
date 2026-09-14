// Phase 20 — Resource Graph Implementation

import { ResourceState } from "./resourceState";
import { ResourceIdentity } from "./resourceIdentity";
import { enforceResourceGuards } from "./resourceGuards";

export class ResourceGraph {
  private resources = new Map<string, ResourceState>();

  createResource<T>(
    id: string,
    type: string,
    identity: ResourceIdentity,
    initial: T
  ): ResourceState<T> {
    const now = new Date().toISOString();

    const resource: ResourceState<T> = {
      id,
      type,
      identity,
      data: initial,
      createdAt: now,
      updatedAt: now,
    };

    this.resources.set(id, resource);
    return resource;
  }

  mutateResource<T>(
    id: string,
    identity: ResourceIdentity,
    mutator: (data: T) => T
  ): ResourceState<T> {
    const resource = this.resources.get(id);
    if (!resource) throw new Error(`Resource not found: ${id}`);

    enforceResourceGuards(resource, identity);

    const newData = mutator(resource.data as T);

    resource.data = newData;
    resource.updatedAt = new Date().toISOString();

    return resource as ResourceState<T>;
  }

  getResource(id: string): ResourceState | undefined {
    return this.resources.get(id);
  }

  listResources(): ResourceState[] {
    return [...this.resources.values()];
  }
}

export const resourceGraph = new ResourceGraph();
