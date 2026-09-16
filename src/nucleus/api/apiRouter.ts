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

router.get("/openapi.json", (_req, res) => {
  res.status(200).json(nucleusOpenApi.generate());
});

export { router as APIRouter };
