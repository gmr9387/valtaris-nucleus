// src/nucleus/api/apiController.ts

import type { Request, Response } from "express";
import { GatewayAdapter } from "../subsystems/gateway/gatewayAdapter";
import { OSPipeline } from "../runtime/osPipeline";
import { RuntimeRouter } from "../runtime/runtimeRouter";
import { DecisionEngine } from "../decision/engine";
import { NucleusDBBridge } from "../db/nucleusDBBridge";
import { startWorkflow } from "../../lib/workflows/runtime";
import type { SubsystemId } from "../subsystems/subsystemRegistry";

const VALID_DISPATCH_SUBSYSTEMS: readonly SubsystemId[] = [
  "weaver",
  "guardian",
  "glue",
  "dualpay",
  "telemetry",
];

/**
 * Supabase's PostgrestError (thrown by getLineage/getTelemetry below on
 * a query failure) is a plain {message, details, hint, code} object,
 * not `instanceof Error` -- `err instanceof Error ? err.message :
 * String(err)` degrades it to the useless literal string
 * "[object Object]" instead of the real message. Confirmed by actually
 * booting this server and hitting these routes, not just typechecking
 * them.
 */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message);
  return String(err);
}

export class APIController {
  /**
   * POST /claim
   * Main entrypoint for external organizations.
   */
  static async submitClaim(req: Request, res: Response) {
    try {
      const { organizationId, claimPayload } = req.body;

      if (!organizationId || !claimPayload) {
        return res.status(400).json({
          error: "organizationId and claimPayload are required",
        });
      }

      // Step 1 — Gateway normalization
      const gatewayPayload = GatewayAdapter.ingress(organizationId, claimPayload);

      // Step 2 — OS pipeline execution
      // FIXED: runClaimFromGateway() is async (it awaits Guardian's real
      // Supabase accumulator lookup). Without awaiting it here, `result`
      // was the pending Promise object itself, not the pipeline's
      // output -- res.json() would serialize it to `{}`, silently
      // discarding the entire adjudication result on every real request.
      const result = await OSPipeline.runClaimFromGateway(gatewayPayload);

      return res.status(200).json(result);
    } catch (err: unknown) {
      return res.status(500).json({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * POST /nucleus/workflow/run
   *
   * FIXED: earlier drafts of the README documented this route as part
   * of the API surface, but it never existed -- the only real workflow
   * entrypoint was the CLI (`nucleus run workflow.json`), which reads a
   * file off disk and calls lib/workflows/runtime.ts's startWorkflow().
   * This is that same real call, over HTTP, so a workflow run doesn't
   * require filesystem access to this process.
   */
  static async runWorkflow(req: Request, res: Response) {
    try {
      const { organizationId, workflowId, versionId } = req.body;

      if (!organizationId || !workflowId || !versionId) {
        return res.status(400).json({
          error: "organizationId, workflowId, and versionId are required",
        });
      }

      const run = await startWorkflow({
        organization_id: organizationId,
        workflow_id: workflowId,
        version_id: versionId,
      });

      return res.status(200).json(run);
    } catch (err: unknown) {
      return res.status(500).json({
        error: "Failed to start workflow",
        details: errorMessage(err),
      });
    }
  }

  /**
   * POST /nucleus/subsystem/dispatch
   *
   * Generic dispatch into any registered subsystem/contract stage --
   * the same RuntimeRouter.dispatch() OSPipeline itself calls for each
   * of the five real claim stages, exposed directly rather than only
   * reachable as a side effect of POST /claim. Subject to the same
   * real enforcement RuntimeRouter always applies: enabled-subsystem
   * check, governed handle(), and output contract validation.
   */
  static async dispatchSubsystem(req: Request, res: Response) {
    try {
      const { subsystem, contractName, payload, contractVersion } = req.body;

      if (!subsystem || !contractName) {
        return res.status(400).json({
          error: "subsystem and contractName are required",
        });
      }

      if (!VALID_DISPATCH_SUBSYSTEMS.includes(subsystem)) {
        return res.status(400).json({
          error: `Unknown subsystem "${subsystem}"`,
          validSubsystems: VALID_DISPATCH_SUBSYSTEMS,
        });
      }

      const result = await RuntimeRouter.dispatch(
        subsystem as SubsystemId,
        contractName,
        payload ?? {},
        contractVersion,
      );

      return res.status(200).json(result);
    } catch (err: unknown) {
      return res.status(400).json({
        error: "Dispatch failed",
        details: errorMessage(err),
      });
    }
  }

  /**
   * GET /nucleus/lineage/:org
   * Same real query the CLI's `nucleus lineage <org>` command runs
   * (src/nucleus/cli/commands/lineage.ts) against the real
   * nucleus_lineage table, over HTTP instead of the filesystem/console.
   */
  static async getLineage(req: Request, res: Response) {
    try {
      const org = req.params.org;
      const db = new NucleusDBBridge();
      const { data, error } = await db
        .getClient()
        .from("nucleus_lineage")
        .select("*")
        .eq("organization_id", org)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({ organizationId: org, lineage: data ?? [] });
    } catch (err: unknown) {
      return res.status(500).json({
        error: "Failed to load lineage",
        details: errorMessage(err),
      });
    }
  }

  /**
   * GET /nucleus/telemetry/:org
   * Same real query the CLI's `nucleus telemetry <org>` command runs
   * (src/nucleus/cli/commands/telemetry.ts) against the real
   * nucleus_telemetry table.
   */
  static async getTelemetry(req: Request, res: Response) {
    try {
      const org = req.params.org;
      const db = new NucleusDBBridge();
      const { data, error } = await db
        .getClient()
        .from("nucleus_telemetry")
        .select("*")
        .eq("organization_id", org)
        .order("timestamp", { ascending: false });

      if (error) throw error;

      return res.status(200).json({ organizationId: org, telemetry: data ?? [] });
    } catch (err: unknown) {
      return res.status(500).json({
        error: "Failed to load telemetry",
        details: errorMessage(err),
      });
    }
  }

  /**
   * POST /nucleus/decision/evaluate
   * Same real DecisionEngine the CLI's `nucleus decision context.json`
   * command exercises, and the same one OSPipeline now calls for every
   * real claim (see osPipeline.ts) -- no longer a hardcoded
   * {allowed: true, confidence: 0.9}.
   */
  static async evaluateDecision(req: Request, res: Response) {
    try {
      const { organizationId, subsystem, context } = req.body;

      if (!organizationId || !subsystem) {
        return res.status(400).json({
          error: "organizationId and subsystem are required",
        });
      }

      const engine = new DecisionEngine(organizationId, subsystem);
      const result = engine.evaluate(context ?? {});

      return res.status(200).json(result);
    } catch (err: unknown) {
      return res.status(500).json({
        error: "Decision evaluation failed",
        details: errorMessage(err),
      });
    }
  }
}
