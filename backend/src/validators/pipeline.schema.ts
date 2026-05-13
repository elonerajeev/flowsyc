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

export const upsertGitHubConfigSchema = z.object({
  owner: z.string().trim().min(1).max(120),
  repo: z.string().trim().min(1).max(160),
  token: z.string().trim().min(20).max(500),
  webhookSecret: z.string().trim().min(8).max(300).optional(),
  webhookOrganizationId: z.string().trim().min(1).max(120).optional(),
});
