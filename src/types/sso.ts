// Row shape for organization_sso_configs (supabase/migrations/20260916f_sso_configs.sql).
// Never includes IdP metadata (XML/URL) -- that's write-only, sent to
// manage-sso and handed straight to GoTrue; nothing needs to read it back.

export type SsoConfigStatus = "pending" | "active" | "error";

export interface OrganizationSsoConfig {
  id: string;
  organization_id: string;
  domain: string;
  sso_provider_id: string | null;
  status: SsoConfigStatus;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
