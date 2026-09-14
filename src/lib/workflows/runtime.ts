// src/lib/workflows/runtime.ts
//
// Real, Supabase-backed workflow runtime: definitions, versions, runs,
// and steps, all persisted so the UI (src/routes/_app.workflows*.tsx,
// backed by src/lib/workflows/queries.ts) reflects real state after
// every action, with an audit trail for each transition.

import { supabase } from "@/integrations/supabase/client";
import type { WorkflowRow, WorkflowVersionRow, WorkflowRunRow } from "./queries";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated.");
  return data.user.id;
}

async function recordAuditEvent(args: {
  organization_id: string;
  workflow_id?: string | null;
  run_id?: string | null;
  event_type: string;
  payload?: unknown;
}): Promise<void> {
  const actor_id = await currentUserId().catch(() => null);
  const { error } = await supabase.from("workflow_audit_events").insert([
    {
      organization_id: args.organization_id,
      workflow_id: args.workflow_id ?? null,
      run_id: args.run_id ?? null,
      event_type: args.event_type,
      actor_id,
      payload: (args.payload ?? null) as never,
    },
  ] as never);
  if (error) console.error("[workflows] failed to record audit event", error.message);
}

export async function createWorkflow(params: {
  organization_id: string;
  name: string;
  description: string | null;
}): Promise<WorkflowRow> {
  const created_by = await currentUserId();
  const { data, error } = await supabase
    .from("workflows")
    .insert([
      {
        organization_id: params.organization_id,
        name: params.name,
        description: params.description,
        created_by,
      },
    ] as never)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create workflow.");
  const row = data as unknown as WorkflowRow;
  await recordAuditEvent({
    organization_id: params.organization_id,
    workflow_id: row.id,
    event_type: "workflow.created",
  });
  return row;
}

export async function createDraftVersion(params: {
  workflow_id: string;
  organization_id: string;
  definition: unknown;
}): Promise<WorkflowVersionRow> {
  const created_by = await currentUserId();
  const { data: existing, error: existingError } = await supabase
    .from("workflow_versions")
    .select("version_number")
    .eq("workflow_id", params.workflow_id)
    .order("version_number", { ascending: false })
    .limit(1);
  if (existingError) throw new Error(existingError.message);

  const latest = existing?.[0] as { version_number: number } | undefined;
  const nextVersion = (latest?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("workflow_versions")
    .insert([
      {
        workflow_id: params.workflow_id,
        version_number: nextVersion,
        definition_json: params.definition as never,
        created_by,
      },
    ] as never)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create draft version.");
  const row = data as unknown as WorkflowVersionRow;
  await recordAuditEvent({
    organization_id: params.organization_id,
    workflow_id: params.workflow_id,
    event_type: "workflow_version.drafted",
    payload: { version_id: row.id, version_number: row.version_number },
  });
  return row;
}

export async function publishVersion(params: {
  version_id: string;
  workflow_id: string;
  organization_id: string;
}): Promise<void> {
  const { error } = await supabase
    .from("workflow_versions")
    .update({ status: "published", published_at: new Date().toISOString() } as never)
    .eq("id", params.version_id);
  if (error) throw new Error(error.message);

  const { error: workflowError } = await supabase
    .from("workflows")
    .update({ status: "active" } as never)
    .eq("id", params.workflow_id);
  if (workflowError) throw new Error(workflowError.message);

  await recordAuditEvent({
    organization_id: params.organization_id,
    workflow_id: params.workflow_id,
    event_type: "workflow_version.published",
    payload: { version_id: params.version_id },
  });
}

export async function archiveWorkflow(params: {
  workflow_id: string;
  organization_id: string;
}): Promise<void> {
  const { error } = await supabase
    .from("workflows")
    .update({ status: "archived" } as never)
    .eq("id", params.workflow_id);
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    organization_id: params.organization_id,
    workflow_id: params.workflow_id,
    event_type: "workflow.archived",
  });
}

export async function startWorkflow(params: {
  organization_id: string;
  workflow_id: string;
  version_id: string;
}): Promise<WorkflowRunRow> {
  const created_by = await currentUserId();
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert([
      {
        workflow_id: params.workflow_id,
        version_id: params.version_id,
        organization_id: params.organization_id,
        status: "running",
        started_at: new Date().toISOString(),
        created_by,
      },
    ] as never)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to start run.");
  const row = data as unknown as WorkflowRunRow;
  await recordAuditEvent({
    organization_id: params.organization_id,
    workflow_id: params.workflow_id,
    run_id: row.id,
    event_type: "workflow_run.started",
  });
  return row;
}

export async function completeWorkflow(params: {
  organizationId: string;
  runId: string;
  output: unknown;
}): Promise<void> {
  const { error } = await supabase
    .from("workflow_runs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      output_json: (params.output ?? null) as never,
    } as never)
    .eq("id", params.runId);
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    organization_id: params.organizationId,
    run_id: params.runId,
    event_type: "workflow_run.completed",
    payload: params.output,
  });
}

export async function failWorkflow(params: {
  organizationId: string;
  runId: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase
    .from("workflow_runs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_json: { reason: params.reason } as never,
    } as never)
    .eq("id", params.runId);
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    organization_id: params.organizationId,
    run_id: params.runId,
    event_type: "workflow_run.failed",
    payload: { reason: params.reason },
  });
}

export async function cancelWorkflow(params: {
  organizationId: string;
  runId: string;
  reason?: string;
}): Promise<void> {
  const { error } = await supabase
    .from("workflow_runs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      error_json: (params.reason ? { reason: params.reason } : null) as never,
    } as never)
    .eq("id", params.runId);
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    organization_id: params.organizationId,
    run_id: params.runId,
    event_type: "workflow_run.cancelled",
    payload: { reason: params.reason },
  });
}

export async function startStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  input: unknown;
}): Promise<void> {
  const { error } = await supabase.from("workflow_steps").insert([
    {
      run_id: params.runId,
      step_key: params.stepId,
      status: "running",
      started_at: new Date().toISOString(),
      input_json: (params.input ?? null) as never,
    },
  ] as never);
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    organization_id: params.organizationId,
    run_id: params.runId,
    event_type: "workflow_step.started",
    payload: { step_key: params.stepId },
  });
}

export async function completeStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  output: unknown;
}): Promise<void> {
  const { error } = await supabase
    .from("workflow_steps")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      output_json: (params.output ?? null) as never,
    } as never)
    .eq("run_id", params.runId)
    .eq("step_key", params.stepId);
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    organization_id: params.organizationId,
    run_id: params.runId,
    event_type: "workflow_step.completed",
    payload: { step_key: params.stepId },
  });
}

export async function failStep(params: {
  organizationId: string;
  runId: string;
  stepId: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase
    .from("workflow_steps")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_json: { reason: params.reason } as never,
    } as never)
    .eq("run_id", params.runId)
    .eq("step_key", params.stepId);
  if (error) throw new Error(error.message);

  await recordAuditEvent({
    organization_id: params.organizationId,
    run_id: params.runId,
    event_type: "workflow_step.failed",
    payload: { step_key: params.stepId, reason: params.reason },
  });
}
