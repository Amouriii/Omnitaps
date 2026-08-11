import { z } from "zod";

export const reviewFeedbackSchema = z.object({
  tenantId: z.string().trim().min(1).max(128),
  rating: z.number().int().min(1).max(3),
  name: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().max(254).optional().default(""),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
  gateVisitId: z.string().trim().min(1).max(128).optional(),
});

export const reviewVisitSchema = z.object({
  tenantId: z.string().trim().min(1).max(128),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  googleRedirected: z.boolean().optional().default(false),
  routePath: z.string().trim().max(500).optional().default(""),
});

export function parseWithSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Invalid request payload.",
      issues: result.error.issues,
    };
  }
  return { success: true, data: result.data };
}
