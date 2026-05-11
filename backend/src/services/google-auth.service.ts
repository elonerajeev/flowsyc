import { google } from "googleapis";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { buildProfile } from "../utils/employee-profile";
import { hashPassword } from "../utils/password";
import { AppError } from "../middleware/error.middleware";
import { authService } from "./auth.service";
import type { UserRole } from "../config/types";
import { cache } from "../utils/cache";
import { env } from "../config/env";

// For Calendar integration (meetings)
const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

// For Login/Signup (just name & email)
const LOGIN_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const DEFAULT_LOGIN_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
const DEFAULT_CALENDAR_REDIRECT_URI = "http://localhost:3000/api/auth/google/calendar-callback";

type GoogleAuthIntent = "login" | "signup";
type SignupRole = Extract<UserRole, "admin">;

type GoogleAuthState = {
  intent: GoogleAuthIntent;
  role?: SignupRole;
};

type ParsedGoogleCalendarState = {
  email: string;
  userId: string;
  organizationId?: string;
};

type GoogleOAuthStatePayload = {
  type: "google_auth_state";
  nonce: string;
  intent: GoogleAuthIntent;
  role?: SignupRole;
};

type GoogleCalendarStatePayload = {
  type: "google_calendar_state";
  nonce: string;
  email: string;
  userId: string;
  organizationId?: string;
};

const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;

function oauthNonceCacheKey(prefix: "auth" | "calendar", nonce: string) {
  return `oauth-state:${prefix}:${nonce}`;
}

async function storeOAuthNonce(prefix: "auth" | "calendar", nonce: string) {
  await Promise.resolve(cache.set(oauthNonceCacheKey(prefix, nonce), true, GOOGLE_STATE_TTL_MS));
}

async function consumeOAuthNonce(prefix: "auth" | "calendar", nonce: string) {
  const key = oauthNonceCacheKey(prefix, nonce);
  const exists = await Promise.resolve(cache.get<boolean>(key));
  if (!exists) return false;
  await Promise.resolve(cache.invalidate(key));
  return true;
}

function normalizeGoogleIntent(value: unknown): GoogleAuthIntent {
  return value === "signup" ? "signup" : "login";
}

function normalizeGoogleSignupRole(value: unknown): SignupRole | undefined {
  return value === "admin" ? "admin" : undefined;
}

async function signGoogleAuthStateToken(input: GoogleAuthState) {
  const nonce = crypto.randomUUID();
  await storeOAuthNonce("auth", nonce);
  const payload: GoogleOAuthStatePayload = {
    type: "google_auth_state",
    nonce,
    intent: normalizeGoogleIntent(input.intent),
    role: normalizeGoogleSignupRole(input.role),
  };
  return jwt.sign(payload, env.JWT_OAUTH_STATE_SECRET || env.JWT_REFRESH_SECRET, {
    expiresIn: "10m",
  });
}

async function signGoogleCalendarStateToken(input: { email: string; userId: string; organizationId?: string }) {
  const nonce = crypto.randomUUID();
  await storeOAuthNonce("calendar", nonce);
  const payload: GoogleCalendarStatePayload = {
    type: "google_calendar_state",
    nonce,
    email: input.email,
    userId: input.userId,
    organizationId: input.organizationId,
  };
  return jwt.sign(payload, env.JWT_OAUTH_STATE_SECRET || env.JWT_REFRESH_SECRET, {
    expiresIn: "10m",
  });
}

function getLoginRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || DEFAULT_LOGIN_REDIRECT_URI;
}

function getCalendarRedirectUri() {
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI || DEFAULT_CALENDAR_REDIRECT_URI;
}

export async function parseGoogleAuthState(rawState?: string | null): Promise<GoogleAuthState> {
  if (!rawState) {
    throw new AppError("Missing OAuth state", 400, "GOOGLE_AUTH_FAILED");
  }

  let payload: GoogleOAuthStatePayload;
  try {
    payload = jwt.verify(rawState, env.JWT_OAUTH_STATE_SECRET || env.JWT_REFRESH_SECRET) as GoogleOAuthStatePayload;
  } catch {
    throw new AppError("Invalid OAuth state", 400, "GOOGLE_AUTH_FAILED");
  }

  if (!payload?.nonce || payload.type !== "google_auth_state") {
    throw new AppError("Invalid OAuth state", 400, "GOOGLE_AUTH_FAILED");
  }
  const consumed = await consumeOAuthNonce("auth", payload.nonce);
  if (!consumed) {
    throw new AppError("Expired OAuth state", 400, "GOOGLE_AUTH_FAILED");
  }

  return {
    intent: normalizeGoogleIntent(payload.intent),
    role: normalizeGoogleSignupRole(payload.role),
  };
}

export async function parseGoogleCalendarState(rawState?: string | null): Promise<ParsedGoogleCalendarState> {
  if (!rawState) {
    throw new AppError("Missing calendar OAuth state", 400, "GOOGLE_AUTH_FAILED");
  }

  let payload: GoogleCalendarStatePayload;
  try {
    payload = jwt.verify(rawState, env.JWT_OAUTH_STATE_SECRET || env.JWT_REFRESH_SECRET) as GoogleCalendarStatePayload;
  } catch {
    throw new AppError("Invalid calendar OAuth state", 400, "GOOGLE_AUTH_FAILED");
  }

  if (!payload?.nonce || payload.type !== "google_calendar_state" || !payload.email || !payload.userId) {
    throw new AppError("Invalid calendar OAuth state", 400, "GOOGLE_AUTH_FAILED");
  }
  const consumed = await consumeOAuthNonce("calendar", payload.nonce);
  if (!consumed) {
    throw new AppError("Expired calendar OAuth state", 400, "GOOGLE_AUTH_FAILED");
  }

  return {
    email: payload.email,
    userId: payload.userId,
    organizationId: payload.organizationId,
  };
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent",
  });
}

export async function getLoginAuthUrl(options?: { intent?: GoogleAuthIntent; role?: SignupRole }) {
  const oauth2Client = getOAuth2Client();
  const state = await signGoogleAuthStateToken({
    intent: options?.intent ?? "login",
    role: options?.role,
  });
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: LOGIN_SCOPES,
    prompt: "consent",
    redirect_uri: getLoginRedirectUri(),
    state,
  });
}

export async function getGoogleAuthUrl(input: { email: string; userId: string; organizationId?: string }) {
  const oauth2Client = getOAuth2Client();
  const state = await signGoogleCalendarStateToken(input);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent",
    state,
    redirect_uri: getCalendarRedirectUri(),
  });
}

// ── helpers: store/read Google tokens in UserPreference.data ─────────────────

async function getUserId(userEmail: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
  return user?.id ?? null;
}

async function getGoogleTokens(userEmail: string) {
  const userId = await getUserId(userEmail);
  if (!userId) return null;
  const pref = await prisma.userPreference.findUnique({ where: { userId }, select: { data: true } });
  const data = (pref?.data ?? {}) as Record<string, unknown>;
  return {
    googleAccessToken: data.googleAccessToken as string | null ?? null,
    googleRefreshToken: data.googleRefreshToken as string | null ?? null,
    googleTokenExpiry: data.googleTokenExpiry as number | null ?? null,
  };
}

async function setGoogleTokens(userEmail: string, tokens: { googleAccessToken?: string | null; googleRefreshToken?: string | null; googleTokenExpiry?: number | null }) {
  const userId = await getUserId(userEmail);
  if (!userId) return;
  const existing = await prisma.userPreference.findUnique({ where: { userId }, select: { data: true } });
  const current = (existing?.data ?? {}) as Record<string, unknown>;
  const merged = { ...current, ...tokens };
  await prisma.userPreference.upsert({
    where: { userId },
    create: { id: `pref-${userId}`, userId, data: merged, updatedAt: new Date() },
    update: { data: merged, updatedAt: new Date() },
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export async function handleGoogleCallback(input: { email: string; userId: string; organizationId?: string }, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, organizationId: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    throw new AppError("User not found for calendar OAuth callback", 404, "NOT_FOUND");
  }
  if (user.email.toLowerCase() !== input.email.toLowerCase()) {
    throw new AppError("OAuth state mismatch for calendar callback", 400, "GOOGLE_AUTH_FAILED");
  }
  if (input.organizationId && user.organizationId && input.organizationId !== user.organizationId) {
    throw new AppError("OAuth organization mismatch", 400, "GOOGLE_AUTH_FAILED");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getCalendarRedirectUri(),
  );
  const { tokens } = await oauth2Client.getToken(code);

  await setGoogleTokens(user.email, {
    googleAccessToken: tokens.access_token,
    googleRefreshToken: tokens.refresh_token ?? null,
    googleTokenExpiry: tokens.expiry_date ?? null,
  });

  return { success: true, email: user.email };
}

export async function disconnectGoogle(userEmail: string) {
  await setGoogleTokens(userEmail, {
    googleAccessToken: null,
    googleRefreshToken: null,
    googleTokenExpiry: null,
  });
}

export async function saveTokens(userEmail: string, code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  await setGoogleTokens(userEmail, {
    googleAccessToken: tokens.access_token,
    googleRefreshToken: tokens.refresh_token ?? null,
    googleTokenExpiry: tokens.expiry_date ?? null,
  });
  return tokens;
}

export async function createCalendarEvent({
  userEmail,
  summary,
  description,
  startTime,
  endTime,
  attendees,
}: {
  userEmail: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
}) {
  const stored = await getGoogleTokens(userEmail);

  if (!stored?.googleAccessToken) {
    throw new Error("Google account not connected. Please authorize first.");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: stored.googleAccessToken,
    refresh_token: stored.googleRefreshToken ?? undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime.toISOString(), timeZone: "UTC" },
      end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
      attendees: attendees.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `crm-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
    conferenceDataVersion: 1,
  });

  return {
    meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri || null,
    eventId: response.data.id,
    htmlLink: response.data.htmlLink,
  };
}

export async function refreshGoogleToken(userEmail: string) {
  const stored = await getGoogleTokens(userEmail);
  if (!stored?.googleRefreshToken) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: stored.googleRefreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();

  await setGoogleTokens(userEmail, {
    googleAccessToken: credentials.access_token ?? null,
    googleTokenExpiry: credentials.expiry_date ?? null,
  });

  return credentials;
}

export async function isGoogleConnected(userEmail: string) {
  const tokens = await getGoogleTokens(userEmail);
  return !!tokens?.googleAccessToken;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
}

export async function getGoogleUserInfo(code: string): Promise<GoogleUserInfo> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getLoginRedirectUri(),
  );
  const { tokens } = await oauth2Client.getToken(code);
  
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  return {
    id: userInfo.data.id || "",
    email: userInfo.data.email || "",
    name: userInfo.data.name || "",
    picture: userInfo.data.picture ?? undefined,
    accessToken: tokens.access_token || "",
  };
}

export async function authenticateWithGoogleProfile(
  googleUser: GoogleUserInfo,
  options?: { intent?: GoogleAuthIntent; role?: SignupRole },
) {
  if (!googleUser.email) {
    throw new AppError("Failed to get Google user info", 400, "GOOGLE_AUTH_FAILED");
  }

  let user = await prisma.user.findUnique({ where: { email: googleUser.email } });

  const intent = normalizeGoogleIntent(options?.intent);
  if (!user) {
    if (intent !== "signup") {
      throw new AppError("Account not found. Please sign up first.", 404, "NOT_FOUND");
    }
    const role = "admin";
    const profile = buildProfile(role);
    const displayName = googleUser.name || googleUser.email.split("@")[0];
    user = await prisma.$transaction(async (tx) => {
      const org = await (tx as any).organization.create({
        data: {
          id: crypto.randomUUID(),
          name: `${displayName}'s Organization`,
          updatedAt: new Date(),
        },
      });
      return tx.user.create({
        data: {
          id: crypto.randomUUID(),
          name: displayName,
          email: googleUser.email,
          passwordHash: await hashPassword(`google_${crypto.randomUUID()}`),
          role,
          organizationId: org.id,
          updatedAt: new Date(),
          ...profile,
          emailVerified: true,
        },
      });
    });
  } else if (intent === "signup") {
    throw new AppError("User already exists. Please login with Google.", 400, "USER_EXISTS");
  } else if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  }

  const session = await authService.createSession(user.id);
  return { user, ...session };
}
