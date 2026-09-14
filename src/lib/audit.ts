import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "invite"
  | "remove"
  | "switch_org"
  | "sign_in"
  | "sign_up"
  | "sign_out"
  | "view"
  | "publish"
  | "archive"
  | "restore"
  | "execute"
  | "approve"
  | "reject"
  | "rotate_secret"
  | "replay";

export interface AuditPayload {
  organization_id?: string | null;
  module: string;
  entity_type: string;
  entity_id?: string | null;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  correlation_id?: string | null;
  ip_address?: string | null;
}

/**
 * Generate a correlation id for grouped platform operations.
 * Use this when one UI action produces multiple writes.
 */
export function createCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Audit logging helper.
 *
 * Best-effort by design:
 * - Never blocks the user flow if audit insert fails.
 * - Still logs failures in dev for debugging.
 * - RLS enforces org visibility and insert rules.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return;

    const { error } = await supabase.from("audit_events").insert({
      organization_id: payload.organization_id ?? null,
      user_id: user.id,
      module: payload.module,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id ?? null,
      action: payload.action,
      before_json: (payload.before ?? null) as never,
      after_json: (payload.after ?? null) as never,
      correlation_id: payload.correlation_id ?? createCorrelationId(),
      ip_address: payload.ip_address ?? null,
    });

    if (error && import.meta.env.DEV) {
      console.warn("[audit] insert failed", error.message);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[audit] unexpected failure", error);
    }
  }
}

/**
 * Wrap a mutation with before/after audit logging.
 * Useful for update screens where you already have the before snapshot.
 */
export async function logMutationAudit(args: {
  organization_id?: string | null;
  module: string;
  entity_type: string;
  entity_id?: string | null;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
  correlation_id?: string | null;
}): Promise<void> {
  await logAudit({
    organization_id: args.organization_id,
    module: args.module,
    entity_type: args.entity_type,
    entity_id: args.entity_id,
    action: args.action,
    before: args.before,
    after: args.after,
    correlation_id: args.correlation_id,
  });
}
