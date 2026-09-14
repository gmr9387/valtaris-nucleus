import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useProjects } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { PageHeader, PageBody, EmptyState, StatusDot } from "@/components/platform-ui";
import { Field, Th, Td, FieldStyles } from "./_app.organizations";
import { logAudit } from "@/lib/audit";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/projects")({ component: ProjectsPage });

const schema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
});

function ProjectsPage() {
  const { currentOrgId } = useOrgStore();
  const { user } = useAuth();
  const list = useProjects(currentOrgId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse({ name, slug, description: desc || undefined });
      const { data, error } = await supabase
        .from("projects")
        .insert({
          organization_id: currentOrgId!,
          name: parsed.name,
          slug: parsed.slug,
          description: parsed.description ?? null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        organization_id: currentOrgId,
        module: "tenancy",
        entity_type: "project",
        entity_id: data.id,
        action: "create",
        after: data,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Project created");
      setName("");
      setSlug("");
      setDesc("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="TENANCY"
        title="Projects"
        description="Logical workspaces inside an organization. Each project owns environments and resources."
        actions={
          <button
            onClick={() => setOpen((v) => !v)}
            disabled={!currentOrgId}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> New project
          </button>
        }
      />
      <PageBody>
        {open && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="mb-6 rounded-lg border border-border bg-surface-1 p-4"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Name">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")
                        .slice(0, 60),
                    );
                  }}
                  required
                />
              </Field>
              <Field label="Slug">
                <input
                  className="input font-mono"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    className="input"
                    style={{ height: 72, paddingTop: 8 }}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    maxLength={500}
                  />
                </Field>
              </div>
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
                disabled={create.isPending}
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {create.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}

        {list.data?.length ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                <tr>
                  <Th>Name</Th>
                  <Th>Slug</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface-1/40">
                {list.data.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2/60">
                    <Td>
                      <div className="font-medium">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      )}
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-muted-foreground">{p.slug}</span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot status={p.status} />
                        <span className="capitalize">{p.status}</span>
                      </span>
                    </Td>
                    <Td>
                      <span className="text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No projects yet"
            description="Create a project to organize environments and resources."
          />
        )}
        <FieldStyles />
      </PageBody>
    </>
  );
}
