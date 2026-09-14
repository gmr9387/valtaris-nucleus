import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorState } from "@/components/system/ErrorState";
import { isAuthError } from "@/lib/auth-errors";
import { logTelemetryEvent } from "@/lib/telemetry";

/**
 * Standardized route-level error component.
 * Resets the query error boundary, logs telemetry, lets the user retry.
 */
export function RouteErrorComponent({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  const router = useRouter();
  const qErr = useQueryErrorResetBoundary();

  useEffect(() => {
    qErr.reset();
    void logTelemetryEvent({
      module: "router",
      event_type: "route.error",
      severity: isAuthError(error) ? "warn" : "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }, [qErr, error]);

  return (
    <div className="p-6">
      <ErrorState
        error={error}
        onRetry={() => {
          router.invalidate();
          reset();
        }}
      />
    </div>
  );
}

export function RouteNotFoundComponent() {
  return (
    <div className="p-10 text-center">
      <p className="text-mono-xs text-muted-foreground">404 · NOT_FOUND</p>
      <h2 className="mt-2 text-lg font-semibold">Page not found</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you're looking for doesn't exist in this workspace.
      </p>
    </div>
  );
}
