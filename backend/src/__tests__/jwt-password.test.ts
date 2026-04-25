import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test-secret-key-for-testing-only-32ch";
const TEST_REFRESH_SECRET = "test-refresh-secret-key-for-testing-32ch";

jest.mock("../config/env", () => ({
  env: {
    JWT_ACCESS_SECRET: TEST_SECRET,
    JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
  },
}));

describe("JWT utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signAccessToken", () => {
    it("generates a valid JWT token", async () => {
      const { signAccessToken } = await import("../utils/jwt");
      const token = await signAccessToken({
        sub: "user-123",
        email: "test@example.com",
        role: "admin",
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("token contains correct payload", async () => {
      const { signAccessToken } = await import("../utils/jwt");
      const token = await signAccessToken({
        sub: "user-123",
        email: "test@example.com",
        role: "employee",
      });

      const decoded = jwt.verify(token, TEST_SECRET) as Record<string, unknown>;
      expect(decoded.sub).toBe("user-123");
      expect(decoded.email).toBe("test@example.com");
      expect(decoded.role).toBe("employee");
    });
  });

  describe("signRefreshToken", () => {
    it("generates a valid refresh token", async () => {
      const { signRefreshToken } = await import("../utils/jwt");
      const token = await signRefreshToken({ sub: "user-123", email: "test@example.com", role: "employee" });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });
  });

  describe("verifyAccessToken", () => {
    it("verifies valid token", async () => {
      const { signAccessToken, verifyAccessToken } = await import("../utils/jwt");
      const token = await signAccessToken({
        sub: "user-123",
        email: "test@example.com",
        role: "admin",
      });

      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe("user-123");
      expect(payload.email).toBe("test@example.com");
    });

    it("throws for invalid token", async () => {
      const { verifyAccessToken } = await import("../utils/jwt");
      expect(() => {
        verifyAccessToken("invalid-token");
      }).toThrow();
    });

    it("throws for expired token", async () => {
      const { verifyAccessToken } = await import("../utils/jwt");
      const expiredToken = jwt.sign(
        { sub: "user-123", email: "test@example.com", role: "admin" },
        TEST_SECRET,
        { expiresIn: "-1s" }
      );

      expect(() => {
        verifyAccessToken(expiredToken);
      }).toThrow("jwt expired");
    });
  });

  describe("verifyRefreshToken", () => {
    it("verifies valid refresh token", async () => {
      const { signRefreshToken, verifyRefreshToken } = await import("../utils/jwt");
      const token = await signRefreshToken({ sub: "user-123", email: "test@example.com", role: "employee" });

      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe("user-123");
    });

    it("throws for invalid refresh token", async () => {
      const { verifyRefreshToken } = await import("../utils/jwt");
      expect(() => {
        verifyRefreshToken("invalid-refresh-token");
      }).toThrow();
    });
  });
});

describe("Password utilities", () => {
  describe("hashPassword", () => {
    it("hashes a password", async () => {
      const { hashPassword } = await import("../utils/password");
      const hash = await hashPassword("testpassword");
      expect(hash).toBeDefined();
      expect(hash).not.toBe("testpassword");
    });

    it("produces different hashes for same password", async () => {
      const { hashPassword } = await import("../utils/password");
      const hash1 = await hashPassword("testpassword");
      const hash2 = await hashPassword("testpassword");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("comparePassword", () => {
    it("returns true for matching password", async () => {
      const { hashPassword, comparePassword } = await import("../utils/password");
      const hash = await hashPassword("testpassword");
      const result = await comparePassword("testpassword", hash);
      expect(result).toBe(true);
    });

    it("returns false for non-matching password", async () => {
      const { hashPassword, comparePassword } = await import("../utils/password");
      const hash = await hashPassword("testpassword");
      const result = await comparePassword("wrongpassword", hash);
      expect(result).toBe(false);
    });
  });
});