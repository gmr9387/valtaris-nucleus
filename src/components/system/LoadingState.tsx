import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ label = "Loading…", rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-md border border-border bg-surface-2/40" />
      ))}
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-mono-xs text-muted-foreground">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label ?? "Loading…"}
    </div>
  );
}
