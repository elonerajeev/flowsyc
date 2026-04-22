import { Router } from "express";
import { getAuthUrl, saveTokens, isGoogleConnected } from "../services/google-auth.service";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/google", requireAuth, (req, res) => {
  const authUrl = getAuthUrl() + `&state=${encodeURIComponent(req.auth!.email)}`;
  res.json({ authUrl });
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Authorization code required" });
    }

    const userEmail = state ? decodeURIComponent(String(state)) : null;
    if (!userEmail) {
      return res.status(400).json({ error: "User email not provided" });
    }

    await saveTokens(userEmail, String(code));
    res.redirect(`${process.env.FRONTEND_URL}/settings?google=connected`);
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?google=error`);
  }
});

router.get("/google/status", requireAuth, async (req, res) => {
  const connected = await isGoogleConnected(req.auth!.email);
  res.json({ connected });
});

export default router;