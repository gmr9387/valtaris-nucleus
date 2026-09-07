import { NucleusWorkflowAdapter } from "../../nucleus/workflows/NucleusWorkflowAdapter";

const adapter = new NucleusWorkflowAdapter();

/**
 * Start a workflow run
 */
export async function startWorkflow(params: {
  organizationId: string;
  workflowId: string;
  input: any;
}) {
  return adapter.startWorkflow(params);
}

/**
 * Complete a workflow run
 */
export async function completeWorkflow(params: {
  organizationId: string;
  runId: string;
  output: any;
}) {
  return adapter.completeWorkflow(params);
}

/**
 * Fail a workflow run
 */
export async function failWorkflow(params: {
  organizationId: string;
  runId: string;
  reason: string;
}) {
  return adapter.failWorkflow(params);
}

/**
 * Cancel a workflow run
 */
export async function cancelWorkflow(params: {
  organizationId: string;
  runId: string;
  reason?: string;
}) {
  return adapter.cancelWorkflow(params);
}

/**
 * Start a workflow step
 */
export async function startStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  input: any;
}) {
  return adapter.startStep(params);
}

/**
 * Complete a workflow step
 */
export async function completeStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  output: any;
}) {
  return adapter.completeStep(params);
}

/**
 * Fail a workflow step
 */
export async function failStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  reason: string;
}) {
  return adapter.failStep(params);
}
