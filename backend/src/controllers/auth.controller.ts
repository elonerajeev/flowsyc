import type { Request, Response } from "express";

import { authService } from "../services/auth.service";
import { logAudit } from "../utils/audit";

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
    res.status(201).json(session);
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const session = await authService.login(req.body);
    await logAudit({ userId: session.user.id, userName: session.user.name, action: "login", entity: "Auth", detail: "Login" });
    res.status(200).json(session);
  },

  me: async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing session" } });
      return;
    }

    const bearerToken = req.headers.authorization?.slice("Bearer ".length) ?? "";
    const session = await authService.me(req.auth.userId, bearerToken);
    res.status(200).json(session);
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    if (req.auth) {
      await authService.logout(req.auth.userId);
      await logAudit({ userId: req.auth.userId, userName: req.auth.email, action: "logout", entity: "Auth", detail: "Logged out" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  },

  refresh: async (req: Request, res: Response): Promise<void> => {
    const refreshToken = String(req.body?.refreshToken ?? "");
    const session = await authService.refresh(refreshToken);
    res.status(200).json(session);
  },

  updateProfile: async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing session" } });
      return;
    }
    const user = await authService.updateProfile(req.auth.userId, req.body);
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
