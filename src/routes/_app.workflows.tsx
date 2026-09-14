import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Workflow, Plus } from "lucide-react";
import { PageHeader, PageBody, EmptyState, StatusPill, Panel } from "@/components/platform-ui";
import { LoadingState } from "@/components/system/LoadingState";
import { ErrorState } from "@/components/system/ErrorState";
import { PermissionGate } from "@/components/system/PermissionGate";
import { useOrgStore } from "@/lib/org-store";
import { useWorkflows } from "@/lib/workflows/queries";
import { createWorkflow } from "@/lib/workflows/runtime";

export const Route = createFileRoute("/_app/workflows")({
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { currentOrgId } = useOrgStore();
  const workflows = useWorkflows(currentOrgId);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrgId || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createWorkflow({
        organization_id: currentOrgId,
        name: name.trim(),
        description: description.trim() || null,
      });
      setName("");
      setDescription("");
      setCreating(false);
      await qc.invalidateQueries({ queryKey: ["workflows", currentOrgId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="INFRASTRUCTURE"
        title="Workflows"
        description="Definitions, versions, and runs. Shared runtime substrate for ValtariOS products."
        actions={
          <PermissionGate permission="workflows:create">
            <button
              onClick={() => setCreating((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              New workflow
            </button>
          </PermissionGate>
        }
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Workflows are tenant-scoped."
            icon={<Workflow className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-6">
            {creating && (
              <Panel
                title="New workflow"
                description="Creates a draft workflow. Add a version next."
              >
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="text-mono-xs text-muted-foreground">NAME</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      required
                      className="mt-1 block w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                      placeholder="Claim Appeal Packet"
                    />
                  </div>
                  <div>
                    <label className="text-mono-xs text-muted-foreground">DESCRIPTION</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={1000}
                      rows={2}
                      className="mt-1 block w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
                    />
                  </div>
                  {error && <div className="text-xs text-destructive">{error}</div>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {submitting ? "Creating…" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-surface-2 px-3 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </Panel>
            )}

            {workflows.isLoading ? (
              <LoadingState label="Loading workflows…" />
            ) : workflows.error ? (
              <ErrorState
                title="Failed to load workflows"
                error={workflows.error}
                onRetry={() => void workflows.refetch()}
              />
            ) : (workflows.data ?? []).length === 0 ? (
              <EmptyState
                title="No workflows yet"
                description="Create the first workflow to anchor a versioned definition and runs."
                icon={<Workflow className="h-5 w-5" />}
              />
            ) : (
              <div className="rounded-xl border border-border bg-surface-1">
                <div className="grid grid-cols-[1fr_120px_140px_160px] gap-3 border-b border-border px-5 py-2 text-mono-xs text-muted-foreground">
                  <div>NAME</div>
                  <div>STATUS</div>
                  <div>UPDATED</div>
                  <div className="text-right">ACTION</div>
                </div>
                <div className="divide-y divide-border">
                  {(workflows.data ?? []).map((wf) => (
                    <div
                      key={wf.id}
                      className="grid grid-cols-[1fr_120px_140px_160px] items-center gap-3 px-5 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{wf.name}</div>
                        {wf.description && (
                          <div className="truncate text-xs text-muted-foreground">
                            {wf.description}
                          </div>
                        )}
                      </div>
                      <div>
                        <StatusPill status={wf.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(wf.updated_at).toLocaleString()}
                      </div>
                      <div className="text-right">
                        <Link
                          to="/workflows/$workflowId"
                          params={{ workflowId: wf.id }}
                          className="inline-flex h-7 items-center rounded-md border border-border bg-surface-2 px-2 text-xs hover:text-foreground"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
