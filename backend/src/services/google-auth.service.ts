import { google } from "googleapis";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { buildProfile } from "../utils/employee-profile";
import { hashPassword } from "../utils/password";
import { AppError } from "../middleware/error.middleware";
import { authService } from "./auth.service";
import type { UserRole } from "../config/types";

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
type SignupRole = Extract<UserRole, "employee" | "client">;

type GoogleAuthState = {
  intent: GoogleAuthIntent;
  role?: SignupRole;
};

function getLoginRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || DEFAULT_LOGIN_REDIRECT_URI;
}

function getCalendarRedirectUri() {
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI || DEFAULT_CALENDAR_REDIRECT_URI;
}

function encodeGoogleAuthState(state: GoogleAuthState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function parseGoogleAuthState(rawState?: string | null): GoogleAuthState {
  if (!rawState) {
    return { intent: "login" };
  }

  try {
    const decoded = Buffer.from(rawState, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<GoogleAuthState>;
    const intent = parsed.intent === "signup" ? "signup" : "login";
    const role = parsed.role === "client" ? "client" : parsed.role === "employee" ? "employee" : undefined;
    return { intent, role };
  } catch {
    return { intent: "login" };
  }
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

export function getLoginAuthUrl(options?: { intent?: GoogleAuthIntent; role?: SignupRole }) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: LOGIN_SCOPES,
    prompt: "consent",
    redirect_uri: getLoginRedirectUri(),
    state: encodeGoogleAuthState({
      intent: options?.intent ?? "login",
      role: options?.role,
    }),
  });
}

export function getGoogleAuthUrl(userEmail: string) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent",
    state: userEmail,
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

export async function handleGoogleCallback(userEmail: string, code: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getCalendarRedirectUri(),
  );
  const { tokens } = await oauth2Client.getToken(code);

  await setGoogleTokens(userEmail, {
    googleAccessToken: tokens.access_token,
    googleRefreshToken: tokens.refresh_token ?? null,
    googleTokenExpiry: tokens.expiry_date ?? null,
  });

  return { success: true, email: userEmail };
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
    picture: userInfo.data.picture,
    accessToken: tokens.access_token || "",
  };
}

export async function authenticateWithGoogleProfile(
  googleUser: GoogleUserInfo,
  options?: { role?: SignupRole },
) {
  if (!googleUser.email) {
    throw new AppError("Failed to get Google user info", 400, "GOOGLE_AUTH_FAILED");
  }

  let user = await prisma.user.findUnique({ where: { email: googleUser.email } });

  if (!user) {
    const role = options?.role ?? "employee";
    const profile = buildProfile(role);
    user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: googleUser.name || googleUser.email.split("@")[0],
        email: googleUser.email,
        passwordHash: await hashPassword(`google_${crypto.randomUUID()}`),
        emailVerified: true,
        role,
        updatedAt: new Date(),
        ...profile,
      },
    });
  } else if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  }

  const session = await authService.createSession(user.id);
  return { user, ...session };
}
