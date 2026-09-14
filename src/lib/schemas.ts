import { z } from "zod";

export const credentialStatusSchema = z.enum(["active", "rotating", "deactivated"]);

export const connectorCategorySchema = z.enum([
  "ai",
  "payments",
  "messaging",
  "social",
  "database",
  "universal",
  "other",
]);

export const connectorStatusSchema = z.enum(["available", "beta", "deprecated"]);

export const bindingStatusSchema = z.enum(["active", "paused", "error"]);

export const healthStatusSchema = z.enum(["healthy", "degraded", "failed", "unknown"]);

export const rotationReasonSchema = z.enum([
  "scheduled",
  "manual",
  "compromised",
  "policy",
  "initial",
]);

const nullableUuid = z
  .string()
  .uuid()
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const secretValueSchema = z
  .string()
  .min(8, "Secret must be at least 8 characters")
  .max(8192, "Secret is too large")
  .refine((value) => value.trim().length >= 8, {
    message: "Secret cannot be blank or mostly whitespace",
  });

export const createCredentialSchema = z
  .object({
    organization_id: z.string().uuid(),
    provider_id: z.string().uuid(),
    project_id: nullableUuid,
    environment_id: nullableUuid,
    label: z.string().trim().min(2).max(120),
    initial_secret: secretValueSchema,
  })
  .superRefine((value, ctx) => {
    if (value.environment_id && !value.project_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["project_id"],
        message: "Project scope is required when environment scope is provided",
      });
    }
  });

export const rotateCredentialSchema = z.object({
  credential_id: z.string().uuid(),
  new_secret: secretValueSchema,
  reason: rotationReasonSchema.default("manual"),
});

export const deactivateCredentialSchema = z.object({
  credential_id: z.string().uuid(),
});

export const createBindingSchema = z
  .object({
    organization_id: z.string().uuid(),
    connector_id: z.string().uuid(),
    credential_id: nullableUuid,
    project_id: nullableUuid,
    environment_id: nullableUuid,
  })
  .superRefine((value, ctx) => {
    if (value.environment_id && !value.project_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["project_id"],
        message: "Project scope is required when environment scope is provided",
      });
    }
  });

export type CredentialStatus = z.infer<typeof credentialStatusSchema>;
export type ConnectorCategory = z.infer<typeof connectorCategorySchema>;
export type ConnectorStatus = z.infer<typeof connectorStatusSchema>;
export type BindingStatus = z.infer<typeof bindingStatusSchema>;
export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type RotationReason = z.infer<typeof rotationReasonSchema>;

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
export type RotateCredentialInput = z.infer<typeof rotateCredentialSchema>;
export type DeactivateCredentialInput = z.infer<typeof deactivateCredentialSchema>;
export type CreateBindingInput = z.infer<typeof createBindingSchema>;

/**
 * Build a redacted preview for a raw secret.
 * Never persists the raw value.
 */
export function buildRedactedPreview(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed.length <= 8) return "••••";

  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}
