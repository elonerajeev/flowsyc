import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const IS_PROD = process.env.NODE_ENV === "production";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(IS_PROD ? 64 : 32),
  JWT_REFRESH_SECRET: z.string().min(IS_PROD ? 64 : 32),
  FRONTEND_URL: z.string().url().or(z.string().startsWith("http://localhost")).default("http://localhost:8080"),
  COOKIE_SECRET: z.string().min(32),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.boolean().default(false),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_REPLY_TO: z.string().email().optional(),
  HR_EMAIL: z.string().email().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`).join(", ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = parsed.data;

// Email configuration exports
export const smtpConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || "noreply@flowsyc.ct.ws",
  replyTo: process.env.SMTP_REPLY_TO,
  hrEmail: process.env.HR_EMAIL || "hr@flowsyc.ct.ws",
};
