import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/auth.middleware";
import { meetingService, type CreateMeetingInput, type UpdateMeetingInput } from "../services/meeting.service";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const { leadId, clientId, contactId, status } = req.query;
  const meetings = await meetingService.list(req.auth, {
    leadId: leadId ? Number(leadId) : undefined,
    clientId: clientId ? Number(clientId) : undefined,
    contactId: contactId ? Number(contactId) : undefined,
    status: status as string | undefined,
  });
  res.json({ data: meetings });
});

router.get("/upcoming", async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const meetings = await meetingService.getUpcoming(req.auth, limit);
  res.json({ data: meetings });
});

router.get("/:id", async (req, res) => {
  const meeting = await meetingService.getById(Number(req.params.id));
  res.json({ data: meeting });
});

router.post("/", async (req, res) => {
  const input: CreateMeetingInput = req.body;
  const meeting = await meetingService.create(req.auth, input);
  res.status(201).json({ data: meeting });
});

router.patch("/:id", async (req, res) => {
  const input: UpdateMeetingInput = req.body;
  const meeting = await meetingService.update(Number(req.params.id), req.auth, input);
  res.json({ data: meeting });
});

router.delete("/:id", async (req, res) => {
  await meetingService.delete(Number(req.params.id), req.auth);
  res.json({ success: true });
});

router.get("/lead/:leadId", async (req, res) => {
  const meetings = await meetingService.getByLead(Number(req.params.leadId));
  res.json({ data: meetings });
});

router.get("/client/:clientId", async (req, res) => {
  const meetings = await meetingService.list(req.auth, { clientId: Number(req.params.clientId) });
  res.json({ data: meetings });
});

router.get("/contact/:contactId", async (req, res) => {
  const meetings = await meetingService.list(req.auth, { contactId: Number(req.params.contactId) });
  res.json({ data: meetings });
});

// ── Google Meet link generation (admin/manager only) ──────────────────────────

router.post(
  "/:id/google-meet",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const meeting = await meetingService.getById(Number(req.params.id));
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const { createCalendarEvent, isGoogleConnected } = await import("../services/google-auth.service.js");

    const connected = await isGoogleConnected(req.auth!.email);
    if (!connected) {
      return res.status(400).json({ error: "Google Calendar not connected. Connect it in Settings first." });
    }

    const attendees = [meeting.inviteeEmail, req.auth!.email]
      .filter((v, i, a) => v && a.indexOf(v) === i) as string[];

    const startTime = new Date(meeting.scheduledAt);
    const endTime = new Date(startTime.getTime() + (meeting.duration ?? 60) * 60 * 1000);

    const result = await createCalendarEvent({
      userEmail: req.auth!.email,
      summary: meeting.title,
      description: meeting.notes ?? undefined,
      startTime,
      endTime,
      attendees,
    });

    res.json({ meetLink: result.meetLink, eventId: result.eventId, htmlLink: result.htmlLink });
  }),
);

export const meetingRouter = router;
