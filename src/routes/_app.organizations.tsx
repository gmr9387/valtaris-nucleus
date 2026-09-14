import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMyOrganizations } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { PageHeader, PageBody, EmptyState, StatusDot } from "@/components/platform-ui";
import { logAudit } from "@/lib/audit";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/organizations")({ component: OrgsPage });

const newOrgSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes"),
});

function OrgsPage() {
  const orgs = useMyOrganizations();
  const { user } = useAuth();
  const { setCurrentOrgId } = useOrgStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const parsed = newOrgSchema.parse({ name, slug });
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name: parsed.name, slug: parsed.slug, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        organization_id: data.id,
        module: "tenancy",
        entity_type: "organization",
        entity_id: data.id,
        action: "create",
        after: data,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success("Organization created");
      setCurrentOrgId(data.id);
      setName("");
      setSlug("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-orgs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="TENANCY"
        title="Organizations"
        description="Top-level tenants. Every project, user and audit event belongs to one."
        actions={
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> New organization
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
                    setSlug(slugify(e.target.value));
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

        {orgs.data?.length ? (
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
                {orgs.data.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-2/60">
                    <Td>
                      <div className="font-medium">{o.name}</div>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-muted-foreground">{o.slug}</span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot status={o.status} />
                        <span className="capitalize">{o.status}</span>
                      </span>
                    </Td>
                    <Td>
                      <span className="text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString()}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No organizations yet"
            description="Create your first organization to start using ValtariOS Core."
            action={
              <button
                onClick={() => setOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" /> New organization
              </button>
            }
          />
        )}
        <FieldStyles />
      </PageBody>
    </>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
export function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 text-left font-medium tracking-widest">{children}</th>;
}
export function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2.5">{children}</td>;
}
export function FieldStyles() {
  return (
    <style>{`
      .input {
        width: 100%; height: 36px; padding: 0 10px;
        background: var(--color-surface-2); color: var(--color-foreground);
        border: 1px solid var(--color-border); border-radius: 6px;
        font-size: 14px; outline: none;
      }
      .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-ring); }
      select.input { appearance: none; }
    `}</style>
  );
}
