/**
 * RLS enforcement utilities for the Valtaris ecosystem.
 * These helpers provide deterministic tenant isolation,
 * organization, project, and environment scoping used
 * across all runtimes.
 */

export interface RLSContext {
  organizationId: string;
  projectId: string;
  environmentId: string;
  userId: string;
  metadata: Record<string, unknown>;
}

export class RLS {
  private context: RLSContext;

  constructor(context: RLSContext) {
    this.context = context;
  }

  getContext(): RLSContext {
    return this.context;
  }

  enforceOrganization(targetOrgId: string): void {
    if (targetOrgId !== this.context.organizationId) {
      throw new Error("RLS violation: organization mismatch");
    }
  }

  enforceProject(targetProjectId: string): void {
    if (targetProjectId !== this.context.projectId) {
      throw new Error("RLS violation: project mismatch");
    }
  }

  enforceEnvironment(targetEnvironmentId: string): void {
    if (targetEnvironmentId !== this.context.environmentId) {
      throw new Error("RLS violation: environment mismatch");
    }
  }

  enforceAll(target: { organizationId: string; projectId: string; environmentId: string }): void {
    this.enforceOrganization(target.organizationId);
    this.enforceProject(target.projectId);
    this.enforceEnvironment(target.environmentId);
  }
}
