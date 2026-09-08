import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle, Ban } from "lucide-react";
import { PageHeader, PageBody, EmptyState, StatusPill, Panel } from "@/components/platform-ui";
import { LoadingState } from "@/components/system/LoadingState";
import { ErrorState } from "@/components/system/ErrorState";
import { PermissionGate } from "@/components/system/PermissionGate";
import {
  useWorkflowAuditEvents,
  useWorkflowRun,
  useWorkflowSteps,
} from "@/lib/workflows/queries";
import {
  cancelWorkflow,
  completeStep,
  completeWorkflow,
  failStep,
  failWorkflow,
  startStep,
} from "@/lib/workflows/runtime";

export const Route = createFileRoute("/_app/workflows/runs/$runId")({
  component: RunDetailPage,
});

function RunDetailPage() {
  const { runId } = Route.useParams();
  const qc = useQueryClient();
  const run = useWorkflowRun(runId);
  const steps = useWorkflowSteps(runId);
  const audit = useWorkflowAuditEvents({ run_id: runId, limit: 200 });

  const [stepKey, setStepKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = run.data?.organization_id ?? null;
  const isTerminal =
    run.data?.status === "completed" ||
    run.data?.status === "failed" ||
    run.data?.status === "cancelled";

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function invalidate() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["workflow-run", runId] }),
      qc.invalidateQueries({ queryKey: ["workflow-steps", runId] }),
      qc.invalidateQueries({ queryKey: ["workflow-audit", undefined, undefined, runId, 200] }),
    ]);
  }

  if (run.isLoading) {
    return (
      <PageBody>
        <LoadingState />
      </PageBody>
    );
  }
  if (run.error) {
    return (
      <PageBody>
        <ErrorState error={run.error} onRetry={() => void run.refetch()} />
      </PageBody>
    );
  }
  if (!run.data) {
    return (
      <PageBody>
        <EmptyState title="Run not found" />
      </PageBody>
    );
  }

  const r = run.data;

  return (
    <>
      <PageHeader
        eyebrow="RUN"
        title={`Run ${r.id.slice(0, 8)}`}
        description={`Workflow ${r.workflow_id.slice(0, 8)} · version ${r.version_id.slice(0, 8)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/workflows/$workflowId/runs"
              params={{ workflowId: r.workflow_id }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Runs
            </Link>
            {!isTerminal && (
              <>
                <PermissionGate permission="workflows:run">
                  <button
                    onClick={() =>
                      withBusy(async () => {
                        await completeWorkflow({
                          organizationId: orgId!,
                          runId: r.id,
                          output: null,
                        });
                        await invalidate();
                      })
                    }
                    disabled={busy}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-status-paid/20 px-3 text-xs text-status-paid disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Complete
                  </button>
                  <button
                    onClick={() =>
                      withBusy(async () => {
                        await failWorkflow({
                          organizationId: orgId!,
                          runId: r.id,
                          reason: "Marked failed from console",
                        });
                        await invalidate();
                      })
                    }
                    disabled={busy}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-status-denied/20 px-3 text-xs text-status-denied disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Fail
                  </button>
                </PermissionGate>
                <PermissionGate permission="workflows:cancel">
                  <button
                    onClick={() =>
                      withBusy(async () => {
                        await cancelWorkflow({
                          organizationId: orgId!,
                          runId: r.id,
                          reason: "Cancelled from console",
                        });
                        await invalidate();
                      })
                    }
                    disabled={busy}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </PermissionGate>
              </>
            )}
          </div>
        }
      />

      <PageBody>
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <StatusPill status={r.status} />
            <span>Started {r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</span>
            <span>Completed {r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}</span>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <Panel title="Steps" description="Track individual step execution.">
            {!isTerminal && (
              <PermissionGate permission="workflows:run">
                <div className="mb-3 flex gap-2">
                  <input
                    value={stepKey}
                    onChange={(e) => setStepKey(e.target.value)}
                    placeholder="step_key"
                    className="h-8 flex-1 rounded-md border border-border bg-surface-2 px-2 font-mono text-xs"
                  />
                  <button
                    disabled={busy || !stepKey.trim()}
                    onClick={() =>
                      withBusy(async () => {
                        await startStep({
                          organizationId: orgId!,
                          runId: r.id,
                          stepId: stepKey.trim(),
                          input: null,
                        });
                        setStepKey("");
                        await invalidate();
                      })
                    }
                    className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Start step
                  </button>
                </div>
              </PermissionGate>
            )}

            {steps.isLoading ? (
              <LoadingState rows={2} />
            ) : (steps.data ?? []).length === 0 ? (
              <EmptyState title="No steps yet" />
            ) : (
              <div className="divide-y divide-border">
                {(steps.data ?? []).map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1fr_120px_160px_220px] items-center gap-3 py-3 text-sm"
                  >
                    <div className="font-mono text-xs">{s.step_key}</div>
                    <div>
                      <StatusPill status={s.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.started_at ? new Date(s.started_at).toLocaleString() : "—"}
                    </div>
                    <div className="flex justify-end gap-2">
                      {s.status === "running" && !isTerminal && (
                        <PermissionGate permission="workflows:run">
                          <button
                            disabled={busy}
                            onClick={() =>
                              withBusy(async () => {
                                await completeStep({
                                  organizationId: orgId!,
                                  runId: r.id,
                                  stepId: s.step_key,
                                  output: null,
                                });
                                await invalidate();
                              })
                            }
                            className="inline-flex h-7 items-center rounded-md border border-border bg-surface-2 px-2 text-xs"
                          >
                            Complete
                          </button>
                          <button
                            disabled={busy}
                            onClick={() =>
                              withBusy(async () => {
                                await failStep({
                                  organizationId: orgId!,
                                  runId: r.id,
                                  stepId: s.step_key,
                                  reason: "Marked failed",
                                });
                                await invalidate();
                              })
                            }
                            className="inline-flex h-7 items-center rounded-md border border-border bg-surface-2 px-2 text-xs"
                          >
                            Fail
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Audit trail" description="Every runtime transition emits an event.">
            {audit.isLoading ? (
              <LoadingState rows={2} />
            ) : (audit.data ?? []).length === 0 ? (
              <EmptyState title="No audit events yet" />
            ) : (
              <div className="divide-y divide-border">
                {(audit.data ?? []).map((e) => (
                  <div
                    key={e.id}
                    className="grid grid-cols-[180px_1fr_180px] items-center gap-3 py-2 text-xs"
                  >
                    <div className="font-mono text-foreground">{e.event_type}</div>
                    <div className="truncate text-muted-foreground">
                      {e.payload ? JSON.stringify(e.payload) : "—"}
                    </div>
                    <div className="text-right text-muted-foreground">
                      {new Date(e.occurred_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  );
}
