import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
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

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Upload limit reached, please try again later." },
});
