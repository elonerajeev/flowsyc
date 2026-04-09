import crypto from "crypto";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import type { UserRole } from "../config/types";

export type TokenPayload = {
  sub: string;
  email: string;
  role?: UserRole;
  type?: string;
};

export function signAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "24h",
    jwtid: crypto.randomBytes(16).toString("hex"),
  });
}

export function signRefreshToken(payload: TokenPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
    jwtid: crypto.randomBytes(16).toString("hex"),
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload & jwt.JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload & jwt.JwtPayload;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
