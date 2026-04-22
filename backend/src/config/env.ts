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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`).join(", ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = parsed.data;
