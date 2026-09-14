/**
 * Centralized auth error mapping.
 * Translates Supabase / PostgREST / network failures into user-facing copy
 * while preserving original error for logging.
 */

export interface MappedError {
  code:
    | "unauthorized"
    | "session_expired"
    | "forbidden"
    | "not_found"
    | "rate_limited"
    | "network"
    | "validation"
    | "conflict"
    | "unknown";
  message: string;
  raw: unknown;
}

const AUTH_HINTS = [
  "jwt expired",
  "invalid jwt",
  "no authorization header",
  "invalid token",
  "unauthorized",
  "auth session missing",
];

export function isAuthError(error: unknown): boolean {
  if (!error) return false;
  const message = errorMessage(error).toLowerCase();
  return AUTH_HINTS.some((hint) => message.includes(hint)) || extractStatus(error) === 401;
}

export function mapAuthError(error: unknown): MappedError | null {
  if (!error) return null;

  const status = extractStatus(error);
  const message = errorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("jwt expired") || lower.includes("session missing")) {
    return {
      code: "session_expired",
      message: "Your session has expired. Please sign in again.",
      raw: error,
    };
  }

  if (status === 401 || AUTH_HINTS.some((h) => lower.includes(h))) {
    return {
      code: "unauthorized",
      message: "You are not authenticated. Please sign in.",
      raw: error,
    };
  }

  if (status === 403 || lower.includes("permission") || lower.includes("rls")) {
    return {
      code: "forbidden",
      message: "You do not have permission to perform this action.",
      raw: error,
    };
  }

  if (status === 404) {
    return { code: "not_found", message: "Resource not found.", raw: error };
  }

  if (status === 409 || lower.includes("duplicate") || lower.includes("conflict")) {
    return { code: "conflict", message: "This conflicts with existing data.", raw: error };
  }

  if (status === 429) {
    return { code: "rate_limited", message: "Too many requests. Try again shortly.", raw: error };
  }

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return { code: "network", message: "Network error. Check your connection.", raw: error };
  }

  if (lower.includes("zod") || lower.includes("invalid input") || lower.includes("validation")) {
    return { code: "validation", message: message || "Invalid input.", raw: error };
  }

  return { code: "unknown", message: message || "Something went wrong.", raw: error };
}

export function errorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const anyErr = error as { message?: unknown; error?: unknown };
    if (typeof anyErr.message === "string") return anyErr.message;
    if (typeof anyErr.error === "string") return anyErr.error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function extractStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const anyErr = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  if (typeof anyErr.status === "number") return anyErr.status;
  if (typeof anyErr.statusCode === "number") return anyErr.statusCode;
  if (typeof anyErr.code === "string") {
    const n = parseInt(anyErr.code, 10);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}
