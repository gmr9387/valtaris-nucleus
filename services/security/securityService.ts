// services/security/securityService.ts
// Security Service built on top of the Valtaris Nucleus.

import { randomUUID } from "crypto";

import { nucleusSecrets } from "../../src/nucleus/secrets/secretsEngine";
import { nucleusKeys } from "../../src/nucleus/keys/keyEngine";
import { nucleusAccess } from "../../src/nucleus/access/accessEngine";
import { nucleusAuth } from "../../src/nucleus/auth/authEngine";
import { nucleusIdentity } from "../../src/nucleus/identity/identityEngine";
import { nucleusAudit } from "../../src/nucleus/audit/auditEngine";
import { nucleusBilling } from "../../src/nucleus/billing/billingEngine";

export class SecurityService {
  async storeSecret(org: string, name: string, value: string) {
    const secret = nucleusSecrets.set(org, "security", name, value);

    nucleusAudit.log(org, "security", "secret.store", "security-service", {
      name,
      version: secret.version,
    });

    nucleusBilling.recordEvent(org, "security", "secret.store", 1, 0.002, {
      name,
    });

    return secret;
  }

  async getSecret(org: string, name: string) {
    return nucleusSecrets.get(org, "security", name);
  }

  async generateKey(org: string, name: string) {
    const keyId = randomUUID();

    const key = nucleusKeys.generate(org, "security", name);

    nucleusAudit.log(org, "security", "key.generate", "security-service", {
      keyId,
      name,
    });

    return { keyId, key };
  }

  async verifyAccess(org: string, role: string, action: string) {
    const allowed = nucleusAccess.check(org, "security", role, action);

    nucleusAudit.log(org, "security", "access.verify", "security-service", {
      role,
      action,
      allowed,
    });

    return allowed;
  }

  async verifyToken(org: string, token: string) {
    return nucleusAuth.verify(org, "security", token);
  }

  async verifyIdentity(org: string, email: string) {
    const identities = nucleusIdentity.get(org, "security");
    return identities.find((i) => i.metadata.email === email) ?? null;
  }
}

export const valtarisSecurityService = new SecurityService();
