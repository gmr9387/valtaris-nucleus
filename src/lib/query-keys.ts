/**
 * Centralized, typed TanStack Query keys.
 * Single source of truth for cache identity + invalidation surfaces.
 */
export const qk = {
  auth: {
    session: () => ["auth", "session"] as const,
  },
  orgs: {
    mine: (userId: string | undefined) => ["orgs", "mine", userId] as const,
    one: (orgId: string | null) => ["orgs", "one", orgId] as const,
    members: (orgId: string | null) => ["orgs", "members", orgId] as const,
    myMembership: (orgId: string | null, userId: string | undefined) =>
      ["orgs", "membership", orgId, userId] as const,
  },
  projects: {
    list: (orgId: string | null) => ["projects", orgId] as const,
    one: (projectId: string | null) => ["projects", "one", projectId] as const,
  },
  envs: {
    byOrg: (orgId: string | null) => ["envs", orgId] as const,
    byProject: (projectId: string | null) => ["envs", "project", projectId] as const,
  },
  audit: {
    list: (orgId: string | null, limit = 200) => ["audit", orgId, limit] as const,
    recent: (userId: string | undefined, limit = 100) =>
      ["audit", "recent", userId, limit] as const,
  },
  credentials: {
    providers: () => ["credentials", "providers"] as const,
    list: (orgId: string | null) => ["credentials", orgId] as const,
    versions: (credentialId: string | null) => ["credentials", "versions", credentialId] as const,
  },
  connectors: {
    catalog: () => ["connectors"] as const,
    capabilities: () => ["connectors", "capabilities"] as const,
    versions: (connectorId: string | null) => ["connectors", "versions", connectorId] as const,
    bindings: (orgId: string | null) => ["connectors", "bindings", orgId] as const,
  },
  health: {
    forBinding: (bindingId: string | null) => ["health", "binding", bindingId] as const,
    latest: (bindingIds: readonly string[]) => ["health", "latest", bindingIds] as const,
  },
  telemetry: {
    events: (orgId: string | null, limit = 200) => ["telemetry", "events", orgId, limit] as const,
  },
} as const;

export type QueryKey = ReturnType<
  typeof qk.orgs.mine | typeof qk.orgs.one | typeof qk.projects.list | typeof qk.audit.list
>;
