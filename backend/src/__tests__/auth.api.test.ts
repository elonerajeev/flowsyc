import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { EventEmitter } from "events";
import type { Express } from "express";
import { createRequest, createResponse } from "node-mocks-http";
import type { Body, RequestMethod } from "node-mocks-http";
import type { UserRole } from "../config/types";

process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/focal_point_compass_test";
process.env.JWT_ACCESS_SECRET = "a".repeat(64);
process.env.JWT_REFRESH_SECRET = "b".repeat(64);
process.env.FRONTEND_URL = "http://localhost:8080";

type MockUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
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
  paymentMode: "bank_transfer" | "cash" | "upi";
  payrollCycle: string;
  payrollDueDate: string;
  joinedAt: string;
  location: string;
  deletedAt: Date | null;
};

type MockRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  revokedAt: Date | null;
  expiresAt: Date;
  user: MockUser;
};

const mockState = {
  users: [] as MockUser[],
  refreshTokens: [] as MockRefreshToken[],
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email) {
        return mockState.users.find((user) => user.email === where.email) ?? null;
      }
      if (where.id) {
        return mockState.users.find((user) => user.id === where.id) ?? null;
      }
      return null;
    }),
    create: jest.fn(async ({ data }: { data: Omit<MockUser, "id" | "deletedAt"> }) => {
      const user: MockUser = {
        id: `user-${mockState.users.length + 1}`,
        deletedAt: null,
        ...data,
      };
      mockState.users.push(user);
      return user;
    }),
  },
  refreshToken: {
    create: jest.fn(async ({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) => {
      const user = mockState.users.find((entry) => entry.id === data.userId);
      if (!user) {
        throw new Error("User not found in mock state");
      }

      const record: MockRefreshToken = {
        id: `token-${mockState.refreshTokens.length + 1}`,
        userId: data.userId,
        tokenHash: data.tokenHash,
        revokedAt: null,
        expiresAt: data.expiresAt,
        user,
      };
      mockState.refreshTokens.push(record);
      return record;
    }),
    findUnique: jest.fn(async ({ where }: { where: { tokenHash: string } }) => {
      return mockState.refreshTokens.find((record) => record.tokenHash === where.tokenHash) ?? null;
    }),
    updateMany: jest.fn(async ({ where, data }: { where: { userId: string; revokedAt: null }; data: { revokedAt: Date } }) => {
      let count = 0;
      for (const record of mockState.refreshTokens) {
        if (record.userId === where.userId && record.revokedAt === where.revokedAt) {
          record.revokedAt = data.revokedAt;
          count += 1;
        }
      }
      return { count };
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: { revokedAt: Date } }) => {
      const record = mockState.refreshTokens.find((entry) => entry.id === where.id);
      if (!record) {
        throw new Error("Refresh token not found in mock state");
      }
      record.revokedAt = data.revokedAt;
      return record;
    }),
  },
  auditLog: {
    create: jest.fn(async () => {}),
  },
  $transaction: jest.fn(async (fn: (...args: any[]) => any) => fn(mockPrisma)),
};

jest.mock("../config/prisma", () => ({
  prisma: mockPrisma,
}));

let createApp: typeof import("../app").createApp;

function resetMockState() {
  mockState.users.length = 0;
  mockState.refreshTokens.length = 0;
  mockPrisma.user.findUnique.mockClear();
  mockPrisma.user.create.mockClear();
  mockPrisma.refreshToken.create.mockClear();
  mockPrisma.refreshToken.findUnique.mockClear();
  mockPrisma.refreshToken.updateMany.mockClear();
  mockPrisma.refreshToken.update.mockClear();
}

function dispatch(
  app: Express,
  options: {
    method: RequestMethod;
    url: string;
    body?: Body;
    headers?: Record<string, string>;
  },
) {
  const req = createRequest({
    method: options.method,
    url: options.url,
    body: options.body,
    headers: options.headers,
  });
  const res = createResponse({ eventEmitter: EventEmitter });

  return new Promise<typeof res>((resolve, reject) => {
    res.on("end", () => resolve(res));
    res.on("error", reject);
    (app as unknown as (...args: unknown[]) => void)(req, res, reject);
  });
}

describe("auth API", () => {
  beforeEach(async () => {
    if (!createApp) {
      const appModule = await import("../app");
      createApp = appModule.createApp;
    }
  });

  beforeEach(() => {
    resetMockState();
  });

  it("signs up, logs in, returns the current user, and logs out", async () => {
    const app = createApp();

    const signupResponse = await dispatch(app, {
      method: "POST",
      url: "/api/auth/signup",
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
        role: "employee",
      },
    });

    expect(signupResponse.statusCode).toBe(201);
    const signupBody = signupResponse._getJSONData() as {
      user: { email: string; role: UserRole; employeeId: string };
      accessToken: string;
      refreshToken: string;
    };
    expect(signupBody.user.email).toBe("test@example.com");
    expect(signupBody.user.role).toBe("employee");
    expect(signupBody.accessToken).toEqual(expect.any(String));
    expect(signupBody.refreshToken).toEqual(expect.any(String));

    const meResponse = await dispatch(app, {
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${signupBody.accessToken}`,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    const meBody = meResponse._getJSONData() as {
      user: { email: string; employeeId: string };
    };
    expect(meBody.user.email).toBe("test@example.com");
    expect(meBody.user.employeeId).toMatch(/^EMP-/);

    const loginResponse = await dispatch(app, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        email: "test@example.com",
        password: "Password123!",
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginBody = loginResponse._getJSONData() as {
      user: { email: string };
      accessToken: string;
    };
    expect(loginBody.user.email).toBe("test@example.com");
    expect(loginBody.accessToken).toEqual(expect.any(String));

    const logoutResponse = await dispatch(app, {
      method: "POST",
      url: "/api/auth/logout",
      headers: {
        authorization: `Bearer ${loginBody.accessToken}`,
      },
    });

    expect(logoutResponse.statusCode).toBe(200);
    const logoutBody = logoutResponse._getJSONData() as { message: string };
    expect(logoutBody.message).toBe("Logged out successfully");
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
  });

  it("rejects privileged role during public signup", async () => {
    const app = createApp();

    const signupResponse = await dispatch(app, {
      method: "POST",
      url: "/api/auth/signup",
      body: {
        name: "Privileged User",
        email: "privileged@example.com",
        password: "Password123!",
        role: "admin",
      },
    });

    expect(signupResponse.statusCode).toBe(400);
    const signupBody = signupResponse._getJSONData() as {
      error: { code: string; message: string };
    };
    expect(signupBody.error.code).toBe("VALIDATION_ERROR");
    expect(mockState.users).toHaveLength(0);
  });
});
