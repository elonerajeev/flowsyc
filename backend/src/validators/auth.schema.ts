import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "manager", "employee", "client"]);
export const signupRoleSchema = z.literal("admin");

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?\":{}|<>]/, "Password must contain at least one special character");

export const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: passwordSchema,
  role: signupRoleSchema.optional().default("admin"),
  organizationName: z.string().min(2).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const acceptInviteSchema = resetPasswordSchema;

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  department: z.string().min(1).max(100).optional(),
  team: z.string().min(1).max(100).optional(),
  designation: z.string().min(1).max(100).optional(),
  manager: z.string().min(1).max(100).optional(),
  workingHours: z.string().min(1).max(50).optional(),
  officeLocation: z.string().min(1).max(100).optional(),
  timeZone: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(100).optional(),
});
