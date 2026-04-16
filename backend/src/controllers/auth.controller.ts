import type { Request, Response } from "express";

import { authService } from "../services/auth.service";
import { AppError } from "../middleware/error.middleware";
import { logAudit } from "../utils/audit";
import { env } from "../config/env";
import { verifyAccessToken, signAccessToken, signPasswordResetToken, verifyPasswordResetToken } from "../utils/jwt";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email-templates";
import { hashPassword } from "../utils/password";
import { prisma } from "../config/prisma";

const IS_PROD = env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
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
    res.status(201).json({ user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken });
  },

  forgotPassword: async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      throw new AppError("Email required", 400, "BAD_REQUEST");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      res.status(200).json({ message: "If the email exists, a reset link has been sent" });
      return;
    }

    const resetToken = signPasswordResetToken({ sub: user.id, email: user.email, type: 'password_reset' });
    await sendPasswordResetEmail({ name: user.name, email: user.email }, resetToken);

    res.status(200).json({ message: "If the email exists, a reset link has been sent" });
  },

  resetPassword: async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new AppError("Token and new password required", 400, "BAD_REQUEST");
    }

    let payload: ReturnType<typeof verifyPasswordResetToken>;
    try {
      payload = verifyPasswordResetToken(token);
      if (!payload || typeof payload !== 'object' || !('type' in payload) || payload.type !== 'password_reset' || !('sub' in payload)) {
        throw new AppError("Invalid token", 400, "INVALID_TOKEN");
      }
    } catch {
      res.status(400).json({ error: "Invalid or expired token" });
      return;
    }

    const userId = payload.sub as string;
    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });

      await tx.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
    });

    await logAudit({
      userId,
      action: "update",
      entity: "User",
      entityId: userId,
      detail: "Password reset",
    });

    res.status(200).json({ message: "Password reset successfully" });
  },

  verifyEmail: async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;
    if (!token) {
      throw new AppError("Token required", 400, "BAD_REQUEST");
    }

    let payload: ReturnType<typeof verifyPasswordResetToken>;
    try {
      payload = verifyPasswordResetToken(token);
      if (!payload || typeof payload !== 'object' || !('type' in payload) || payload.type !== 'email_verification' || !('sub' in payload)) {
        throw new AppError("Invalid token", 400, "INVALID_TOKEN");
      }
    } catch {
      res.status(400).json({ error: "Invalid or expired token" });
      return;
    }

    const userId = payload.sub as string;
    
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      res.status(400).json({ error: "Invalid or expired token" });
      return;
    }
    
    if (existingUser.emailVerified) {
      res.status(200).json({ message: "Email already verified" });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    await logAudit({
      userId,
      action: "update",
      entity: "User",
      entityId: userId,
      detail: "Email verified",
    });

    res.status(200).json({ message: "Email verified successfully" });
  },

  resendVerification: async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: "Email already verified" });
      return;
    }

    const verificationToken = signPasswordResetToken({ sub: user.id, email: user.email, type: 'email_verification' });
    await sendVerificationEmail({ name: user.name, email: user.email }, verificationToken);

    res.status(200).json({ message: "Verification email sent" });
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
