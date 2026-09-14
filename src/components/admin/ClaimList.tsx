import type { Claim, AdjudicationRun } from "@/types/claim";
import type { TraceObject } from "@/types/trace";
import type { Severity } from "@/types/clarity";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface ClaimListAdjResult {
  claimId: string;
  run: AdjudicationRun;
  trace: TraceObject;
}

interface ClaimListProps {
  claims: Claim[];
  adjResults: ClaimListAdjResult[];
  selectedClaimId: string | null;
  onSelect: (claimId: string) => void;
}

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: "bg-status-denied/15 text-status-denied border-status-denied/30",
  high: "bg-status-denied/10 text-status-denied border-status-denied/20",
  medium: "bg-status-pending/10 text-status-pending border-status-pending/30",
  low: "bg-muted text-muted-foreground border-border",
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function ClaimList({ claims, adjResults, selectedClaimId, onSelect }: ClaimListProps) {
  const runByClaimId = new Map(adjResults.map((r) => [r.claimId, r]));

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {claims.map((claim) => {
          const intel = claim.intel;
          const hasRun = runByClaimId.has(claim.claim_id);
          const isSelected = claim.claim_id === selectedClaimId;
          return (
            <button
              key={claim.claim_id}
              type="button"
              onClick={() => onSelect(claim.claim_id)}
              className={cn(
                "text-left px-3 py-2.5 border-b text-[12px] transition-colors hover:bg-muted/50",
                isSelected && "bg-muted",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] truncate">{claim.claim_id}</span>
                {intel && (
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0 h-4", SEVERITY_BADGE[intel.severity])}
                  >
                    {intel.severity}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-muted-foreground truncate">
                  {intel?.payer_name ?? claim.provider_name}
                </span>
                {intel && (
                  <span className="font-medium">{formatCents(intel.amount_at_risk_cents)}</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10.5px] text-muted-foreground">
                  {intel?.reimbursement_state ?? claim.status}
                </span>
                <span className="text-[10.5px] text-muted-foreground">
                  {hasRun ? "adjudicated" : "pending"}
                </span>
              </div>
            </button>
          );
        })}
        {claims.length === 0 && (
          <div className="p-4 text-[11.5px] text-muted-foreground text-center">
            No claims loaded.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
