import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { meetingService, type CreateMeetingInput, type UpdateMeetingInput } from "../services/meeting.service";

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

export const meetingRouter = router;
