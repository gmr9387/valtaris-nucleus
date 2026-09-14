import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createCredentialSchema,
  rotateCredentialSchema,
  deactivateCredentialSchema,
  buildRedactedPreview,
} from "@/lib/schemas";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase service-role server environment.");
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function makePayloadRef(): string {
  return `kms_pending:${crypto.randomUUID()}`;
}

async function assertOwnerOrAdmin(args: {
  admin: ReturnType<typeof adminClient>;
  organizationId: string;
  userId: string;
}) {
  const { data, error } = await args.admin.rpc("has_org_role", {
    _org: args.organizationId,
    _user: args.userId,
    _roles: ["owner", "admin"],
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Owner or admin role required.");
}

export const createSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createCredentialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = adminClient();

    await assertOwnerOrAdmin({
      admin,
      organizationId: data.organization_id,
      userId,
    });

    const correlationId = crypto.randomUUID();

    const credIns = await admin
      .from("credentials")
      .insert({
        organization_id: data.organization_id,
        provider_id: data.provider_id,
        project_id: data.project_id ?? null,
        environment_id: data.environment_id ?? null,
        label: data.label,
        status: "active",
        created_by: userId,
        last_rotated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (credIns.error) throw new Error(credIns.error.message);

    const versionIns = await admin
      .from("credential_versions")
      .insert({
        credential_id: credIns.data.id,
        version_number: 1,
        encrypted_payload_ref: makePayloadRef(),
        redacted_preview: buildRedactedPreview(data.initial_secret),
        created_by: userId,
        is_active: true,
      })
      .select("id, version_number, redacted_preview")
      .single();

    if (versionIns.error) throw new Error(versionIns.error.message);

    await admin.from("credential_rotation_events").insert({
      credential_id: credIns.data.id,
      previous_version_id: null,
      next_version_id: versionIns.data.id,
      rotation_reason: "initial",
      triggered_by: userId,
    });

    await admin.from("audit_events").insert({
      organization_id: data.organization_id,
      user_id: userId,
      module: "secrets",
      entity_type: "credential",
      entity_id: credIns.data.id,
      action: "create",
      correlation_id: correlationId,
      after_json: {
        label: data.label,
        provider_id: data.provider_id,
        version: 1,
        redacted_preview: versionIns.data.redacted_preview,
      },
    });

    return {
      credential_id: credIns.data.id,
      version_id: versionIns.data.id,
    };
  });

export const rotateSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => rotateCredentialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = adminClient();

    const cred = await admin
      .from("credentials")
      .select("id, organization_id")
      .eq("id", data.credential_id)
      .single();

    if (cred.error) throw new Error(cred.error.message);

    await assertOwnerOrAdmin({
      admin,
      organizationId: cred.data.organization_id,
      userId,
    });

    const correlationId = crypto.randomUUID();

    const prev = await admin
      .from("credential_versions")
      .select("id, version_number")
      .eq("credential_id", data.credential_id)
      .eq("is_active", true)
      .maybeSingle();

    if (prev.error) throw new Error(prev.error.message);

    if (prev.data) {
      const deact = await admin
        .from("credential_versions")
        .update({ is_active: false })
        .eq("id", prev.data.id);

      if (deact.error) throw new Error(deact.error.message);
    }

    const nextNumber = (prev.data?.version_number ?? 0) + 1;

    const versionIns = await admin
      .from("credential_versions")
      .insert({
        credential_id: data.credential_id,
        version_number: nextNumber,
        encrypted_payload_ref: makePayloadRef(),
        redacted_preview: buildRedactedPreview(data.new_secret),
        created_by: userId,
        is_active: true,
      })
      .select("id, version_number, redacted_preview")
      .single();

    if (versionIns.error) throw new Error(versionIns.error.message);

    const upd = await admin
      .from("credentials")
      .update({
        last_rotated_at: new Date().toISOString(),
        status: "active",
      })
      .eq("id", data.credential_id);

    if (upd.error) throw new Error(upd.error.message);

    await admin.from("credential_rotation_events").insert({
      credential_id: data.credential_id,
      previous_version_id: prev.data?.id ?? null,
      next_version_id: versionIns.data.id,
      rotation_reason: data.reason,
      triggered_by: userId,
    });

    await admin.from("audit_events").insert({
      organization_id: cred.data.organization_id,
      user_id: userId,
      module: "secrets",
      entity_type: "credential",
      entity_id: data.credential_id,
      action: "rotate_secret",
      correlation_id: correlationId,
      after_json: {
        version: nextNumber,
        reason: data.reason,
        redacted_preview: versionIns.data.redacted_preview,
      },
    });

    return {
      version_id: versionIns.data.id,
      version_number: nextNumber,
    };
  });

export const deactivateSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deactivateCredentialSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const admin = adminClient();

    const cred = await admin
      .from("credentials")
      .select("id, organization_id")
      .eq("id", data.credential_id)
      .single();

    if (cred.error) throw new Error(cred.error.message);

    await assertOwnerOrAdmin({
      admin,
      organizationId: cred.data.organization_id,
      userId,
    });

    const correlationId = crypto.randomUUID();

    const upd = await admin
      .from("credentials")
      .update({ status: "deactivated" })
      .eq("id", data.credential_id);

    if (upd.error) throw new Error(upd.error.message);

    const versions = await admin
      .from("credential_versions")
      .update({ is_active: false })
      .eq("credential_id", data.credential_id)
      .eq("is_active", true);

    if (versions.error) throw new Error(versions.error.message);

    await admin.from("audit_events").insert({
      organization_id: cred.data.organization_id,
      user_id: userId,
      module: "secrets",
      entity_type: "credential",
      entity_id: data.credential_id,
      action: "delete",
      correlation_id: correlationId,
      after_json: { status: "deactivated" },
    });

    return { ok: true };
  });
