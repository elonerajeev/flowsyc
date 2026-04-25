import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction, RequestHandler } from "express";

// ─── Central switch ───────────────────────────────────────────────────────────
// NODE_ENV=development → all rate limits OFF
// NODE_ENV=production  → all rate limits ON
const isDev = process.env.NODE_ENV !== "production";

// In dev, skip building limiters entirely — avoids IPv6 validation errors at startup
const noOp: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

function resolveKey(req: Request): string {
  const auth = (req as any).auth;
  if (auth?.userId) return `user:${auth.userId}`;
  if (auth?.email)  return `user:${auth.email}`;
  const ip = req.ip ?? "unknown";
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

export const apiRateLimiter: RequestHandler = isDev ? noOp : rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: resolveKey,
  skip: (req) => req.path === "/health" || req.path === "/api/health",
  message: { error: "Too many requests, please try again later." },
});

export const authRateLimiter: RequestHandler = isDev ? noOp : rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

export const sensitiveRateLimiter: RequestHandler = isDev ? noOp : rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: resolveKey,
  message: { error: "Too many attempts, please try again later." },
});

export const uploadRateLimiter: RequestHandler = isDev ? noOp : rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: resolveKey,
  message: { error: "Upload limit reached, please try again later." },
});

export const writeRateLimiter: RequestHandler = isDev ? noOp : rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: resolveKey,
  skip: (req) => req.method === "GET" || req.method === "HEAD",
  message: { error: "Too many write operations, please slow down." },
});
