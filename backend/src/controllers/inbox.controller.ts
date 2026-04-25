import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler";
import * as inboxService from "../services/inbox.service";

export const connectAccount = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, host, port } = req.body;
  const account = await inboxService.connectAccount(req.auth!.userId, { email, password, host, port });
  res.status(201).json(account);
});

export const disconnectAccount = asyncHandler(async (req: Request, res: Response) => {
  await inboxService.disconnectAccount(req.auth!.userId);
  res.json({ message: "IMAP account disconnected" });
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await inboxService.getAccount(req.auth!.userId);
  res.json(account ?? null);
});

export const syncNow = asyncHandler(async (req: Request, res: Response) => {
  const result = await inboxService.triggerSync(req.auth!.userId);
  res.json(result);
});

export const getInbox = asyncHandler(async (req: Request, res: Response) => {
  const page       = Number(req.query.page)  || 1;
  const limit      = Number(req.query.limit) || 20;
  const unreadOnly = req.query.unreadOnly === "true";
  const search     = typeof req.query.search === "string" ? req.query.search : undefined;

  const result = await inboxService.getInbox(req.auth!.userId, { page, limit, unreadOnly, search });

  // Truncate body preview to 200 chars in list view
  result.data = result.data.map((e: any) => ({ ...e, body: e.body?.slice(0, 200) }));
  res.json(result);
});

export const getEmail = asyncHandler(async (req: Request, res: Response) => {
  const email = await inboxService.getEmailById(req.auth!.userId, Number(req.params.id));
  if (!email) { res.status(404).json({ error: "Email not found" }); return; }
  res.json(email);
});

export const getEmailsByEntity = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId } = req.query;
  if (!entityType || !entityId) { res.status(400).json({ error: "entityType and entityId required" }); return; }
  const emails = await inboxService.getEmailsByEntity(String(entityType), Number(entityId));
  res.json(emails);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const { isRead } = req.body;
  await inboxService.markRead(req.auth!.userId, Number(req.params.id), Boolean(isRead));
  res.json({ message: "Updated" });
});

export const toggleStar = asyncHandler(async (req: Request, res: Response) => {
  const result = await inboxService.toggleStar(req.auth!.userId, Number(req.params.id));
  res.json(result);
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await inboxService.getUnreadCount(req.auth!.userId);
  res.json({ count });
});
