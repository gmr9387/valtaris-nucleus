/**
 * Client for the manage-sso Edge Function (supabase/functions/manage-sso/)
 * -- the only sanctioned way this app touches organization_sso_configs
 * or GoTrue's SAML SSO Admin API. See that function's header for why
 * this can't go through supabase.from(...) directly.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OrganizationSsoConfig } from "@/types/sso";

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-sso", { body });
  if (error) throw error;
  if (data?.error && !data?.config) throw new Error(data.error as string);
  return data as T;
}

export async function fetchSsoConfig(
  organizationId: string,
): Promise<OrganizationSsoConfig | null> {
  const { config } = await invoke<{ config: OrganizationSsoConfig | null }>({
    action: "get",
    organization_id: organizationId,
  });
  return config;
}

export interface UpsertSsoConfigInput {
  organizationId: string;
  domain: string;
  metadataUrl?: string;
  metadataXml?: string;
}

/**
 * Throws only on request-level failure (bad input, no permission). A
 * GoTrue-side failure (e.g. SSO not enabled on this plan) still
 * returns normally with config.status === "error" and last_error set
 * -- the caller renders that, it isn't an exception.
 */
export async function upsertSsoConfig(input: UpsertSsoConfigInput): Promise<OrganizationSsoConfig> {
  const { data, error } = await supabase.functions.invoke("manage-sso", {
    body: {
      action: "upsert",
      organization_id: input.organizationId,
      domain: input.domain,
      metadata_url: input.metadataUrl,
      metadata_xml: input.metadataXml,
    },
  });
  if (error) throw error;
  const result = data as { config?: OrganizationSsoConfig; error?: string } | null;
  if (!result?.config) throw new Error(result?.error ?? "manage-sso returned no config");
  return result.config;
}

export async function deleteSsoConfig(organizationId: string): Promise<void> {
  await invoke({ action: "delete", organization_id: organizationId });
}
