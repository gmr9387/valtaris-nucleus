// src/nucleus/auth/authEngine.ts
// Unified constitutional authentication engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import crypto from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type AuthToken = {
  id: string;
  org: string;
  subsystem: string;
  identity: string;
  token: string;
  createdAt: number;
  expiresAt: number;
};

export class AuthEngine {
  private tokens: Map<string, AuthToken> = new Map();

  issue(org: string, subsystem: string, identity: string, ttlMs: number = 3600000) {
    const id = randomUUID();
    const token = crypto.randomBytes(32).toString("hex");

    const record: AuthToken = {
      id,
      org,
      subsystem,
      identity,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    this.tokens.set(token, record);

    console.log(`[AUTH][${subsystem.toUpperCase()}] Issued token for ${identity}`);

    nucleusAudit.log(org, subsystem, `auth.issue.${identity}`, "auth-engine", {});
    nucleusBilling.recordEvent(org, subsystem, `auth.issue.${identity}`, 1, 0.003, {});

    return record;
  }

  validate(token: string) {
    const record = this.tokens.get(token);
    if (!record) return false;

    const valid = Date.now() < record.expiresAt;

    console.log(`[AUTH][${record.subsystem.toUpperCase()}] Validate token → ${valid}`);

    nucleusAudit.log(record.org, record.subsystem, `auth.validate`, "auth-engine", { valid });
    nucleusBilling.recordEvent(record.org, record.subsystem, `auth.validate`, 1, 0.001, { valid });

    return valid;
  }

  revoke(token: string) {
    const record = this.tokens.get(token);
    if (!record) return null;

    this.tokens.delete(token);

    console.log(`[AUTH][${record.subsystem.toUpperCase()}] Revoked token`);

    nucleusAudit.log(record.org, record.subsystem, `auth.revoke`, "auth-engine", {});
    nucleusBilling.recordEvent(record.org, record.subsystem, `auth.revoke`, 1, 0.002, {});

    return record;
  }

  clear() {
    this.tokens.clear();
  }
}

export const nucleusAuth = new AuthEngine();
