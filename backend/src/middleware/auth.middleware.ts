import type { NextFunction, Request, Response } from "express";

import { AppError } from "./error.middleware";
import { verifyAccessToken } from "../utils/jwt";
import type { UserRole } from "../config/types";
import { setCurrentUser } from "../utils/request-context";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  // 1. Try to get token from cookie
  // 2. Fallback to Authorization header
  const token = req.cookies?.accessToken || req.headers.authorization?.slice("Bearer ".length);

  if (!token) {
    return next(new AppError("Missing auth token", 401, "UNAUTHORIZED"));
  }

  try {
    const payload = verifyAccessToken(token);
    const auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
    };

    req.auth = auth;

    setCurrentUser({
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
    });

    next();
  } catch {
    next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }
    if (!roles.includes(req.auth.role)) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }
    next();
  };
}
