// Phase 35 — Resource Partition Map

import { constitution } from "../constitution/constitution";

export interface ResourcePartition {
  resourceType: string;
  tenantPartition: boolean;
  environmentPartition: boolean;
  projectPartition: boolean;
}

export const resourcePartitionMap: ResourcePartition[] = constitution.resources.map((r) => ({
  resourceType: r.type,
  tenantPartition: true,
  environmentPartition: true,
  projectPartition: true,
}));
