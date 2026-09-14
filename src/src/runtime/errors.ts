/**
 * Deterministic error types for the Valtaris ecosystem.
 * These errors provide structured metadata, platform-wide
 * error codes, and runtime-safe wrappers used across all
 * runtimes.
 */

export type PlatformErrorCode =
  | "RLS_VIOLATION"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "EXECUTION_ERROR"
  | "CONFIG_ERROR"
  | "CREDENTIAL_ERROR"
  | "CONNECTOR_ERROR"
  | "UNKNOWN";

export interface PlatformErrorMetadata {
  context?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly metadata: PlatformErrorMetadata;
  readonly timestamp: string;

  constructor(code: PlatformErrorCode, message: string, metadata: PlatformErrorMetadata = {}) {
    super(message);
    this.code = code;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

export function wrapError(error: unknown, code: PlatformErrorCode = "UNKNOWN"): PlatformError {
  if (error instanceof PlatformError) {
    return error;
  }

  if (error instanceof Error) {
    return new PlatformError(code, error.message, {
      details: { stack: error.stack },
    });
  }

  return new PlatformError(code, "Unknown error", {
    details: { value: error },
  });
}
