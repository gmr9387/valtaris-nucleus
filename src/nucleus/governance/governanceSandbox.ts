// src/nucleus/governance/governanceSandbox.ts
//
// gapMap.md's Guardian gap "Governance sandbox (rule validation +
// isolation)" -- unlike the other gaps closed this session, there was
// no fully-built-but-disconnected module to wire in here; this concept
// didn't exist anywhere in the codebase. "Isolation" is the load-bearing
// word: a sandbox has to let you try a candidate rule against real data
// without it becoming a real decision -- no write to GovernanceEngine's
// own decisions array, no audit log entry, no billing charge. Getting
// that wrong (e.g. by routing through GovernanceEngine.enforce()) would
// silently corrupt the exact real governance history RuntimeGuards
// relies on.
//
// "Validation" against synthetic made-up payloads would be a much
// weaker sandbox than what's actually available: GovernanceEngine.
// getDecisions() already holds the real payloads every real dispatch
// this session recorded. replay() runs a candidate rule against that
// real history and reports where it would have decided differently --
// "if I tightened this rule, which real past claims would have been
// denied" -- using real data, without touching it.

import { nucleusGovernance, type GovernanceDecision } from "./governanceEngine";
import type { Dynamic } from "../types/dynamic";

export type SandboxRuleCandidate = {
  name: string;
  evaluate: (payload: Dynamic) => boolean;
};

export type SandboxReplayResult = {
  decisionId: string;
  org: string;
  subsystem: string;
  originalAllowed: boolean;
  candidateAllowed: boolean;
  changed: boolean;
};

export class GovernanceSandbox {
  replay(
    candidate: SandboxRuleCandidate,
    decisions: GovernanceDecision[] = nucleusGovernance.getDecisions(),
  ): SandboxReplayResult[] {
    return decisions.map((decision) => {
      const candidateAllowed = candidate.evaluate(decision.payload);

      return {
        decisionId: decision.id,
        org: decision.org,
        subsystem: decision.subsystem,
        originalAllowed: decision.allowed,
        candidateAllowed,
        changed: candidateAllowed !== decision.allowed,
      };
    });
  }
}

export const governanceSandbox = new GovernanceSandbox();
