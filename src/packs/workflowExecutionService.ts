// Strict. Aligned. No drift. No overengineering.

import path from "path";
import fs from "fs";
import { WorkflowManifest } from "./workflowManifest";
import { loadWorkflowManifest } from "./workflowLoader";

export type WorkflowExecutionResult =
  | { status: "success"; output: any }
  | { status: "error"; error: string };

const loadWorkflowModule = (workflowPath: string, moduleName: string) => {
  const modulePath = path.join(workflowPath, moduleName);

  if (!fs.existsSync(modulePath)) {
    throw new Error(`Workflow module not found: ${modulePath}`);
  }

  return require(modulePath);
};

export const executeWorkflow = async (params: {
  workflowsRoot: string;
  workflowFolder: string;
  input: any;
}): Promise<WorkflowExecutionResult> => {
  try {
    const workflowPath = path.join(params.workflowsRoot, params.workflowFolder);

    // 1. Load manifest
    const manifest: WorkflowManifest = loadWorkflowManifest(workflowPath);

    // 2. Load main workflow module
    const workflowModule = loadWorkflowModule(workflowPath, "index.js");

    // 3. Execute workflow
    const output = await workflowModule.run({
      input: params.input,
      steps: manifest.steps,
    });

    return {
      status: "success",
      output,
    };
  } catch (err: any) {
    return {
      status: "error",
      error: err.message,
    };
  }
};
