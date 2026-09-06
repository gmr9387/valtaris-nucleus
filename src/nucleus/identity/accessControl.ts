// src/nucleus/identity/accessControl.ts
// Unified constitutional access control engine for the entire Valtaris ecosystem.

import { nucleusIdentity } from "./identityEngine";

export type AccessDecision = {
  org: string;
  subject: string;
  resource: string;
  action: string;
  allowed: boolean;
  reason: string;
  timestamp: number;
};

export class AccessControl {
  private decisions: AccessDecision[] = [];

  check(
    org: string,
    subject: string,
    resource: string,
    action: string
  ): AccessDecision {
    const identity = nucleusIdentity.get(org, subject);

    if (!identity) {
      return this.record(org, subject, resource, action, false, "Identity not found");
    }

    // Permission format: `${resource}:${action}`
    const requiredPermission = `${resource}:${action}`;

    const allowed = identity.permissions.includes(requiredPermission);

    const reason = allowed
      ? "Permission granted"
      : `Missing permission: ${requiredPermission}`;

    return this.record(org, subject, resource, action, allowed, reason);
  }

  private record(
    org: string,
    subject: string,
    resource: string,
    action: string,
    allowed: boolean,
    reason: string
  ): AccessDecision {
    const decision: AccessDecision = {
      org,
      subject,
      resource,
      action,
      allowed,
      reason,
      timestamp: Date.now(),
    };

    this.decisions.push(decision);

    const prefix = `[ACCESS][${subject.toUpperCase()}]`;
    console.log(prefix, `${resource}.${action} → ${allowed ? "ALLOWED" : "DENIED"}`, reason);

    return decision;
  }

  getAll() {
    return [...this.decisions];
  }

  getBySubject(subject: string) {
    return this.decisions.filter((d) => d.subject === subject);
  }

  getByResource(resource: string) {
    return this.decisions.filter((d) => d.resource === resource);
  }

  clear() {
    this.decisions = [];
  }
}

export const nucleusAccess = new AccessControl();
