import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware";
import { calendarService } from "../services/calendar.service";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const events = await calendarService.list(req.auth);
    res.json(events);
  }),
);

router.post(
  "/",
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
