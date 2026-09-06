// src/nucleus/secrets/secretsEngine.ts
// Unified constitutional secrets engine for the entire Valtaris ecosystem.

import { randomUUID } from "crypto";
import crypto from "crypto";
import { nucleusAudit } from "../audit/auditEngine";
import { nucleusBilling } from "../billing/billingEngine";

export type SecretRecord = {
  id: string;
  org: string;
  subsystem: string;
  key: string;
  encrypted: string;
  version: number;
  createdAt: number;
};

export class SecretsEngine {
  private secrets: Map<string, SecretRecord> = new Map();
  private masterKey: Buffer;

  constructor() {
    this.masterKey = crypto.randomBytes(32); // AES-256
  }

  private makeKey(org: string, subsystem: string, key: string) {
    return `${org}.${subsystem}.${key}`;
  }

  private encrypt(value: string) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  private decrypt(encrypted: string) {
    const [ivHex, dataHex] = encrypted.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encryptedData = Buffer.from(dataHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.masterKey, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString("utf8");
  }

  set(org: string, subsystem: string, key: string, value: string) {
    const compositeKey = this.makeKey(org, subsystem, key);
    const existing = this.secrets.get(compositeKey);

    const encrypted = this.encrypt(value);

    const record: SecretRecord = {
      id: existing?.id ?? randomUUID(),
      org,
      subsystem,
      key,
      encrypted,
      version: existing ? existing.version + 1 : 1,
      createdAt: Date.now(),
    };

    this.secrets.set(compositeKey, record);

    console.log(`[SECRETS][${subsystem.toUpperCase()}] Set ${key}`);

    nucleusAudit.log(org, subsystem, `secrets.set.${key}`, "secrets-engine", {
      version: record.version,
    });

    nucleusBilling.recordEvent(
      org,
      subsystem,
      `secrets.set.${key}`,
      1,
      0.003, // $0.003 per secret write
      { version: record.version }
    );

    return record;
  }

  get(org: string, subsystem: string, key: string) {
    const record = this.secrets.get(this.makeKey(org, subsystem, key));
    if (!record) return null;
    return this.decrypt(record.encrypted);
  }

  rotateMasterKey() {
    this.masterKey = crypto.randomBytes(32);
    console.log(`[SECRETS] Master key rotated`);

    nucleusAudit.log("system", "secrets", "secrets.rotateMasterKey", "secrets-engine", {});
    nucleusBilling.recordEvent("system", "secrets", "secrets.rotateMasterKey", 1, 0.01, {});
  }

  getRecords(org?: string, subsystem?: string) {
    return [...this.secrets.values()].filter((s) => {
      if (org && s.org !== org) return false;
      if (subsystem && s.subsystem !== subsystem) return false;
      return true;
    });
  }

  clear() {
    this.secrets.clear();
  }
}

export const nucleusSecrets = new SecretsEngine();
