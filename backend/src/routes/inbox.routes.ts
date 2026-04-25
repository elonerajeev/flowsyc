import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import * as ctrl from "../controllers/inbox.controller";

const router = Router();

// All inbox routes require authentication
router.use(requireAuth);

const connectSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8).max(64),  // Gmail App Password is 16 chars
  host:     z.string().optional(),
  port:     z.coerce.number().int().min(1).max(65535).optional(),
});

// Account
router.get   ("/account",        ctrl.getAccount);
router.post  ("/account",        validateBody(connectSchema), ctrl.connectAccount);
router.delete("/account",        ctrl.disconnectAccount);

// Sync
router.post  ("/sync",           ctrl.syncNow);

// Inbox list + single email
router.get   ("/",               ctrl.getInbox);
router.get   ("/unread-count",   ctrl.getUnreadCount);
router.get   ("/by-entity",      ctrl.getEmailsByEntity);
router.get   ("/:id",            ctrl.getEmail);

// Actions
router.patch ("/:id/read",       validateBody(z.object({ isRead: z.boolean() })), ctrl.markRead);
router.patch ("/:id/star",       ctrl.toggleStar);

export default router;
