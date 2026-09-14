import { z } from "zod";

export const workflowStatusSchema = z.enum(["draft", "active", "archived"]);
export const workflowVersionStatusSchema = z.enum(["draft", "published", "archived"]);
export const workflowRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const workflowStepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const workflowCreateSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
});

export const workflowUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: workflowStatusSchema.optional(),
});

export const workflowDefinitionSchema = z.object({
  steps: z
    .array(
      z.object({
        key: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-zA-Z0-9_.-]+$/),
        label: z.string().min(1).max(120),
        kind: z.string().min(1).max(64).default("task"),
        config: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(200),
});

export const workflowVersionCreateSchema = z.object({
  workflow_id: z.string().uuid(),
  definition: workflowDefinitionSchema,
});

export const runStartSchema = z.object({
  workflow_id: z.string().uuid(),
  version_id: z.string().uuid(),
  input: z.unknown().optional(),
});

export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;
export type WorkflowVersionStatus = z.infer<typeof workflowVersionStatusSchema>;
export type WorkflowRunStatus = z.infer<typeof workflowRunStatusSchema>;
export type WorkflowStepStatus = z.infer<typeof workflowStepStatusSchema>;
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
