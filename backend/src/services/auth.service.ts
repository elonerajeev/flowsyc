import { logger } from "../utils/logger";
import { type PaymentMode as DbPaymentMode } from "@prisma/client";
import crypto from "crypto";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { buildProfile } from "../utils/employee-profile";
import { fromDbPaymentMode, toDbPaymentMode } from "../utils/payment-mode";
import { comparePassword, hashPassword } from "../utils/password";
import { hashToken, signAccessToken, signRefreshToken, signInviteSetupToken, signPasswordResetToken, verifyPasswordResetToken, verifyRefreshToken, type TokenPayload } from "../utils/jwt";
import { sendEmployeeInviteEmail, sendVerificationEmail } from "../utils/email-templates";
import type { AuthUser, UserRole as AppUserRole } from "../config/types";

type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
};

type SignupRole = "admin";

type TeamMemberRole = "Admin" | "Manager" | "Employee";

type InviteActor = {
  userId?: string;
  email: string;
  role: AppUserRole;
  organizationId?: string;
} | null | undefined;

type TeamMemberProvisionInput = {
  teamMemberId: number;
  userId?: string | null;
  teamMemberRole: TeamMemberRole;
  name: string;
  email: string;
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
  paymentMode: "bank-transfer" | "cash" | "upi";
  location: string;
  organizationId: string;
};

type DisableUserInput = {
  organizationId: string;
  userId?: string | null;
  email?: string | null;
};

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: AppUserRole;
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
  organizationId?: string | null;
}): AuthUser {
  const paymentMode = fromDbPaymentMode(user.paymentMode);

  if (user.role === "client") {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      employeeId: user.employeeId || "CLT",
      department: "Client",
      team: "",
      designation: "Client Contact",
      manager: "Account Team",
      workingHours: "",
      officeLocation: "",
      timeZone: user.timeZone,
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
      paymentMode,
      payrollCycle: "",
      payrollDueDate: "",
      joinedAt: user.joinedAt,
      location: user.location,
      organizationId: user.organizationId ?? undefined,
    };
  }

  return {
    ...user,
    paymentMode,
    organizationId: user.organizationId ?? undefined,
  };
}

function generateEmployeeId(role: AppUserRole) {
  const prefix = role === "client" ? "CLT" : "EMP";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

function mapTeamMemberRoleToUserRole(role: TeamMemberRole): Exclude<AppUserRole, "client"> {
  if (role === "Admin") return "admin";
  if (role === "Manager") return "manager";
  return "employee";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function resolveInviteExpiryDate(token: string) {
  const payload = verifyPasswordResetToken(token);
  if (typeof payload.exp === "number") {
    return new Date(payload.exp * 1000);
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
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

async function createSession(userId: string, email: string, role: AppUserRole, organizationId?: string): Promise<{ accessToken: string; refreshToken: string }> {
  const payload: TokenPayload = { sub: userId, email, role, organizationId };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await persistRefreshToken(userId, refreshToken);
  return { accessToken, refreshToken };
}

export const authService = {
  async provisionInvitedUserFromTeamMember(
    input: TeamMemberProvisionInput,
    actor: InviteActor,
  ): Promise<{ userId: string; invitationSent: boolean; status: "invited" | "already_active" | "invited_existing_user" }> {
    if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }
    if (!actor.organizationId || actor.organizationId !== input.organizationId) {
      throw new AppError("Invalid organization context", 403, "FORBIDDEN");
    }
    if (actor.role === "manager" && input.teamMemberRole !== "Employee") {
      throw new AppError("Managers can only invite employee accounts", 403, "FORBIDDEN");
    }

    const userRole = mapTeamMemberRoleToUserRole(input.teamMemberRole);
    const normalizedEmail = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    const userProfile = {
      department: input.department,
      team: input.team,
      designation: input.designation,
      manager: input.manager,
      workingHours: input.workingHours,
      officeLocation: input.officeLocation,
      timeZone: input.timeZone,
      baseSalary: input.baseSalary,
      allowances: input.allowances,
      deductions: input.deductions,
      paymentMode: toDbPaymentMode(input.paymentMode),
      location: input.location,
    };

    let user:
      | {
          id: string;
          email: string;
          name: string;
          role: AppUserRole;
          organizationId: string | null;
          emailVerified: boolean;
        }
      | null = null;

    if (existing) {
      if (existing.organizationId !== input.organizationId) {
        throw new AppError("This email belongs to another organization", 409, "CROSS_ORG_EMAIL");
      }
      if (existing.role === "client") {
        throw new AppError("Client accounts cannot be linked as team members", 409, "INVALID_ROLE");
      }

      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          role: userRole,
          deletedAt: null,
          organizationId: input.organizationId,
          updatedAt: new Date(),
          ...userProfile,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          emailVerified: true,
        },
      });

      if (user.emailVerified) {
        return { userId: user.id, invitationSent: false, status: "already_active" };
      }
    } else {
      user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          email: normalizedEmail,
          passwordHash: await hashPassword(crypto.randomUUID() + crypto.randomBytes(16).toString("hex")),
          emailVerified: false,
          role: userRole,
          employeeId: generateEmployeeId(userRole),
          payrollCycle: "monthly",
          payrollDueDate: "",
          joinedAt: new Date().toISOString().split("T")[0],
          organizationId: input.organizationId,
          updatedAt: new Date(),
          ...userProfile,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          emailVerified: true,
        },
      });
    }

    const token = signInviteSetupToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ?? undefined,
      type: "invite_setup",
    });

    const tokenHash = hashToken(token);
    const expiresAt = resolveInviteExpiryDate(token);

    await prisma.$transaction(async (tx) => {
      await tx.inviteToken.updateMany({
        where: {
          userId: user!.id,
          type: "invite_setup",
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.inviteToken.create({
        data: {
          userId: user!.id,
          organizationId: user!.organizationId,
          email: user!.email,
          tokenHash,
          type: "invite_setup",
          createdBy: actor.userId ?? actor.email,
          expiresAt,
        },
      });
    });

    await sendEmployeeInviteEmail({
      name: user.name,
      email: user.email,
      token,
      inviterName: actor.email,
    });

    return {
      userId: user.id,
      invitationSent: true,
      status: existing ? "invited_existing_user" : "invited",
    };
  },

  async completeInviteSetup(token: string, newPassword: string): Promise<{ userId: string; email: string }> {
    let payload: ReturnType<typeof verifyPasswordResetToken>;
    try {
      payload = verifyPasswordResetToken(token);
    } catch {
      throw new AppError("Invalid or expired token", 400, "INVALID_TOKEN");
    }

    if (!payload?.sub || payload.type !== "invite_setup") {
      throw new AppError("Invalid invite token", 400, "INVALID_TOKEN");
    }

    const tokenHash = hashToken(token);
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!inviteToken || inviteToken.type !== "invite_setup") {
      throw new AppError("Invite is no longer valid", 400, "INVALID_TOKEN");
    }
    if (inviteToken.usedAt || inviteToken.expiresAt <= new Date()) {
      throw new AppError("Invite is no longer valid", 400, "INVALID_TOKEN");
    }

    const user = inviteToken.user;
    if (!user || user.deletedAt) {
      throw new AppError("Invite is no longer valid", 400, "INVALID_TOKEN");
    }
    if (String(payload.sub) !== user.id) {
      throw new AppError("Invite is no longer valid", 400, "INVALID_TOKEN");
    }
    if (payload.email && normalizeEmail(payload.email) !== normalizeEmail(user.email)) {
      throw new AppError("Invite is no longer valid", 400, "INVALID_TOKEN");
    }
    if (normalizeEmail(inviteToken.email) !== normalizeEmail(user.email)) {
      throw new AppError("Invite is no longer valid", 400, "INVALID_TOKEN");
    }
    if (payload.organizationId && user.organizationId && payload.organizationId !== user.organizationId) {
      throw new AppError("Invite is no longer valid", 400, "INVALID_TOKEN");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          emailVerified: true,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.inviteToken.update({
        where: { id: inviteToken.id },
        data: { usedAt: new Date() },
      });

      await tx.inviteToken.updateMany({
        where: {
          userId: user.id,
          type: "invite_setup",
          usedAt: null,
          id: { not: inviteToken.id },
        },
        data: { usedAt: new Date() },
      });
    });

    return { userId: user.id, email: user.email };
  },

  async deactivateUserFromTeamMember(input: DisableUserInput): Promise<string | null> {
    const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
    const user =
      input.userId
        ? await prisma.user.findUnique({ where: { id: input.userId } })
        : normalizedEmail
          ? await prisma.user.findFirst({
              where: {
                email: normalizedEmail,
                organizationId: input.organizationId,
                deletedAt: null,
              },
            })
          : null;

    if (!user) {
      return null;
    }

    if (user.organizationId && user.organizationId !== input.organizationId) {
      throw new AppError("Cross-organization user operation blocked", 403, "FORBIDDEN");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.inviteToken.updateMany({
        where: {
          userId: user.id,
          type: "invite_setup",
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
    });

    return user.id;
  },

  async syncUserFromTeamMember(
    input: TeamMemberProvisionInput,
    actor: InviteActor,
  ): Promise<{ userId: string }> {
    if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }
    if (!actor.organizationId || actor.organizationId !== input.organizationId) {
      throw new AppError("Invalid organization context", 403, "FORBIDDEN");
    }
    if (actor.role === "manager" && input.teamMemberRole !== "Employee") {
      throw new AppError("Managers can only manage employee accounts", 403, "FORBIDDEN");
    }

    const userRole = mapTeamMemberRoleToUserRole(input.teamMemberRole);
    const normalizedEmail = normalizeEmail(input.email);
    const userProfile = {
      department: input.department,
      team: input.team,
      designation: input.designation,
      manager: input.manager,
      workingHours: input.workingHours,
      officeLocation: input.officeLocation,
      timeZone: input.timeZone,
      baseSalary: input.baseSalary,
      allowances: input.allowances,
      deductions: input.deductions,
      paymentMode: toDbPaymentMode(input.paymentMode),
      location: input.location,
    };

    const existingById = input.userId
      ? await prisma.user.findUnique({ where: { id: input.userId } })
      : null;
    const existingByEmail = !existingById
      ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
      : null;
    const existing = existingById ?? existingByEmail;

    if (!existing) {
      const provisioned = await authService.provisionInvitedUserFromTeamMember(input, actor);
      return { userId: provisioned.userId };
    }

    if (existing.organizationId !== input.organizationId) {
      throw new AppError("This user belongs to another organization", 409, "CROSS_ORG_USER");
    }
    if (existing.role === "client") {
      throw new AppError("Client accounts cannot be linked as team members", 409, "INVALID_ROLE");
    }

    if (normalizedEmail !== existing.email) {
      const emailOwner = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (emailOwner && emailOwner.id !== existing.id) {
        throw new AppError("Email is already used by another user", 409, "CONFLICT");
      }
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        email: normalizedEmail,
        role: userRole,
        deletedAt: null,
        organizationId: input.organizationId,
        updatedAt: new Date(),
        ...userProfile,
      },
      select: { id: true },
    });

    return { userId: updated.id };
  },

  async createSession(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
    return createSession(user.id, user.email, user.role as AppUserRole, user.organizationId ?? undefined);
  },

  async signup(input: { name: string; email: string; password: string; role?: SignupRole; organizationName?: string }): Promise<AuthResponse> {
    const normalizedEmail = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new AppError("Email already exists", 409, "CONFLICT");
    }

    const role: SignupRole = "admin";
    const organizationName = input.organizationName?.trim();
    const resolvedOrganizationName = organizationName && organizationName.length >= 2
      ? organizationName
      : `${input.name}'s Organization`;

    const { user, session } = await prisma.$transaction(async (tx) => {
      const org = await (tx as any).organization.create({
        data: {
          id: crypto.randomUUID(),
          name: resolvedOrganizationName,
          updatedAt: new Date(),
        },
      });

      const profile = buildProfile(role);
      const newUser = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          email: normalizedEmail,
          passwordHash: await hashPassword(input.password),
          role,
          organizationId: org.id,
          updatedAt: new Date(),
          ...profile,
        },
      });

      // Special session creation that uses the transaction client
      const payload: TokenPayload = { sub: newUser.id, email: newUser.email, role: newUser.role, organizationId: org.id };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      await tx.refreshToken.create({
        data: {
          id: crypto.randomUUID(),
          userId: newUser.id,
          tokenHash: hashToken(refreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return { user: newUser, session: { accessToken, refreshToken } };
    });

    // Send verification email (outside transaction)
    const verificationToken = signPasswordResetToken({ sub: user.id, email: user.email, type: 'email_verification' });
    sendVerificationEmail({ name: user.name, email: user.email }, verificationToken).catch((err) => {
      logger.warn("Failed to send verification email:", err);
    });

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

    if (!user.emailVerified) {
      throw new AppError("Please verify your email before logging in", 403, "EMAIL_NOT_VERIFIED");
    }

    const session = await createSession(user.id, user.email, user.role, user.organizationId ?? undefined);
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

  async updateProfile(userId: string, role: AppUserRole, input: {
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
    const commonFields = {
      name: input.name,
      timeZone: input.timeZone,
      location: input.location,
    };
    
    const allowedInput =
      role === "admin"
        ? { ...commonFields, department: input.department, team: input.team, designation: input.designation, manager: input.manager, workingHours: input.workingHours, officeLocation: input.officeLocation }
        : role === "manager"
        ? { ...commonFields }
        : commonFields;

    const user = await prisma.user.update({
      where: { id: userId },
      data: allowedInput,
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

    const session = await createSession(stored.User.id, stored.User.email, stored.User.role, stored.User.organizationId ?? undefined);
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return {
      user: toAuthUser(stored.User),
      ...session,
    };
  },

  async switchRole(userId: string, targetRole: AppUserRole): Promise<{ user: AuthUser; accessToken: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new AppError("User not found", 404, "NOT_FOUND");
    }

    if (user.role !== "admin" && user.role !== targetRole) {
      throw new AppError("Access denied. Only admins can switch roles.", 403, "FORBIDDEN");
    }

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: targetRole,
      organizationId: user.organizationId ?? undefined,
    };
    const accessToken = signAccessToken(payload);

    return { user: toAuthUser({ ...user, role: targetRole }), accessToken };
  },
};
