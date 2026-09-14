import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GitBranch, Play, Archive, ArrowLeft } from "lucide-react";
import { PageHeader, PageBody, EmptyState, StatusPill, Panel } from "@/components/platform-ui";
import { LoadingState } from "@/components/system/LoadingState";
import { ErrorState } from "@/components/system/ErrorState";
import { PermissionGate } from "@/components/system/PermissionGate";
import { useWorkflow, useWorkflowVersions } from "@/lib/workflows/queries";
import {
  archiveWorkflow,
  createDraftVersion,
  publishVersion,
  startWorkflow,
} from "@/lib/workflows/runtime";
import { workflowDefinitionSchema } from "@/lib/schemas/workflows.schemas";

export const Route = createFileRoute("/_app/workflows/$workflowId")({
  component: WorkflowDetailPage,
});

const SAMPLE_DEFINITION = JSON.stringify(
  {
    steps: [
      { key: "ingest", label: "Ingest input", kind: "task" },
      { key: "transform", label: "Transform payload", kind: "task" },
      { key: "emit", label: "Emit result", kind: "task" },
    ],
  },
  null,
  2,
);

function WorkflowDetailPage() {
  const { workflowId } = Route.useParams();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();

  const workflow = useWorkflow(workflowId);
  const versions = useWorkflowVersions(workflowId);

  const [defText, setDefText] = useState(SAMPLE_DEFINITION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orgId = workflow.data?.organization_id ?? null;
  const latestPublished = versions.data?.find((v) => v.status === "published") ?? null;

  async function handleDraft() {
    if (!workflow.data) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = workflowDefinitionSchema.parse(JSON.parse(defText));
      await createDraftVersion({
        workflow_id: workflow.data.id,
        organization_id: workflow.data.organization_id,
        definition: parsed,
      });
      await qc.invalidateQueries({ queryKey: ["workflow-versions", workflowId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draft version");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(versionId: string) {
    if (!workflow.data) return;
    setBusy(true);
    setError(null);
    try {
      await publishVersion({
        version_id: versionId,
        workflow_id: workflow.data.id,
        organization_id: workflow.data.organization_id,
      });
      await qc.invalidateQueries({ queryKey: ["workflow-versions", workflowId] });
      await qc.invalidateQueries({ queryKey: ["workflow", workflowId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!workflow.data) return;
    setBusy(true);
    try {
      await archiveWorkflow({
        workflow_id: workflow.data.id,
        organization_id: workflow.data.organization_id,
      });
      await qc.invalidateQueries({ queryKey: ["workflow", workflowId] });
      await qc.invalidateQueries({ queryKey: ["workflows", orgId] });
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!workflow.data || !latestPublished) return;
    setBusy(true);
    setError(null);
    try {
      const run = await startWorkflow({
        organization_id: workflow.data.organization_id,
        workflow_id: workflow.data.id,
        version_id: latestPublished.id,
      });
      navigate({ to: "/workflows/runs/$runId", params: { runId: run.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setBusy(false);
    }
  }

  if (workflow.isLoading) {
    return (
      <PageBody>
        <LoadingState />
      </PageBody>
    );
  }
  if (workflow.error) {
    return (
      <PageBody>
        <ErrorState error={workflow.error} onRetry={() => void workflow.refetch()} />
      </PageBody>
    );
  }
  if (!workflow.data) {
    return (
      <PageBody>
        <EmptyState title="Workflow not found" />
      </PageBody>
    );
  }

  const wf = workflow.data;

  return (
    <>
      <PageHeader
        eyebrow="WORKFLOW"
        title={wf.name}
        description={wf.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/workflows"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <Link
              to="/workflows/$workflowId/runs"
              params={{ workflowId: wf.id }}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface-2 px-3 text-xs"
            >
              Runs
            </Link>
            <PermissionGate permission="workflows:run">
              <button
                onClick={handleStart}
                disabled={!latestPublished || busy || wf.status === "archived"}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                Start run
              </button>
            </PermissionGate>
            <PermissionGate permission="workflows:admin">
              <button
                onClick={handleArchive}
                disabled={busy || wf.status === "archived"}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </button>
            </PermissionGate>
          </div>
        }
      />

      <PageBody>
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <StatusPill status={wf.status} />
            <span>Created {new Date(wf.created_at).toLocaleString()}</span>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <PermissionGate permission="workflows:update">
            <Panel
              title="Draft a new version"
              description="Define ordered steps. Published versions are immutable."
              icon={<GitBranch className="h-4 w-4" />}
            >
              <div className="space-y-3">
                <textarea
                  value={defText}
                  onChange={(e) => setDefText(e.target.value)}
                  rows={10}
                  spellCheck={false}
                  className="block w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs"
                />
                <button
                  onClick={handleDraft}
                  disabled={busy}
                  className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Working…" : "Create draft version"}
                </button>
              </div>
            </Panel>
          </PermissionGate>

          <Panel
            title="Versions"
            description="Drafts can be edited; published versions are frozen."
          >
            {versions.isLoading ? (
              <LoadingState rows={2} />
            ) : (versions.data ?? []).length === 0 ? (
              <EmptyState title="No versions" description="Draft the first version above." />
            ) : (
              <div className="divide-y divide-border">
                {(versions.data ?? []).map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-[80px_120px_1fr_160px] items-center gap-3 py-3 text-sm"
                  >
                    <div className="font-mono text-xs">v{v.version_number}</div>
                    <StatusPill status={v.status} />
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(v.created_at).toLocaleString()}
                      {v.published_at &&
                        ` · Published ${new Date(v.published_at).toLocaleString()}`}
                    </div>
                    <div className="text-right">
                      {v.status === "draft" && (
                        <PermissionGate permission="workflows:publish">
                          <button
                            onClick={() => handlePublish(v.id)}
                            disabled={busy}
                            className="inline-flex h-7 items-center rounded-md border border-border bg-surface-2 px-2 text-xs disabled:opacity-50"
                          >
                            Publish
                          </button>
                        </PermissionGate>
                      )}
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
