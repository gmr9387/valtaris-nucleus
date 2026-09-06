// services/identity/identityService.ts
// Identity Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";
import { nucleusIdentity } from "../../src/nucleus/identity/identityEngine";
import { nucleusAccess } from "../../src/nucleus/access/accessEngine";
import { nucleusAuth } from "../../src/nucleus/auth/authEngine";
import { nucleusSecrets } from "../../src/nucleus/secrets/secretsEngine";
import { nucleusConfig } from "../../src/nucleus/config/configEngine";
import { nucleusOS } from "../../src/nucleus/os/osEngine";

export class IdentityService {
  async createUser(org: string, name: string, email: string, password: string) {
    const encryptedPassword = nucleusSecrets.set(
      org,
      "identity",
      `${email}.password`,
      password
    );

    const identity = nucleusIdentity.create(org, "identity", name, {
      email,
      passwordVersion: encryptedPassword.version,
    });

    nucleusAccess.define(org, "identity", "user", "login", true);

    return identity;
  }

  async login(org: string, email: string, password: string) {
    const stored = nucleusSecrets.get(org, "identity", `${email}.password`);
    if (!stored) return null;

    if (stored !== password) return null;

    const token = nucleusAuth.issue(org, "identity", email, 3600000);

    return token;
  }

  async createOrg(name: string) {
    const orgId = randomUUID();

    nucleusOS.registerSubsystem(orgId, "identity", "Identity subsystem", [
      "user-management",
      "auth",
      "roles",
      "permissions",
    ]);

    nucleusConfig.set(orgId, "identity", "orgName", name);

    return { orgId, name };
  }

  async assignRole(org: string, email: string, role: string) {
    nucleusAccess.define(org, "identity", role, "login", true);
    nucleusAccess.define(
      org,
      "identity",
      role,
      "manage-users",
      role === "admin"
    );

    return { email, role };
  }

  async getUser(org: string, email: string) {
    const identities = nucleusIdentity.get(org, "identity");
    return identities.find((i) => i.metadata.email === email) ?? null;
  }
}

export const valtarisIdentityService = new IdentityService();
