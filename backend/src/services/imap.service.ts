import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";

const FETCH_LIMIT = 50;

export interface ImapSyncConfig {
  userId: string;
  email: string;
  host: string;
  port: number;
  password: string;
}

export interface SyncResult {
  synced: number;
  errors: number;
  lastSync: Date;
}

export async function syncInbox(config: ImapSyncConfig): Promise<SyncResult> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.email, pass: config.password },
    logger: false,
    tls: { rejectUnauthorized: true },
  });

  let synced = 0;
  let errors = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages ?? FETCH_LIMIT;
      const startSeq = Math.max(1, total - FETCH_LIMIT + 1);

      const messages = client.fetch(`${startSeq}:*`, { uid: true, source: true });

      for await (const msg of messages) {
        try {
          if (!msg.source) continue;

          // mailparser handles all MIME: base64, quoted-printable, multipart, charsets
          const parsed = await simpleParser(msg.source);

          const uid        = String(msg.uid);
          const fromEmail  = (parsed.from?.value?.[0]?.address ?? "").toLowerCase().trim();
          const fromName   = parsed.from?.value?.[0]?.name ?? "";
          const subject    = parsed.subject ?? "(no subject)";
          const receivedAt = parsed.date ?? new Date();
          const messageId  = parsed.messageId ?? null;

          if (!fromEmail) continue;

          // Clean plain text — strip excessive whitespace
          const body = (parsed.text ?? "")
            .replace(/\r\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .slice(0, 10_000);

          const htmlBody = parsed.html ? parsed.html.slice(0, 50_000) : null;

          const { entityType, entityId } = await matchEntity(fromEmail);

          await prisma.inboxEmail.upsert({
            where: { uid_toEmail: { uid, toEmail: config.email } },
            create: {
              uid, messageId, subject,
              fromEmail, fromName,
              toEmail: config.email,
              body, htmlBody,
              entityType, entityId,
              receivedAt,
            },
            update: { entityType, entityId, body, htmlBody },
          });

          // If this email is from a lead, trigger status auto-advance
          if (entityType === "Lead" && entityId) {
            const { processInboxEmailForLead } = await import("./lead-email.service");
            await processInboxEmailForLead(
              (await prisma.inboxEmail.findFirst({
                where: { uid, toEmail: config.email },
                select: { id: true },
              }))!.id
            ).catch((err) => logger.error("[IMAP] Lead tracking failed:", err));
          }

          synced++;
        } catch (msgErr) {
          errors++;
          logger.error("[IMAP] Failed to process message:", msgErr);
        }
      }
    } finally {
      lock.release();
    }

    const lastSync = new Date();
    await prisma.imapAccount.update({
      where: { userId: config.userId },
      data: { lastSync },
    });

    logger.info(`[IMAP] Sync complete for ${config.email}: ${synced} synced, ${errors} errors`);
    return { synced, errors, lastSync };
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}

export async function testImapConnection(config: Omit<ImapSyncConfig, "userId">): Promise<boolean> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.email, pass: config.password },
    logger: false,
    tls: { rejectUnauthorized: true },
  });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}

async function matchEntity(email: string): Promise<{ entityType: string | null; entityId: number | null }> {
  const [lead, client, contact] = await Promise.all([
    prisma.lead.findFirst({ where: { email }, select: { id: true } }),
    prisma.client.findFirst({ where: { email }, select: { id: true } }),
    prisma.contact.findFirst({ where: { email }, select: { id: true } }),
  ]);
  if (lead)    return { entityType: "Lead",    entityId: lead.id };
  if (client)  return { entityType: "Client",  entityId: client.id };
  if (contact) return { entityType: "Contact", entityId: contact.id };
  return { entityType: null, entityId: null };
}
