// Strict. Aligned. No drift. No overengineering.

import fs from "fs";
import path from "path";
import { WorkflowManifest, validateWorkflowManifest } from "./workflowManifest";

export const loadWorkflowManifest = (workflowPath: string): WorkflowManifest => {
  const manifestPath = path.join(workflowPath, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Workflow manifest not found at ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);

  validateWorkflowManifest(manifest);

  return manifest;
};

export const loadAllWorkflows = (workflowsRoot: string): WorkflowManifest[] => {
  const dirs = fs.readdirSync(workflowsRoot, { withFileTypes: true });

  const workflows: WorkflowManifest[] = [];

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const workflowPath = path.join(workflowsRoot, dir.name);

    try {
      const manifest = loadWorkflowManifest(workflowPath);
      workflows.push(manifest);
    } catch (err) {
      console.error(`Failed to load workflow ${dir.name}:`, err);
    }
  }

  return workflows;
};
