import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FileText,
  FolderArchive,
  ShieldCheck,
  AlertTriangle,
  Search,
  DollarSign,
} from "lucide-react";
import { PageHeader, PageBody, EmptyState, MetricCard, StatusPill } from "@/components/platform-ui";
import { LoadingState } from "@/components/system/LoadingState";
import { ErrorState } from "@/components/system/ErrorState";
import { useDisputes } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { Th, Td } from "./_app.organizations";

export const Route = createFileRoute("/_app/evidence")({
  component: EvidencePage,
});

function money(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function EvidencePage() {
  const { currentOrgId } = useOrgStore();
  const disputes = useDisputes(currentOrgId);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!disputes.data) return [];
    const q = query.toLowerCase();
    if (!q) return disputes.data;

    return disputes.data.filter(
      (d) =>
        d.claim_id.toLowerCase().includes(q) ||
        d.payer_name.toLowerCase().includes(q) ||
        (d.procedure_code ?? "").toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q),
    );
  }, [disputes.data, query]);

  const stats = useMemo(() => {
    const rows = disputes.data ?? [];
    const totalShortfall = rows.reduce((sum, d) => sum + d.shortfall_cents, 0);
    const avgConfidence = rows.length
      ? rows.reduce((sum, d) => sum + d.confidence, 0) / rows.length
      : 0;

    return { count: rows.length, totalShortfall, avgConfidence };
  }, [disputes.data]);

  return (
    <>
      <PageHeader
        eyebrow="KNOWLEDGE"
        title="Evidence"
        description="Underpayment disputes -- the appeal-packet evidence for each claim where allowed and paid amounts diverge."
      />

      <PageBody>
        {!currentOrgId ? (
          <EmptyState
            title="Select an organization"
            description="Evidence is isolated per organization and tied to the claims that produced it."
            icon={<FolderArchive className="h-5 w-5" />}
          />
        ) : disputes.isLoading ? (
          <LoadingState label="Loading evidence…" />
        ) : disputes.isError ? (
          <ErrorState error={disputes.error} onRetry={() => disputes.refetch()} />
        ) : disputes.data?.length ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricCard
                label="Open Evidence Packets"
                value={String(stats.count)}
                icon={<FolderArchive className="h-4 w-4" />}
              />

              <MetricCard
                label="Total Shortfall"
                value={money(stats.totalShortfall)}
                icon={<DollarSign className="h-4 w-4" />}
                tone="warn"
              />

              <MetricCard
                label="Avg. Confidence"
                value={`${Math.round(stats.avgConfidence * 100)}%`}
                icon={<ShieldCheck className="h-4 w-4" />}
                tone="good"
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-md border border-border bg-surface-1 pl-9 pr-3 text-sm outline-none focus:border-primary"
                placeholder="Search claim, payer, procedure, status..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
                  <tr>
                    <Th>Claim</Th>
                    <Th>Payer</Th>
                    <Th>Procedure</Th>
                    <Th>Allowed</Th>
                    <Th>Paid</Th>
                    <Th>Shortfall</Th>
                    <Th>Basis</Th>
                    <Th>Confidence</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border bg-surface-1/40">
                  {filtered.map((d) => (
                    <tr key={d.dispute_id} className="hover:bg-surface-2/60">
                      <Td>
                        <span className="font-mono text-xs">{d.claim_id}</span>
                      </Td>
                      <Td>{d.payer_name}</Td>
                      <Td>
                        <span className="font-mono text-xs text-muted-foreground">
                          {d.procedure_code ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs">{money(d.allowed_cents)}</span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs">{money(d.paid_cents)}</span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs font-medium text-status-pending">
                          {money(d.shortfall_cents)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">{d.basis}</span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs">{Math.round(d.confidence * 100)}%</span>
                      </Td>
                      <Td>
                        <StatusPill status={d.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-status-pending/30 bg-status-pending/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-status-pending" />
                <div>
                  <h3 className="text-sm font-semibold">Where this data comes from</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Each row is a real disputes record: allowed_cents vs. paid_cents from the payer
                    contract and remittance, the shortfall between them, and the basis and
                    confidence for disputing it. Full deterministic evidence -- deductible applied,
                    coinsurance, payment waterfall -- for the underlying claim is available in
                    Claims Workbench.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No disputes recorded yet"
            description="Underpayment disputes appear here once claims are adjudicated against a real contract and a shortfall is detected."
            icon={<FileText className="h-5 w-5" />}
          />
        )}
      </PageBody>
    </>
  );
}
