// Phase 38 — Tenant Registry

import { federationManifest } from "./federationManifest";

export interface TenantState {
  tenantId: string;
  active: boolean;
  createdAt: string;
}

export const tenantRegistry: Record<string, TenantState> = Object.fromEntries(
  federationManifest.tenants.map((tenant) => [
    tenant,
    {
      tenantId: tenant,
      active: true,
      createdAt: new Date().toISOString(),
    },
  ]),
);
