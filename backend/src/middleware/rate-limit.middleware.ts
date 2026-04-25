import rateLimit from "express-rate-limit";
import type { Request } from "express";

function resolveKey(req: Request): string {
  // Per-user rate limiting when authenticated; fall back to IP
  const auth = (req as any).auth;
  if (auth?.userId) return `user:${auth.userId}`;
  if (auth?.email) return `user:${auth.email}`;
  return req.ip ?? "unknown";
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: resolveKey,
  skip: (req) => req.path === "/health" || req.path === "/api/health",
  message: { error: "Too many requests, please try again later." },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // 20 login attempts per 15 min
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 attempts per hour for sensitive operations
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour


export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: resolveKey,
  message: { error: "Too many attempts, please try again later." },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: resolveKey,
  message: { error: "Upload limit reached, please try again later." },
});

// Strict per-user write rate limiter for mutation endpoints (POST/PATCH/DELETE)
export const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: resolveKey,
  skip: (req) => req.method === "GET" || req.method === "HEAD",
  message: { error: "Too many write operations, please slow down." },
});
