import type { Request, Response } from "express";

import { authService } from "../services/auth.service";
import { logAudit } from "../utils/audit";
import { env } from "../config/env";

const IS_PROD = env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 mins
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_EXPIRY,
  });
  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_EXPIRY,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", { ...COOKIE_OPTIONS });
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS });
}

export const authController = {
  signup: async (req: Request, res: Response): Promise<void> => {
    const session = await authService.signup(req.body);
    await logAudit({
      userId: session.user.id,
      userName: session.user.name,
      action: "create",
      entity: "User",
      entityId: session.user.id,
      detail: `Signed up: ${session.user.email}`,
    });
    setAuthCookies(res, session.accessToken!, session.refreshToken!);
    res.status(201).json({ user: session.user, accessToken: session.accessToken });
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const session = await authService.login(req.body);
    await logAudit({ userId: session.user.id, userName: session.user.name, action: "login", entity: "Auth", detail: "Login" });
    setAuthCookies(res, session.accessToken!, session.refreshToken!);
    res.status(200).json({ user: session.user, accessToken: session.accessToken });
  },

  me: async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing session" } });
      return;
    }

    const bearerToken = req.cookies.accessToken || req.headers.authorization?.slice("Bearer ".length) || "";
    const session = await authService.me(req.auth.userId, bearerToken);
    res.status(200).json(session);
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    if (req.auth) {
      await authService.logout(req.auth.userId);
      await logAudit({ userId: req.auth.userId, userName: req.auth.email, action: "logout", entity: "Auth", detail: "Logged out" });
    }
    clearAuthCookies(res);
    res.status(200).json({ message: "Logged out successfully" });
  },

  refresh: async (req: Request, res: Response): Promise<void> => {
    const refreshToken = String(req.cookies.refreshToken || req.body?.refreshToken || "");
    const session = await authService.refresh(refreshToken);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.status(200).json({ user: session.user });
  },

  updateProfile: async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing session" } });
      return;
    }
    const user = await authService.updateProfile(req.auth.userId, req.auth.role, req.body);
    await logAudit({
      userId: req.auth.userId,
      userName: user.name,
      action: "update",
      entity: "User",
      entityId: user.id,
      detail: "Updated profile",
    });
    res.status(200).json({ user });
  },

  switchRole: async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing session" } });
      return;
    }
    const { targetRole } = req.body;
    const user = await authService.switchRole(req.auth.userId, targetRole);
    res.status(200).json({ user });
  },
};
