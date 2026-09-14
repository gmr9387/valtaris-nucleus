import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "owner" | "admin" | "manager" | "operator" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "archived";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileSummary {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
}

export interface MembershipRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profiles?: ProfileSummary | ProfileSummary[] | null;
}

export interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "paused" | "archived";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentRow {
  id: string;
  project_id: string;
  name: string;
  env_type: "development" | "staging" | "production";
  created_by: string;
  created_at: string;
  project_name?: string;
}

export interface AuditEventRow {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  module: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  before_json: unknown | null;
  after_json: unknown | null;
  correlation_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export type CredentialStatus = "active" | "rotating" | "deactivated";
export type ConnectorCategory =
  "ai" | "payments" | "messaging" | "social" | "database" | "universal" | "other";

export type ConnectorStatus = "available" | "beta" | "deprecated";
export type BindingStatus = "active" | "paused" | "error";
export type HealthStatus = "healthy" | "degraded" | "failed" | "unknown";

export interface CredentialProviderRow {
  id: string;
  key: string;
  label: string;
  category: ConnectorCategory;
  supports_rotation: boolean;
  supports_oauth: boolean;
  created_at: string;
}

export interface CredentialRow {
  id: string;
  organization_id: string;
  project_id: string | null;
  environment_id: string | null;
  provider_id: string;
  label: string;
  status: CredentialStatus;
  created_by: string;
  last_rotated_at: string | null;
  created_at: string;
  updated_at: string;
  credential_providers?: CredentialProviderRow | null;
  projects?: Pick<ProjectRow, "id" | "name" | "slug"> | null;
  environments?: Pick<EnvironmentRow, "id" | "name" | "env_type"> | null;
}

export interface CredentialVersionRow {
  id: string;
  credential_id: string;
  version_number: number;
  redacted_preview: string | null;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export interface ConnectorRow {
  id: string;
  key: string;
  label: string;
  category: ConnectorCategory;
  status: ConnectorStatus;
  documentation_url: string | null;
  supports_webhooks: boolean;
  supports_oauth: boolean;
  created_at: string;
}

export interface ConnectorVersionRow {
  id: string;
  connector_id: string;
  version: string;
  changelog: string | null;
  schema_version: number;
  created_at: string;
}

export interface ConnectorCapabilityRow {
  id: string;
  connector_id: string;
  capability_key: string;
  capability_label: string;
}

export interface ConnectorBindingRow {
  id: string;
  organization_id: string;
  project_id: string | null;
  environment_id: string | null;
  connector_id: string;
  credential_id: string | null;
  status: BindingStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  connectors?: ConnectorRow | null;
  credentials?: Pick<CredentialRow, "id" | "label" | "status" | "provider_id"> | null;
  projects?: Pick<ProjectRow, "id" | "name" | "slug"> | null;
  environments?: Pick<EnvironmentRow, "id" | "name" | "env_type"> | null;
}

export interface ConnectorHealthCheckRow {
  id: string;
  connector_binding_id: string;
  health_status: HealthStatus;
  checked_at: string;
  latency_ms: number | null;
  message: string | null;
}

/**
 * Current user organizations.
 * RLS limits this to orgs where the user is a member.
 */
export function useMyOrganizations() {
  const { user } = useAuth();

  return useQuery({
    enabled: !!user,
    queryKey: ["my-orgs", user?.id],
    queryFn: async (): Promise<Organization[]> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Organization[];
    },
    staleTime: 30_000,
  });
}

export function useOrganization(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ["organization", orgId],
    queryFn: async (): Promise<Organization | null> => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId!)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as Organization | null;
    },
    staleTime: 30_000,
  });
}

export function useMyOrgMembership(orgId: string | null) {
  const { user } = useAuth();

  return useQuery({
    enabled: !!orgId && !!user,
    queryKey: ["my-org-membership", orgId, user?.id],
    queryFn: async (): Promise<MembershipRow | null> => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, organization_id, user_id, role, created_at")
        .eq("organization_id", orgId!)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as MembershipRow | null;
    },
    staleTime: 30_000,
  });
}

export function useOrgMembers(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ["org-members", orgId],
    queryFn: async (): Promise<MembershipRow[]> => {
      const joined = await supabase
        .from("organization_members")
        .select(
          "id, organization_id, user_id, role, created_at, profiles:profiles!organization_members_user_id_fkey(id, email, full_name, avatar_url)",
        )
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: true });

      if (!joined.error) {
        return (joined.data ?? []) as unknown as MembershipRow[];
      }

      const fallback = await supabase
        .from("organization_members")
        .select("id, organization_id, user_id, role, created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: true });

      if (fallback.error) throw fallback.error;
      return (fallback.data ?? []) as MembershipRow[];
    },
    staleTime: 30_000,
  });
}

export function useProjects(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ["projects", orgId],
    queryFn: async (): Promise<ProjectRow[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
    staleTime: 30_000,
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["project", projectId],
    queryFn: async (): Promise<ProjectRow | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as ProjectRow | null;
    },
    staleTime: 30_000,
  });
}

export function useEnvironments(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ["envs", orgId],
    queryFn: async (): Promise<EnvironmentRow[]> => {
      const projects = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", orgId!);

      if (projects.error) throw projects.error;

      const projectRows = projects.data ?? [];
      const projectIds = projectRows.map((project) => project.id);

      if (projectIds.length === 0) return [];

      const envs = await supabase
        .from("environments")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      if (envs.error) throw envs.error;

      const projectNameById = Object.fromEntries(
        projectRows.map((project) => [project.id, project.name]),
      );

      return (envs.data ?? []).map((env) => ({
        ...env,
        project_name: projectNameById[env.project_id],
      })) as EnvironmentRow[];
    },
    staleTime: 30_000,
  });
}

export function useProjectEnvironments(projectId: string | null) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["project-envs", projectId],
    queryFn: async (): Promise<EnvironmentRow[]> => {
      const { data, error } = await supabase
        .from("environments")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as EnvironmentRow[];
    },
    staleTime: 30_000,
  });
}

export function useAuditEvents(orgId: string | null, limit = 200) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ["audit", orgId, limit],
    queryFn: async (): Promise<AuditEventRow[]> => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as AuditEventRow[];
    },
    staleTime: 15_000,
  });
}

export function useRecentAuditEvents(limit = 100) {
  const { user } = useAuth();

  return useQuery({
    enabled: !!user,
    queryKey: ["audit-recent", user?.id, limit],
    queryFn: async (): Promise<AuditEventRow[]> => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as AuditEventRow[];
    },
    staleTime: 15_000,
  });
}

/**
 * Phase 2: credential providers catalog.
 */
export function useCredentialProviders() {
  const { user } = useAuth();

  return useQuery({
    enabled: !!user,
    queryKey: ["credential-providers"],
    queryFn: async (): Promise<CredentialProviderRow[]> => {
      const { data, error } = await supabase
        .from("credential_providers")
        .select("*")
        .order("label", { ascending: true });

      if (error) throw error;
      return (data ?? []) as CredentialProviderRow[];
    },
    staleTime: 60_000,
  });
}

/**
 * Phase 2: credential metadata only.
 * No raw secrets and no encrypted_payload_ref are selected here.
 */
export function useCredentials(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ["credentials", orgId],
    queryFn: async (): Promise<CredentialRow[]> => {
      const joined = await supabase
        .from("credentials")
        .select(
          `
          id,
          organization_id,
          project_id,
          environment_id,
          provider_id,
          label,
          status,
          created_by,
          last_rotated_at,
          created_at,
          updated_at,
          credential_providers(id, key, label, category, supports_rotation, supports_oauth, created_at),
          projects(id, name, slug),
          environments(id, name, env_type)
        `,
        )
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (!joined.error) {
        return (joined.data ?? []) as unknown as CredentialRow[];
      }

      const fallback = await supabase
        .from("credentials")
        .select(
          "id, organization_id, project_id, environment_id, provider_id, label, status, created_by, last_rotated_at, created_at, updated_at",
        )
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (fallback.error) throw fallback.error;
      return (fallback.data ?? []) as CredentialRow[];
    },
    staleTime: 20_000,
  });
}

/**
 * Phase 2: credential version metadata.
 * This intentionally does not select encrypted_payload_ref.
 */
export function useCredentialVersions(credentialId: string | null) {
  return useQuery({
    enabled: !!credentialId,
    queryKey: ["credential-versions", credentialId],
    queryFn: async (): Promise<CredentialVersionRow[]> => {
      const { data, error } = await supabase
        .from("credential_versions")
        .select(
          "id, credential_id, version_number, redacted_preview, created_by, created_at, is_active",
        )
        .eq("credential_id", credentialId!)
        .order("version_number", { ascending: false });

      if (error) throw error;
      return (data ?? []) as CredentialVersionRow[];
    },
    staleTime: 20_000,
  });
}

/**
 * Phase 2: connector catalog.
 */
export function useConnectors() {
  const { user } = useAuth();

  return useQuery({
    enabled: !!user,
    queryKey: ["connectors"],
    queryFn: async (): Promise<ConnectorRow[]> => {
      const { data, error } = await supabase
        .from("connectors")
        .select("*")
        .order("label", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ConnectorRow[];
    },
    staleTime: 60_000,
  });
}

export function useConnectorCapabilities() {
  const { user } = useAuth();

  return useQuery({
    enabled: !!user,
    queryKey: ["connector-capabilities"],
    queryFn: async (): Promise<ConnectorCapabilityRow[]> => {
      const { data, error } = await supabase
        .from("connector_capabilities")
        .select("*")
        .order("capability_label", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ConnectorCapabilityRow[];
    },
    staleTime: 60_000,
  });
}

export function useConnectorVersions(connectorId: string | null) {
  return useQuery({
    enabled: !!connectorId,
    queryKey: ["connector-versions", connectorId],
    queryFn: async (): Promise<ConnectorVersionRow[]> => {
      const { data, error } = await supabase
        .from("connector_versions")
        .select("*")
        .eq("connector_id", connectorId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ConnectorVersionRow[];
    },
    staleTime: 60_000,
  });
}

/**
 * Phase 2: connector bindings for selected org.
 */
export function useConnectorBindings(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ["connector-bindings", orgId],
    queryFn: async (): Promise<ConnectorBindingRow[]> => {
      const joined = await supabase
        .from("connector_bindings")
        .select(
          `
          id,
          organization_id,
          project_id,
          environment_id,
          connector_id,
          credential_id,
          status,
          created_by,
          created_at,
          updated_at,
          connectors(id, key, label, category, status, documentation_url, supports_webhooks, supports_oauth, created_at),
          credentials(id, label, status, provider_id),
          projects(id, name, slug),
          environments(id, name, env_type)
        `,
        )
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (!joined.error) {
        return (joined.data ?? []) as unknown as ConnectorBindingRow[];
      }

      const fallback = await supabase
        .from("connector_bindings")
        .select(
          "id, organization_id, project_id, environment_id, connector_id, credential_id, status, created_by, created_at, updated_at",
        )
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (fallback.error) throw fallback.error;
      return (fallback.data ?? []) as ConnectorBindingRow[];
    },
    staleTime: 20_000,
  });
}

export function useConnectorHealthChecks(bindingId: string | null) {
  return useQuery({
    enabled: !!bindingId,
    queryKey: ["connector-health", bindingId],
    queryFn: async (): Promise<ConnectorHealthCheckRow[]> => {
      const { data, error } = await supabase
        .from("connector_health_checks")
        .select("*")
        .eq("connector_binding_id", bindingId!)
        .order("checked_at", { ascending: false })
        .limit(25);

      if (error) throw error;
      return (data ?? []) as ConnectorHealthCheckRow[];
    },
    staleTime: 15_000,
  });
}

/**
 * Permission helpers for UI only.
 * Real enforcement still belongs to Supabase RLS + server functions.
 */
export function canManageOrg(role?: AppRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canManageProjects(role?: AppRole | null): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canOperate(role?: AppRole | null): boolean {
  return role === "owner" || role === "admin" || role === "manager" || role === "operator";
}

export function canManageSecrets(role?: AppRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canReadSecretsMetadata(role?: AppRole | null): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canManageConnectors(role?: AppRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canReadConnectors(role?: AppRole | null): boolean {
  return !!role;
}

export function isReadOnly(role?: AppRole | null): boolean {
  return role === "viewer";
}
