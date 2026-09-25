// Adversarial coverage for RuntimeRouter's Guardian-provenance check
// (see runtimeRouter.ts's GUARDIAN_GATED_STAGES / enforceGuardianProvenance).
//
// Before this check existed, glueRuntime.ts's handleExecution() and
// dualPayRuntime.ts's payment handler both just trusted whatever
// `authorization` object arrived in their payload -- nothing verified it
// actually came from a real guardian.authorization dispatch for that
// claim. executionContract.ts's own validate() didn't catch this either:
// it only checks internal consistency ("executed" requires
// authorization.decision === "allow"), which a fabricated
// { decision: "allow" } satisfies trivially. This is the attack
// docs/adr/006-four-subsystem-authority-split.md names in its Failure
// modes section as unproven; these tests prove the fix.

import { describe, it, expect } from "vitest";
import { RuntimeRouter } from "../runtime/runtimeRouter";
import { OSPipeline } from "../runtime/osPipeline";

describe("RuntimeRouter — Guardian boundary enforcement (Law 6)", () => {
  it("rejects glue.execution carrying a fabricated authorization with no real Guardian dispatch behind it", async () => {
    await expect(
      RuntimeRouter.dispatch("glue", "execution", {
        claimId: "forged-claim-no-guardian-run",
        organizationId: "org-boundary-test",
        authorization: {
          decision: "allow",
          reason: "fabricated",
          timestamp: Date.now(),
          adjudication: {
            status: "adjudicated",
            allowed: 999999,
            plan_paid: 999999,
            member_responsibility: 0,
            deductible_applied: 0,
            coinsurance: 0,
          },
        },
        opportunity: {},
        recommendation: {},
      }),
    ).rejects.toThrow(/boundary violation/i);
  });

  it("rejects a forged authorization for a claimId that DID go through Guardian, once the forgery diverges from the real result", async () => {
    const organizationId = "org-boundary-test-2";
    const claimPayload = { claimId: "claim-real-then-forged", amount: 500 };

    // Real run: this genuinely dispatches guardian.authorization first,
    // recording the real result under this claimId's provenance key.
    const realResult = await OSPipeline.runClaim(organizationId, claimPayload);
    expect(realResult.authorization).toBeDefined();

    // Attacker now tries to replay the same real claimId but with a more
    // generous, hand-built authorization instead of the real one --
    // e.g. forcing "allow" with a larger paid amount than Guardian
    // actually authorized.
    await expect(
      RuntimeRouter.dispatch("glue", "execution", {
        claimId: claimPayload.claimId,
        organizationId,
        authorization: {
          decision: "allow",
          reason: "forged override",
          timestamp: Date.now(),
          adjudication: {
            status: "adjudicated",
            allowed: 999999,
            plan_paid: 999999,
            member_responsibility: 0,
            deductible_applied: 0,
            coinsurance: 0,
          },
        },
        opportunity: realResult.opportunity,
        recommendation: realResult.recommendation,
      }),
    ).rejects.toThrow(/boundary violation/i);
  });

  it("allows glue.execution when payload.authorization is exactly the real Guardian dispatch result for that claim", async () => {
    const organizationId = "org-boundary-test-3";
    const claimPayload = { claimId: "claim-real-replay", amount: 500 };

    const realResult = await OSPipeline.runClaim(organizationId, claimPayload);

    // Re-dispatching glue.execution for the SAME claim with the SAME
    // (unmodified) authorization object the real pipeline produced must
    // succeed -- this is the legitimate case the check must not break.
    await expect(
      RuntimeRouter.dispatch("glue", "execution", {
        claimId: claimPayload.claimId,
        organizationId,
        authorization: realResult.authorization,
        opportunity: realResult.opportunity,
        recommendation: realResult.recommendation,
      }),
    ).resolves.toBeDefined();
  });
});
