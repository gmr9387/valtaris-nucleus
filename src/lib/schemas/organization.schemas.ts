import { z } from "zod";

export const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(60, "Slug is too long")
  .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and dashes only");

export const orgRoleSchema = z.enum(["owner", "admin", "manager", "operator", "viewer"]);

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
});

export const updateOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
});

export type OrgRole = z.infer<typeof orgRoleSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
