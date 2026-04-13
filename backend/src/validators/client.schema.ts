import { z } from "zod";

// Aliases for backwards compatibility
export const clientStatusSchema = z.enum(["active", "pending", "completed"]);
export const clientTierSchema = z.enum(["Enterprise", "Growth", "Strategic"]);
export const clientSegmentSchema = z.enum(["Expansion", "Renewal", "New Business"]);

// Extended enums for internal use
export const clientTierEnum = clientTierSchema;
export const clientStatusEnum = clientStatusSchema;
export const clientSegmentEnum = clientSegmentSchema;
export const healthGradeEnum = z.enum(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"]);

export const clientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: clientStatusEnum.optional(),
  tier: clientTierEnum.optional(),
  segment: clientSegmentEnum.optional(),
  assignedTo: z.string().optional(),
  minHealthScore: z.coerce.number().int().min(0).max(100).optional(),
  maxHealthScore: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().optional(),
  sort: z.enum(["name", "revenue", "createdAt", "healthScore"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(255).trim(),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  tier: clientTierEnum.optional().default("Growth"),
  status: clientStatusEnum.optional().default("active"),
  segment: clientSegmentEnum.optional().default("New Business"),
  manager: z.string().max(100).optional().nullable(),
  revenue: z.string().max(50).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  nextAction: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  assignedTo: z.string().email().optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  avatar: z.string().max(10).optional(),
  // Health tracking fields
  lastContactDate: z.date().optional().nullable(),
  engagementScore: z.number().int().min(0).max(100).optional().default(50),
  healthScore: z.number().int().min(0).max(100).optional().default(75),
  healthGrade: healthGradeEnum.optional().default("B"),
  contractStartDate: z.date().optional().nullable(),
  contractEndDate: z.date().optional().nullable(),
});

export const updateClientSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  tier: clientTierEnum.optional(),
  status: clientStatusEnum.optional(),
  segment: clientSegmentEnum.optional(),
  manager: z.string().max(100).optional().nullable(),
  revenue: z.string().max(50).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  nextAction: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().email().optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  avatar: z.string().max(10).optional(),
  // Health tracking fields
  lastContactDate: z.date().optional().nullable(),
  engagementScore: z.number().int().min(0).max(100).optional(),
  healthScore: z.number().int().min(0).max(100).optional(),
  healthGrade: healthGradeEnum.optional(),
  contractStartDate: z.date().optional().nullable(),
  contractEndDate: z.date().optional().nullable(),
});

export const updateClientHealthSchema = z.object({
  lastContactDate: z.date().optional(),
  engagementScore: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientQueryInput = z.infer<typeof clientQuerySchema>;
export type UpdateClientHealthInput = z.infer<typeof updateClientHealthSchema>;
