import { z } from "zod";

export const leadSourceEnum = z.enum([
  "website",
  "referral",
  "social",
  "linkedin",
  "inbound",
  "cold_call",
  "event",
  "partner",
  "email",
]);

export const leadStatusEnum = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const companySizeEnum = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
]);

export const budgetEnum = z.enum([
  "under_10k",
  "10k_50k",
  "50k_100k",
  "100k_500k",
  "500k_1m",
  "1m+",
]);

export const timelineEnum = z.enum([
  "exploring",
  "1_month",
  "3_months",
  "6_months",
  "immediate",
]);

// Lead creation schema
export const createLeadSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .max(50, "Phone must be less than 50 characters")
    .optional()
    .nullable(),
  company: z
    .string()
    .max(255, "Company must be less than 255 characters")
    .optional()
    .nullable(),
  jobTitle: z
    .string()
    .max(255, "Job title must be less than 255 characters")
    .optional()
    .nullable(),
  source: leadSourceEnum.optional().default("website"),
  status: leadStatusEnum.optional().default("new"),
  score: z
    .number()
    .int()
    .min(0, "Score must be at least 0")
    .max(100, "Score must be at most 100")
    .optional()
    .default(50),
  assignedTo: z
    .string()
    .email("Invalid assignee email")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional()
    .nullable(),
  tags: z.array(z.string()).optional().default([]),
  companySize: companySizeEnum.optional().nullable(),
  budget: budgetEnum.optional().nullable(),
  timeline: timelineEnum.optional().nullable(),
});

// Lead update schema (all fields optional)
export const updateLeadSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .trim()
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(255, "Email must be less than 255 characters")
    .toLowerCase()
    .trim()
    .optional(),
  phone: z
    .string()
    .max(50, "Phone must be less than 50 characters")
    .optional()
    .nullable(),
  company: z
    .string()
    .max(255, "Company must be less than 255 characters")
    .optional()
    .nullable(),
  jobTitle: z
    .string()
    .max(255, "Job title must be less than 255 characters")
    .optional()
    .nullable(),
  source: leadSourceEnum.optional(),
  status: leadStatusEnum.optional(),
  score: z
    .number()
    .int()
    .min(0, "Score must be at least 0")
    .max(100, "Score must be at most 100")
    .optional(),
  assignedTo: z
    .string()
    .email("Invalid assignee email")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional()
    .nullable(),
  tags: z.array(z.string()).optional(),
  companySize: companySizeEnum.optional().nullable(),
  budget: budgetEnum.optional().nullable(),
  timeline: timelineEnum.optional().nullable(),
});

// Lead conversion schema
export const convertLeadSchema = z.object({
  clientName: z
    .string()
    .min(1, "Client name is required")
    .max(255, "Client name must be less than 255 characters")
    .trim(),
  clientEmail: z
    .string()
    .email("Invalid client email")
    .optional()
    .nullable(),
  clientPhone: z
    .string()
    .max(50, "Phone must be less than 50 characters")
    .optional()
    .nullable(),
  tier: z.enum(["Starter", "Growth", "Professional", "Enterprise"]).optional().default("Growth"),
  industry: z
    .string()
    .max(100, "Industry must be less than 100 characters")
    .optional()
    .nullable(),
  revenue: z
    .string()
    .max(50, "Revenue must be less than 50 characters")
    .optional()
    .nullable(),
  location: z
    .string()
    .max(100, "Location must be less than 100 characters")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional()
    .nullable(),
});

// Lead query schema
export const leadQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: leadStatusEnum.optional(),
  source: leadSourceEnum.optional(),
  assignedTo: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["firstName", "lastName", "email", "score", "createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type LeadQueryInput = z.infer<typeof leadQuerySchema>;
