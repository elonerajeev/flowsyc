import { UserRole, type PaymentMode as DbPaymentMode } from "@prisma/client";
import crypto from "crypto";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { buildProfile } from "../utils/employee-profile";
import { fromDbPaymentMode, toDbPaymentMode } from "../utils/payment-mode";
import { comparePassword, hashPassword } from "../utils/password";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from "../utils/jwt";
import { sendWelcomeEmail } from "../utils/email-templates";
import type { AuthUser } from "../config/types";

type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
};

type SignupRole = "employee" | "client";

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId: string;
  department: string;
  team: string;
  designation: string;
  manager: string;
  workingHours: string;
  officeLocation: string;
  timeZone: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  paymentMode: DbPaymentMode;
  payrollCycle: string;
  payrollDueDate: string;
  joinedAt: string;
  location: string;
}): AuthUser {
  return {
    ...user,
    paymentMode: fromDbPaymentMode(user.paymentMode),
  };
}

function generateEmployeeId(role: UserRole) {
  const prefix = role === "client" ? "CLT" : "EMP";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

async function persistRefreshToken(userId: string, token: string) {
  await prisma.refreshToken.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

async function createSession(userId: string, email: string, role: UserRole): Promise<{ accessToken: string; refreshToken: string }> {
  const payload: TokenPayload = { sub: userId, email, role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await persistRefreshToken(userId, refreshToken);
  return { accessToken, refreshToken };
}

export const authService = {
  async signup(input: { name: string; email: string; password: string; role: SignupRole }): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError("Email already exists", 409, "CONFLICT");
    }

    const profile = buildProfile(input.role);
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        ...profile,
        employeeId: generateEmployeeId(input.role),
        paymentMode: toDbPaymentMode(profile.paymentMode),
        updatedAt: new Date(),
      },
    });

    const session = await createSession(user.id, user.email, user.role);

    // Fire-and-forget welcome email
    sendWelcomeEmail({ name: user.name, email: user.email, role: user.role }).catch(() => {});

    return {
      user: toAuthUser(user),
      ...session,
    };
  },

  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.deletedAt) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const matches = await comparePassword(input.password, user.passwordHash);
    if (!matches) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const session = await createSession(user.id, user.email, user.role);
    return {
      user: toAuthUser(user),
      ...session,
    };
  },

  async me(userId: string, accessToken: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new AppError("User not found", 404, "NOT_FOUND");
    }

    return {
      user: toAuthUser(user),
      accessToken,
    };
  },

  async logout(userId: string) {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  },

  async updateProfile(userId: string, input: {
    name?: string;
    department?: string;
    team?: string;
    designation?: string;
    manager?: string;
    workingHours?: string;
    officeLocation?: string;
    timeZone?: string;
    location?: string;
  }): Promise<AuthUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
    });
    return toAuthUser(user);
  },

  async refresh(refreshToken: string) {
    let verifiedToken: TokenPayload;
    try {
      verifiedToken = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { User: true },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.User.deletedAt ||
      stored.User.id !== verifiedToken.sub ||
      stored.User.email !== verifiedToken.email ||
      stored.User.role !== verifiedToken.role
    ) {
      throw new AppError("Invalid refresh token", 401, "UNAUTHORIZED");
    }

    const session = await createSession(stored.User.id, stored.User.email, stored.User.role);
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return {
      user: toAuthUser(stored.User),
      ...session,
    };
  },

  async switchRole(userId: string, targetRole: UserRole): Promise<AuthUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new AppError("User not found", 404, "NOT_FOUND");
    }

    // Only admin can switch to any role
    if (user.role !== "admin" && user.role !== targetRole) {
      throw new AppError("Access denied. Only admins can switch roles.", 403, "FORBIDDEN");
    }

    // For admin, return user with target role (view-only switch, doesn't modify DB)
    // For others, just return their actual role
    return toAuthUser({ ...user, role: targetRole });
  },
};
