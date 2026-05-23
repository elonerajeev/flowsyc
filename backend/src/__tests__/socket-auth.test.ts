import { describe, expect, it } from "@jest/globals";

process.env.JWT_ACCESS_SECRET = "a".repeat(64);
process.env.JWT_REFRESH_SECRET = "b".repeat(64);

import { signAccessToken } from "../utils/jwt";
import { authenticateSocketToken, extractSocketToken } from "../socket";

describe("socket authentication helpers", () => {
  it("extracts token from auth payload, header, or cookie", () => {
    expect(
      extractSocketToken({
        authToken: "token-auth",
        authorizationHeader: "Bearer token-header",
        cookieHeader: "foo=bar; accessToken=token-cookie",
      }),
    ).toBe("token-auth");

    expect(
      extractSocketToken({
        authorizationHeader: "Bearer token-header",
      }),
    ).toBe("token-header");

    expect(
      extractSocketToken({
        cookieHeader: "foo=bar; accessToken=token-cookie; baz=qux",
      }),
    ).toBe("token-cookie");
  });

  it("authenticates a valid token and returns normalized socket auth context", () => {
    const token = signAccessToken({
      sub: "user-1",
      email: "admin@example.com",
      role: "admin",
      organizationId: "org-1",
    });

    const auth = authenticateSocketToken(token);
    expect(auth).toEqual({
      userId: "user-1",
      email: "admin@example.com",
      role: "admin",
      organizationId: "org-1",
    });
  });

  it("rejects malformed tokens", () => {
    expect(() => authenticateSocketToken("bad-token")).toThrow();
  });
});
