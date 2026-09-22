// src/nucleus/api/apiRouter.ts

import express from "express";
import { APIController } from "./apiController";
import { nucleusOpenApi } from "./openApiGenerator";
import { getInternalStatus } from "./internalStatusController";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.post("/claim", APIController.submitClaim);

// FIXED: earlier drafts of the README documented a /nucleus/* route
// surface (workflow/run, subsystem/dispatch, lineage/:org,
// telemetry/:org, decision/evaluate) that never actually existed --
// every one of the five was aspirational. Each now wraps the same real
// underlying call the CLI already exercises (see apiController.ts's
// header comment on each handler for the exact real counterpart), so
// running a workflow, dispatching a subsystem, or reading real lineage
// /telemetry/decision output no longer requires filesystem access to
// this process's console.
router.post("/nucleus/workflow/run", APIController.runWorkflow);
router.post("/nucleus/subsystem/dispatch", APIController.dispatchSubsystem);
router.get("/nucleus/lineage/:org", APIController.getLineage);
router.get("/nucleus/telemetry/:org", APIController.getTelemetry);
router.post("/nucleus/decision/evaluate", APIController.evaluateDecision);

// internalStatusController.ts (see that file's header) is the first
// real place every engine wired live this session -- Governance,
// Certification, the Constitutional Pipeline/Adapter Registry, Recovery,
// plus the earlier Event Bus/Queue/Scheduler/Retry/State/Metrics work --
// is actually queryable in one response, instead of only visible in
// whichever process's console happened to be running when it fired.
router.get("/internal-status", async (_req, res) => {
  try {
    const status = await getInternalStatus();
    res.status(200).json(status);
  } catch (err: unknown) {
    res.status(500).json({
      error: "Failed to compute internal status",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// api/openApiGenerator.ts (gapMap.md's "Unified OpenAPI documentation",
// #12) was fully built -- register()/generate(), the works -- with zero
// real callers anywhere. Its would-be sibling, api/openai/ (note the
// typo in that folder's own name), was an even more dead duplicate: a
// hand-written spec for a "/contract/{type}/{version}" route that has
// never existed in this router, also with zero callers. Deleted that one
// rather than wire a doc for a route nothing actually serves; this
// registers the two routes this file genuinely mounts and exposes the
// generated spec at /api/openapi.json, so the "docs" are the real routes
// instead of an orphaned guess at them.
nucleusOpenApi.register(
  "GET",
  "/health",
  "api",
  "Liveness check for the Nucleus API process.",
  undefined,
  { type: "object", properties: { status: { type: "string", enum: ["ok"] } } },
);

nucleusOpenApi.register(
  "POST",
  "/claim",
  "api",
  "Main entrypoint for external organizations: submits a claim for gateway normalization and full OSPipeline adjudication (opportunity, recommendation, authorization, execution, payment).",
  {
    type: "object",
    required: ["organizationId", "claimPayload"],
    properties: {
      organizationId: { type: "string" },
      claimPayload: { type: "object" },
    },
  },
  {
    type: "object",
    description:
      "The full adjudication pipeline result: opportunity, recommendation, authorization, execution, and payment stage outputs.",
  },
);

nucleusOpenApi.register(
  "GET",
  "/internal-status",
  "api",
  "Aggregated real-time status of the internal constitutional engine: subsystem health, governance decisions, certification, adapter/pipeline/CI/deployment state, federation nodes, metrics, audit, resources, lineage, and telemetry.",
  undefined,
  {
    type: "object",
    description: "See internalStatusController.ts's getInternalStatus() for the exact shape.",
  },
);

nucleusOpenApi.register(
  "POST",
  "/nucleus/workflow/run",
  "nucleus",
  "Starts a real workflow run (the same call the CLI's `nucleus run workflow.json` command makes).",
  {
    type: "object",
    required: ["organizationId", "workflowId", "versionId"],
    properties: {
      organizationId: { type: "string" },
      workflowId: { type: "string" },
      versionId: { type: "string" },
    },
  },
  { type: "object", description: "The created workflow_runs row." },
);

nucleusOpenApi.register(
  "POST",
  "/nucleus/subsystem/dispatch",
  "nucleus",
  "Dispatches directly into a registered subsystem's contract handler via RuntimeRouter -- the same governed dispatch each of POST /claim's five real stages goes through.",
  {
    type: "object",
    required: ["subsystem", "contractName"],
    properties: {
      subsystem: { type: "string", enum: ["weaver", "guardian", "glue", "dualpay", "telemetry"] },
      contractName: { type: "string" },
      payload: { type: "object" },
      contractVersion: { type: "string" },
    },
  },
  { type: "object", description: "The subsystem's real, contract-validated handler output." },
);

nucleusOpenApi.register(
  "GET",
  "/nucleus/lineage/:org",
  "nucleus",
  "Real lineage rows for an organization from nucleus_lineage -- the same query the CLI's `nucleus lineage <org>` command runs.",
  undefined,
  {
    type: "object",
    properties: { organizationId: { type: "string" }, lineage: { type: "array" } },
  },
);

nucleusOpenApi.register(
  "GET",
  "/nucleus/telemetry/:org",
  "nucleus",
  "Real telemetry rows for an organization from nucleus_telemetry -- the same query the CLI's `nucleus telemetry <org>` command runs.",
  undefined,
  {
    type: "object",
    properties: { organizationId: { type: "string" }, telemetry: { type: "array" } },
  },
);

nucleusOpenApi.register(
  "POST",
  "/nucleus/decision/evaluate",
  "nucleus",
  "Evaluates the real decision engine (governance rules + Weaver/Guardian-signal-derived confidence) against an arbitrary context -- the same engine OSPipeline now calls for every real claim.",
  {
    type: "object",
    required: ["organizationId", "subsystem"],
    properties: {
      organizationId: { type: "string" },
      subsystem: { type: "string" },
      context: { type: "object" },
    },
  },
  {
    type: "object",
    properties: {
      allowed: { type: "boolean" },
      confidence: { type: "number" },
      reasons: { type: "array", items: { type: "string" } },
    },
  },
);

router.get("/openapi.json", (_req, res) => {
  res.status(200).json(nucleusOpenApi.generate());
});

export { router as APIRouter };
