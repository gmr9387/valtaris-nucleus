import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { canManageProjects, useEnvironments, useMyOrgMembership, useProjects } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { PageHeader, PageBody, EmptyState, StatusDot } from "@/components/platform-ui";
import { Field, Th, Td, FieldStyles } from "./_app.organizations";
import { createCorrelationId, logAudit } from "@/lib/audit";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/environments")({
  component: EnvsPage,
});

const schema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  env_type: z.enum(["development", "staging", "production"]),
});

type EnvType = z.infer<typeof schema>["env_type"];

function EnvsPage() {
  const { currentOrgId } = useOrgStore();
  const { user } = useAuth();

  const envs = useEnvironments(currentOrgId);
  const projects = useProjects(currentOrgId);
  const membership = useMyOrgMembership(currentOrgId);

  const canCreate = canManageProjects(membership.data?.role);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [envType, setEnvType] = useState<EnvType>("development");

  useEffect(() => {
    if (!projectId && projects.data?.[0]?.id) {
      setProjectId(projects.data[0].id);
    }
  }, [projectId, projects.data]);

  const create = useMutation({
    mutationFn: async () => {
      if (!currentOrgId) throw new Error("Select an organization first.");
      if (!user) throw new Error("You must be signed in.");
      if (!canCreate) throw new Error("You do not have permission to create environments.");

      const parsed = schema.parse({
        project_id: projectId,
        name,
        env_type: envType,
      });

      const correlationId = createCorrelationId();

      const { data, error } = await supabase
        .from("environments")
        .insert({
          project_id: parsed.project_id,
          name: parsed.name,
          env_type: parsed.env_type,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await logAudit({
        organization_id: currentOrgId,
        module: "tenancy",
        entity_type: "environment",
        entity_id: data.id,
        action: "create",
        after: data,
        correlation_id: correlationId,
      });

      return data;
    },

    onSuccess: () => {
      toast.success("Environment created");
      setName("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["envs", currentOrgId] });
      qc.invalidateQueries({ queryKey: ["project-envs", projectId] });
      qc.invalidateQueries({ queryKey: ["audit", currentOrgId] });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="TENANCY"
        title="Environments"
        description="Isolated runtime targets per project: development, staging, and production."
        actions={
          <button
            onClick={() => setOpen((v) => !v)}
            disabled={!currentOrgId || !projects.data?.length || !canCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            title={!canCreate ? "Owner, admin, or manager role required" : undefined}
          >
            <Plus className="h-3.5 w-3.5" />
            New environment
          </button>
        }
      />

      <PageBody>
        {!currentOrgId && (
          <EmptyState
            title="Select an organization"
            description="Choose or create an organization before creating environments."
          />
        )}

        {currentOrgId && open && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
            className="mb-6 rounded-lg border border-border bg-surface-1 p-4"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Project">
                <select
                  className="input"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  required
                >
                  <option value="">Select project…</option>
                  {projects.data?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Name">
                <input
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={60}
                  placeholder="Production"
                />
              </Field>

              <Field label="Type">
                <select
                  className="input"
                  value={envType}
                  onChange={(event) => setEnvType(event.target.value as EnvType)}
                >
                  <option value="development">development</option>
                  <option value="staging">staging</option>
                  <option value="production">production</option>
                </select>
              </Field>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={create.isPending || !canCreate}
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {create.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}

        {currentOrgId && envs.data?.length ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                <tr>
                  <Th>Project</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Created</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border bg-surface-1/40">
                {envs.data.map((env) => (
                  <tr key={env.id} className="hover:bg-surface-2/60">
                    <Td>
                      <span className="font-medium">{env.project_name ?? "Unknown project"}</span>
                    </Td>

                    <Td>
                      <span className="font-mono text-xs">{env.name}</span>
                    </Td>

                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot status={env.env_type} />
                        <span className="capitalize">{env.env_type}</span>
                      </span>
                    </Td>

                    <Td>
                      <span className="text-muted-foreground">
                        {new Date(env.created_at).toLocaleDateString()}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : currentOrgId ? (
          <EmptyState
            title="No environments yet"
            description={
              projects.data?.length
                ? canCreate
                  ? "Create one for an existing project."
                  : "No environments are available yet."
                : "Create a project first."
            }
          />
        ) : null}

        <FieldStyles />
      </PageBody>
    </>
  );
}
