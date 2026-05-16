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
  owner:  z.string().trim().min(1).max(120),
  repos:  z.array(z.string().trim().min(1).max(160)).min(1, "Select at least one repo").max(20),
  token:  z.string().trim().min(20).max(500),
  scope:  z.enum(["org", "user"]).default("user"),
  webhookSecret:         z.string().trim().min(8).max(300).optional(),
  webhookOrganizationId: z.string().trim().min(1).max(120).optional(),
});
