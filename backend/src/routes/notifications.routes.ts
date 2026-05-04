import { Router, Request } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateQuery } from "../middleware/validate.middleware";
import * as notificationsService from "../services/notifications.service";

export const notificationsRouter = Router();

const notificationQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().max(100).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

notificationsRouter.get("/", requireAuth, validateQuery(notificationQuerySchema), asyncHandler(async (req: Request, res) => {
  const result = await notificationsService.listNotifications(
    req.auth!.userId,
    req.query as z.infer<typeof notificationQuerySchema>
  );
  res.json(result);
}));

notificationsRouter.get("/unread-count", requireAuth, asyncHandler(async (req: Request, res) => {
  const count = await notificationsService.getUnreadCount(req.auth!.userId);
  res.json({ count });
}));

notificationsRouter.patch("/:id/read", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res) => {
  const notificationId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(notificationId)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }
  await notificationsService.markAsRead(req.auth!.userId, notificationId);
  res.json({ success: true });
}));

notificationsRouter.post("/read-all", requireAuth, asyncHandler(async (req: Request, res) => {
  await notificationsService.markAllAsRead(req.auth!.userId);
  res.json({ success: true });
}));

notificationsRouter.delete("/cleanup", requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req: Request, res) => {
  await notificationsService.deleteOldNotifications(req.auth!.userId);
  res.json({ success: true });
}));