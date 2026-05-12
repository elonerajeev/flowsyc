import { z } from "zod";

export const listPipelinesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  branch: z.string().trim().max(120).optional(),
  workflow: z.string().trim().max(200).optional(),
  status: z.enum(["success", "failed", "running", "cancelled", "queued", "unknown"]).optional(),
});

export const syncPipelinesBodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30).optional(),
});
