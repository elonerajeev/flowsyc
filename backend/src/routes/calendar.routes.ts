import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/auth.middleware";
import { calendarService } from "../services/calendar.service";
import { asyncHandler } from "../utils/async-handler";
import { validateBody } from "../middleware/validate.middleware";
import { createCalendarEventSchema, updateCalendarEventSchema } from "../validators/calendar.schema";

const router = Router();

router.use(requireAuth);

// ── Google Calendar integration (admin/manager only) ──────────────────────────

router.get(
  "/google/status",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { isGoogleConnected } = await import("../services/google-auth.service.js");
    const connected = await isGoogleConnected(req.auth!.email);
    res.json({ connected });
  }),
);

router.get(
  "/google/connect",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { getGoogleAuthUrl } = await import("../services/google-auth.service.js");
    const authUrl = getGoogleAuthUrl(req.auth!.email);
    res.json({ authUrl });
  }),
);

router.post(
  "/google/disconnect",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { disconnectGoogle } = await import("../services/google-auth.service.js");
    await disconnectGoogle(req.auth!.email);
    res.json({ success: true });
  }),
);

// ── Calendar events ───────────────────────────────────────────────────────────

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const events = await calendarService.list(req.auth);
    res.json(events);
  }),
);

router.post(
  "/",
  validateBody(createCalendarEventSchema),
  asyncHandler(async (req, res) => {
    const event = await calendarService.create(req.auth, req.body);
    res.status(201).json(event);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const event = await calendarService.getById(Number(req.params.id), req.auth);
    res.json(event);
  }),
);

router.patch(
  "/:id",
  validateBody(updateCalendarEventSchema),
  asyncHandler(async (req, res) => {
    const event = await calendarService.update(Number(req.params.id), req.auth, req.body);
    res.json(event);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await calendarService.remove(Number(req.params.id), req.auth);
    res.status(204).end();
  }),
);

export const calendarRouter = router;
