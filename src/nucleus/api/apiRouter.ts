// src/nucleus/api/apiRouter.ts

import express from "express";
import { APIController } from "./apiController";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.post("/claim", APIController.submitClaim);

export { router as APIRouter };
