// Strict. Aligned. No drift. No overengineering.

export type WorkflowManifest = {
  workflow_id: string;
  workflow_name: string;
  workflow_version: string;
  workflow_description: string;
  steps: string[];
  inputs: Record<string, string>;
};

export const validateWorkflowManifest = (manifest: WorkflowManifest) => {
  if (!manifest.workflow_id) throw new Error("workflow_id missing");
  if (!manifest.workflow_name) throw new Error("workflow_name missing");
  if (!manifest.workflow_version) throw new Error("workflow_version missing");

  if (!Array.isArray(manifest.steps)) {
    throw new Error("steps must be array");
  }

  if (typeof manifest.inputs !== "object") {
    throw new Error("inputs must be an object");
  }

  return true;
};
