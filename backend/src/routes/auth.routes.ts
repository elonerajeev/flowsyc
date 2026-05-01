import { Router } from "express";

import { authController } from "../controllers/auth.controller";
import { env } from "../config/env";
import { authRateLimiter, sensitiveRateLimiter } from "../middleware/rate-limit.middleware";
import { AppError } from "../middleware/error.middleware";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { loginSchema, signupSchema, updateProfileSchema } from "../validators/auth.schema";
import { logger } from "../utils/logger";

export const authRouter = Router();

const IS_PROD = env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};
const ACCESS_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000;

function setAuthCookies(res: { cookie: Function }, accessToken: string, refreshToken: string) {
  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_EXPIRY,
  });
  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_EXPIRY,
  });
}

authRouter.use(authRateLimiter);

authRouter.post("/signup", validateBody(signupSchema), asyncHandler(authController.signup));
authRouter.post("/verify-email", sensitiveRateLimiter, asyncHandler(authController.verifyEmail));
authRouter.post("/resend-verification", sensitiveRateLimiter, asyncHandler(authController.resendVerification));
authRouter.post("/forgot-password", sensitiveRateLimiter, asyncHandler(authController.forgotPassword));
authRouter.post("/reset-password", sensitiveRateLimiter, asyncHandler(authController.resetPassword));
authRouter.post("/login", validateBody(loginSchema), asyncHandler(authController.login));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
authRouter.patch("/me", requireAuth, validateBody(updateProfileSchema), asyncHandler(authController.updateProfile));
authRouter.post("/logout", requireAuth, asyncHandler(authController.logout));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.post("/switch-role", requireAuth, asyncHandler(authController.switchRole));

// Google OAuth - Connect existing account
authRouter.get("/google/url", requireAuth, asyncHandler(async (req, res) => {
  const { getGoogleAuthUrl } = await import("../services/google-auth.service.js");
  const authUrl = getGoogleAuthUrl(req.auth!.email);
  res.json({ authUrl });
}));

authRouter.post("/google/callback", asyncHandler(async (req, res) => {
  const { handleGoogleCallback } = await import("../services/google-auth.service.js");
  const { code, state } = req.body;
  if (!code || !state) {
    res.status(400).json({ error: "Missing code or state" }); return;
  }
  const result = await handleGoogleCallback(state, code);
  res.json(result);
}));

authRouter.get("/google/status", requireAuth, asyncHandler(async (req, res) => {
  const { isGoogleConnected } = await import("../services/google-auth.service.js");
  const connected = await isGoogleConnected(req.auth!.email);
  res.json({ connected });
}));

authRouter.post("/google/disconnect", requireAuth, asyncHandler(async (req, res) => {
  const { disconnectGoogle } = await import("../services/google-auth.service.js");
  await disconnectGoogle(req.auth!.email);
  res.json({ success: true });
}));

// Google OAuth - Login & Signup 
authRouter.get("/google/login-url", asyncHandler(async (req, res) => {
  const { getLoginAuthUrl } = await import("../services/google-auth.service.js");
  const intent = req.query.intent === "signup" ? "signup" : "login";
  const role = req.query.role === "client" ? "client" : req.query.role === "employee" ? "employee" : undefined;
  const authUrl = getLoginAuthUrl({ intent, role });
  res.json({ authUrl });
}));

authRouter.get("/google/callback", asyncHandler(async (req, res) => {
  const { code, error: googleError, error_description, state } = req.query;
  
  if (googleError) {
    logger.error("Google auth error", { googleError, error_description });
    return res.redirect(`${env.FRONTEND_URL}/login?error=google_${googleError}`);
  }
  
  if (!code) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=missing_params`);
  }

  try {
    const { authenticateWithGoogleProfile, getGoogleUserInfo, parseGoogleAuthState } = await import("../services/google-auth.service.js");
    const authState = parseGoogleAuthState(typeof state === "string" ? state : null);
    const googleUser = await getGoogleUserInfo(String(code));
    const session = await authenticateWithGoogleProfile(googleUser, { role: authState.role });
    if (!session.accessToken || !session.refreshToken) {
      throw new AppError("Failed to create Google session", 500, "GOOGLE_AUTH_FAILED");
    }

    setAuthCookies(res, session.accessToken, session.refreshToken);
    return res.redirect(`${env.FRONTEND_URL}/auth/google/callback`);
  } catch (error) {
    logger.error("Google callback error", { error });
    return res.redirect(`${env.FRONTEND_URL}/login?error=google_auth_failed`);
  }
}));

authRouter.get("/google/calendar-callback", asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${env.FRONTEND_URL}/system/settings?google=error`);
  }

  try {
    const userEmail = req.query.state ? String(req.query.state) : null;
    if (!userEmail) {
      return res.redirect(`${env.FRONTEND_URL}/system/settings?google=error`);
    }

    const { handleGoogleCallback } = await import("../services/google-auth.service.js");
    await handleGoogleCallback(userEmail, String(code));
    
    return res.redirect(`${env.FRONTEND_URL}/system/settings?google=connected`);
  } catch (error) {
    logger.error("Google calendar callback error", { error });
    return res.redirect(`${env.FRONTEND_URL}/system/settings?google=error`);
  }
}));

authRouter.post("/google/login", asyncHandler(authController.googleLogin));
authRouter.post("/google/signup", asyncHandler(authController.googleSignup));
