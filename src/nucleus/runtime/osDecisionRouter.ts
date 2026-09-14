// src/nucleus/runtime/osDecisionRouter.ts

/**
 * OSDecisionRouter (Phase 15)
 *
 * Pure router: routes claims into OSWorkflowEngine.
 * No HTTP. No transport. No external dependencies.
 */

import { OSWorkflowEngine } from "./osWorkflowEngine";
import type { Dynamic } from "../types/dynamic";

export class OSDecisionRouter {
  static routeClaim(organizationId: string, claimPayload: Record<string, Dynamic>) {
    return OSWorkflowEngine.processClaim(organizationId, claimPayload);
  }
}
