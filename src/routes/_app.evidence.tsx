import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  FileText,
  FolderArchive,
  ShieldCheck,
  Fingerprint,
  AlertTriangle,
  Database,
  UploadCloud,
} from "lucide-react";
import { PageHeader, PageBody, EmptyState } from "@/components/platform-ui";
import { useOrgStore } from "@/lib/org-store";

export const Route = createFileRoute("/_app/evidence")({
  component: EvidencePage,
});

const EVIDENCE_TYPES = [
  {
    name: "Claim Appeal Packet",
    module: "Claim Clarity",
    status: "planned",
    documentTypes: ["EOB", "medical records", "authorization", "appeal letter"],
    verification: "hash + manifest",
  },
  {
    name: "Decision Trace Evidence",
    module: "Guardian",
    status: "planned",
    documentTypes: ["inputs", "signals", "policy trace", "outcome"],
    verification: "decision hash",
  },
  {
    name: "Workflow Execution Evidence",
    module: "Glue",
    status: "planned",
    documentTypes: ["checkpoint", "approval", "retry log", "dead letter"],
    verification: "execution manifest",
  },
  {
    name: "Connector Payload Evidence",
    module: "Weaver",
    status: "planned",
    documentTypes: ["request", "response", "webhook", "normalized payload"],
    verification: "payload hash",
  },
];

function EvidencePage() {
  const { currentOrgId } = useOrgStore();

  const stats = useMemo(() => {
    return {
      registries: EVIDENCE_TYPES.length,
      modules: new Set(EVIDENCE_TYPES.map((item) => item.module)).size,
      verified: 0,
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="KNOWLEDGE"
        title="Evidence"
        description="Shared evidence registry for documents, manifests, hashes, provenance, verification, and future AI extraction."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Evidence is isolated per organization and later attached to projects, workflows, decisions, and claims."
            icon={<FolderArchive className="h-5 w-5" />}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Metric
                label="Evidence Registries"
                value={String(stats.registries)}
                icon={<FolderArchive className="h-4 w-4" />}
              />
              <Metric
                label="Product Modules"
                value={String(stats.modules)}
                icon={<Database className="h-4 w-4" />}
                tone="good"
              />
              <Metric
                label="Verified Sets"
                value={String(stats.verified)}
                icon={<ShieldCheck className="h-4 w-4" />}
                tone="warn"
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-1">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">Evidence Registry Blueprint</h2>
                  <p className="text-xs text-muted-foreground">
                    Shared evidence patterns across Claim Clarity, Guardian, Glue, and Weaver.
                  </p>
                </div>

                <span className="rounded border border-status-pending/30 bg-status-pending/10 px-2 py-1 text-mono-xs text-status-pending">
                  Phase 4
                </span>
              </div>

              <div className="divide-y divide-border">
                {EVIDENCE_TYPES.map((item) => (
                  <div
                    key={item.name}
                    className="grid grid-cols-[220px_130px_1fr_170px] gap-3 px-5 py-4 text-sm"
                  >
                    <div>
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Evidence set template
                      </div>
                    </div>

                    <div>
                      <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-mono-xs text-primary">
                        {item.module}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.documentTypes.map((doc) => (
                        <span
                          key={doc}
                          className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          <FileText className="mr-1 inline h-2.5 w-2.5" />
                          {doc}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Fingerprint className="h-3.5 w-3.5 text-status-paid" />
                      {item.verification}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface-1 p-4">
                <div className="flex items-start gap-3">
                  <UploadCloud className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold">Future Upload Flow</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Uploads should write to Supabase Storage, create document rows, calculate
                      SHA-style hashes, and attach each file to an evidence manifest. Browser
                      components should never become the system of record by themselves.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-status-pending/30 bg-status-pending/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-status-pending" />
                  <div>
                    <h3 className="text-sm font-semibold">Principal constraint</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Evidence must be provenance-first. Every future document should know where it
                      came from, what entity it supports, whether it is verified, and which decision
                      or workflow used it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "good" | "warn";
}) {
  const cls =
    tone === "good"
      ? "border-status-paid/20 bg-status-paid/5"
      : tone === "warn"
        ? "border-status-pending/20 bg-status-pending/5"
        : "border-primary/20 bg-primary/5";

  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
