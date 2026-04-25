import { z } from "zod";

const activityEntityTypeSchema = z.enum(["lead", "client", "deal"]);
const activityTypeSchema = z.enum(["email", "call", "meeting", "note", "stage_change", "task", "other"]);

export const createActivitySchema = z.object({
  entityType: activityEntityTypeSchema,
  entityId: z.number().int().positive(),
  type: activityTypeSchema,
  title: z.string().trim().min(1).max(240),
  description: z.string().max(4000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
