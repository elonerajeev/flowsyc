import { prisma } from "../config/prisma";
import { syncInbox, testImapConnection } from "./imap.service";
import { logger } from "../utils/logger";
import { encrypt, decrypt } from "../utils/crypto";
import type { ImapAccount } from "@prisma/client";

// ─── Account Management ──────────────────────────────────────────────────────

export async function connectAccount(
  userId: string,
  data: { email: string; password: string; host?: string; port?: number }
) {
  const host = data.host ?? "imap.gmail.com";
  const port = data.port ?? 993;

  // Test before saving — fail fast with clear error
  const ok = await testImapConnection({ email: data.email, password: data.password, host, port });
  if (!ok) throw new Error("IMAP connection failed. Check your email and App Password.");

  const encryptedPassword = encrypt(data.password);

  const account = await prisma.imapAccount.upsert({
    where: { userId },
    create: { userId, email: data.email, password: encryptedPassword, host, port },
    update: { email: data.email, password: encryptedPassword, host, port, isActive: true },
  });

  // Trigger first sync immediately
  await triggerSync(userId);

  return sanitizeAccount(account);
}

export async function disconnectAccount(userId: string) {
  await prisma.imapAccount.update({
    where: { userId },
    data: { isActive: false },
  });
}

export async function getAccount(userId: string) {
  const account = await prisma.imapAccount.findUnique({ where: { userId } });
  return account ? sanitizeAccount(account) : null;
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export async function triggerSync(userId: string) {
  const account = await prisma.imapAccount.findUnique({ where: { userId } });
  if (!account || !account.isActive) throw new Error("No active IMAP account found.");

  const password = decrypt(account.password);
  return syncInbox({
    userId,
    email: account.email,
    host: account.host,
    port: account.port,
    password,
  });
}

// ─── Inbox Queries ───────────────────────────────────────────────────────────

export async function getInbox(
  userId: string,
  opts: { page?: number; limit?: number; unreadOnly?: boolean; search?: string }
) {
  const account = await prisma.imapAccount.findUnique({ where: { userId }, select: { email: true } });
  if (!account) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  const page  = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, opts.limit ?? 20);
  const skip  = (page - 1) * limit;

  const where: Record<string, unknown> = { toEmail: account.email };
  if (opts.unreadOnly) where.isRead = false;
  if (opts.search) {
    where.OR = [
      { subject:   { contains: opts.search, mode: "insensitive" } },
      { fromEmail: { contains: opts.search, mode: "insensitive" } },
      { fromName:  { contains: opts.search, mode: "insensitive" } },
      { body:      { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.inboxEmail.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, subject: true, fromEmail: true, fromName: true,
        isRead: true, isStarred: true, receivedAt: true,
        entityType: true, entityId: true,
        body: true, // truncated in response by controller
      },
    }),
    prisma.inboxEmail.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getEmailById(userId: string, emailId: number) {
  const account = await prisma.imapAccount.findUnique({ where: { userId }, select: { email: true } });
  if (!account) return null;

  const email = await prisma.inboxEmail.findFirst({
    where: { id: emailId, toEmail: account.email },
  });

  if (email && !email.isRead) {
    await prisma.inboxEmail.update({ where: { id: emailId }, data: { isRead: true } });
  }

  return email;
}

export async function getEmailsByEntity(entityType: string, entityId: number) {
  return prisma.inboxEmail.findMany({
    where: { entityType, entityId },
    orderBy: { receivedAt: "desc" },
    select: {
      id: true, subject: true, fromEmail: true, fromName: true,
      isRead: true, receivedAt: true, body: true,
    },
  });
}

export async function markRead(userId: string, emailId: number, isRead: boolean) {
  const account = await prisma.imapAccount.findUnique({ where: { userId }, select: { email: true } });
  if (!account) throw new Error("No account");

  return prisma.inboxEmail.updateMany({
    where: { id: emailId, toEmail: account.email },
    data: { isRead },
  });
}

export async function toggleStar(userId: string, emailId: number) {
  const account = await prisma.imapAccount.findUnique({ where: { userId }, select: { email: true } });
  if (!account) throw new Error("No account");

  const email = await prisma.inboxEmail.findFirst({
    where: { id: emailId, toEmail: account.email },
    select: { isStarred: true },
  });
  if (!email) throw new Error("Email not found");

  return prisma.inboxEmail.update({
    where: { id: emailId },
    data: { isStarred: !email.isStarred },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const account = await prisma.imapAccount.findUnique({ where: { userId }, select: { email: true } });
  if (!account) return 0;
  return prisma.inboxEmail.count({ where: { toEmail: account.email, isRead: false } });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeAccount(account: ImapAccount) {
  // Never return the encrypted password to the client
  const { password: _pw, ...safe } = account;
  return safe;
}
