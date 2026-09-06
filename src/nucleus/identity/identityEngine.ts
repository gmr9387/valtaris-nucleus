// src/nucleus/identity/identityEngine.ts
// Unified constitutional identity engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";

export type IdentityRecord = {
  id: string;
  org: string;
  subject: string; // user, service, subsystem
  roles: string[];
  permissions: string[];
  createdAt: number;
  updatedAt: number;
};

export class IdentityEngine {
  private identities: Map<string, IdentityRecord> = new Map();

  private makeKey(org: string, subject: string) {
    return `${org}.${subject}`;
  }

  register(
    org: string,
    subject: string,
    roles: string[] = [],
    permissions: string[] = []
  ) {
    const key = this.makeKey(org, subject);

    const record: IdentityRecord = {
      id: randomUUID(),
      org,
      subject,
      roles,
      permissions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.identities.set(key, record);

    const prefix = `[IDENTITY][${subject.toUpperCase()}]`;
    console.log(prefix, `Identity registered`);

    return record;
  }

  update(
    org: string,
    subject: string,
    roles?: string[],
    permissions?: string[]
  ) {
    const key = this.makeKey(org, subject);
    const existing = this.identities.get(key);

    if (!existing) return null;

    const updated: IdentityRecord = {
      ...existing,
      roles: roles ?? existing.roles,
      permissions: permissions ?? existing.permissions,
      updatedAt: Date.now(),
    };

    this.identities.set(key, updated);

    const prefix = `[IDENTITY][${subject.toUpperCase()}]`;
    console.log(prefix, `Identity updated`);

    return updated;
  }

  get(org: string, subject: string) {
    const key = this.makeKey(org, subject);
    return this.identities.get(key) ?? null;
  }

  hasRole(org: string, subject: string, role: string) {
    const id = this.get(org, subject);
    return id ? id.roles.includes(role) : false;
  }

  hasPermission(org: string, subject: string, permission: string) {
    const id = this.get(org, subject);
    return id ? id.permissions.includes(permission) : false;
  }

  getAll() {
    return [...this.identities.values()];
  }

  clear() {
    this.identities.clear();
  }
}

export const nucleusIdentity = new IdentityEngine();
