import { z } from "zod";

const teamPermissionsSchema = z.record(z.string().min(1), z.boolean());

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  permissions: teamPermissionsSchema.optional(),
});

export const updateTeamSchema = createTeamSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);
