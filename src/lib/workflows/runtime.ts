// src/lib/workflows/runtime.ts

import { NucleusWorkflowAdapter } from "../../nucleus/workflows/nucleusWorkflowAdapter";

const adapter = new NucleusWorkflowAdapter(
  process.env.NUCLEUS_ORG_ID!,
  process.env.NUCLEUS_SUPABASE_URL!,
  process.env.NUCLEUS_SUPABASE_ANON_KEY!
);

export async function startWorkflow(params: {
  organizationId: string;
  workflowId: string;
  input: any;
}) {
  return adapter.handleWorkflowEvent({
    type: "execution",
    version: "1.0.0",
    payload: {
      kind: "workflow.start",
      organizationId: params.organizationId,
      workflowId: params.workflowId,
      input: params.input,
    },
  });
}

export async function completeWorkflow(params: {
  organizationId: string;
  runId: string;
  output: any;
}) {
  return adapter.handleWorkflowEvent({
    type: "execution",
    version: "1.0.0",
    payload: {
      kind: "workflow.complete",
      organizationId: params.organizationId,
      runId: params.runId,
      output: params.output,
    },
  });
}

export async function failWorkflow(params: {
  organizationId: string;
  runId: string;
  reason: string;
}) {
  return adapter.handleWorkflowEvent({
    type: "execution",
    version: "1.0.0",
    payload: {
      kind: "workflow.fail",
      organizationId: params.organizationId,
      runId: params.runId,
      reason: params.reason,
    },
  });
}

export async function cancelWorkflow(params: {
  organizationId: string;
  runId: string;
  reason?: string;
}) {
  return adapter.handleWorkflowEvent({
    type: "execution",
    version: "1.0.0",
    payload: {
      kind: "workflow.cancel",
      organizationId: params.organizationId,
      runId: params.runId,
      reason: params.reason,
    },
  });
}

export async function startStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  input: any;
}) {
  return adapter.handleWorkflowEvent({
    type: "execution",
    version: "1.0.0",
    payload: {
      kind: "step.start",
      organizationId: params.organizationId,
      runId: params.runId,
      stepId: params.stepId,
      input: params.input,
    },
  });
}

export async function completeStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  output: any;
}) {
  return adapter.handleWorkflowEvent({
    type: "execution",
    version: "1.0.0",
    payload: {
      kind: "step.complete",
      organizationId: params.organizationId,
      runId: params.runId,
      stepId: params.stepId,
      output: params.output,
    },
  });
}

export async function failStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  reason: string;
}) {
  return adapter.handleWorkflowEvent({
    type: "execution",
    version: "1.0.0",
    payload: {
      kind: "step.fail",
      organizationId: params.organizationId,
      runId: params.runId,
      stepId: params.stepId,
      reason: params.reason,
    },
  });
}
