// Phase 45 — Legacy Adapter Registry

import { ExternalContractAdapter } from "../adapter/externalContractAdapter";
import { ExternalEventAdapter } from "../adapter/externalEventAdapter";
import { ExternalIdentityAdapter } from "../adapter/externalIdentityAdapter";

import { SubsystemContractAdapter } from "../adapter/subsystemContractAdapter";
import { SubsystemEventAdapter } from "../adapter/subsystemEventAdapter";
import { SubsystemIdentityAdapter } from "../adapter/subsystemIdentityAdapter";

export const legacyAdapterRegistry: Record<string, unknown> = {
  "legacy.externalContractAdapter": ExternalContractAdapter,
  "legacy.externalEventAdapter": ExternalEventAdapter,
  "legacy.externalIdentityAdapter": ExternalIdentityAdapter,

  "legacy.subsystemContractAdapter": SubsystemContractAdapter,
  "legacy.subsystemEventAdapter": SubsystemEventAdapter,
  "legacy.subsystemIdentityAdapter": SubsystemIdentityAdapter,
};
