// services/platform/platformService.ts
// Platform Service — orchestrates all Valtaris services.

import { randomUUID } from "crypto";

import { valtarisIdentityService } from "../identity/identityService";
import { valtarisPaymentsService } from "../payments/paymentsService";
import { valtarisWorkflowService } from "../workflows/workflowService";
import { valtarisDecisionService } from "../decisions/decisionService";
import { valtarisGovernanceService } from "../governance/governanceService";
import { valtarisMessagingService } from "../messaging/messagingService";
import { valtarisDataService } from "../data/dataService";
import { valtarisComputeService } from "../compute/computeService";
import { valtarisMonitoringService } from "../monitoring/monitoringService";
import { valtarisSecurityService } from "../security/securityService";

export class PlatformService {
  services = {
    identity: valtarisIdentityService,
    payments: valtarisPaymentsService,
    workflows: valtarisWorkflowService,
    decisions: valtarisDecisionService,
    governance: valtarisGovernanceService,
    messaging: valtarisMessagingService,
    data: valtarisDataService,
    compute: valtarisComputeService,
    monitoring: valtarisMonitoringService,
    security: valtarisSecurityService,
  };

  async listServices() {
    return Object.keys(this.services);
  }

  async getService(name: string) {
    return this.services[name] ?? null;
  }

  async health(org: string) {
    return valtarisMonitoringService.health(org);
  }
}

export const valtarisPlatformService = new PlatformService();
