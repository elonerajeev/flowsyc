import { ImapFlow } from "imapflow";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";

const FETCH_LIMIT = 50; // emails per sync
const BODY_TEXT_LIMIT = 10_000; // chars
const BODY_HTML_LIMIT = 50_000; // chars

export interface ImapSyncConfig {
  userId: string;
  email: string;
  host: string;
  port: number;
  password: string; // Gmail App Password
}

export interface SyncResult {
  synced: number;
  errors: number;
  lastSync: Date;
}

/**
 * Connect to IMAP, fetch recent emails, upsert into DB, link to CRM entities.
 * Safe to call repeatedly — uses uid+toEmail unique constraint to avoid duplicates.
 */
export async function syncInbox(config: ImapSyncConfig): Promise<SyncResult> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true, // TLS — never plain
    auth: { user: config.email, pass: config.password },
    logger: false, // suppress verbose IMAP logs
    tls: { rejectUnauthorized: true }, // enforce cert validation
  });

  let synced = 0;
  let errors = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const status = await client.status("INBOX", { messages: true });
      const totalMessages = status.messages ?? FETCH_LIMIT;
      const startSeq = Math.max(1, totalMessages - FETCH_LIMIT + 1);

      const messages = client.fetch(`${startSeq}:*`, {
        uid: true,
        envelope: true,
        source: true,
      });

      for await (const msg of messages) {
        try {
          if (!msg.envelope) continue; // skip messages without envelope
          const uid = String(msg.uid);
          const envelope = msg.envelope;
          const fromEmail = (envelope.from?.[0]?.address ?? "").toLowerCase().trim();
          const fromName  = envelope.from?.[0]?.name ?? "";
          const subject   = envelope.subject ?? "(no subject)";
          const receivedAt = envelope.date ?? new Date();
          const messageId  = envelope.messageId ?? null;

          if (!fromEmail) continue; // skip malformed

          const rawSource = msg.source ? msg.source.toString() : "";
          const body     = extractPlainText(rawSource);
          const htmlBody = extractHtml(rawSource);

          // Match sender to a CRM entity (Lead > Client > Contact priority)
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
            // Re-link if entity was added to CRM after email arrived
            update: { entityType, entityId },
          });

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
    // Always close connection — even on error
    try { await client.logout(); } catch { /* ignore logout errors */ }
  }
}

/**
 * Test IMAP credentials without syncing any data.
 * Returns true if connection succeeds.
 */
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

// ─── Entity Matching ────────────────────────────────────────────────────────

async function matchEntity(email: string): Promise<{ entityType: string | null; entityId: number | null }> {
  // Priority: Lead → Client → Contact
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

// ─── Body Parsers ────────────────────────────────────────────────────────────

function extractPlainText(raw: string): string {
  const bodyStart = raw.indexOf("\r\n\r\n");
  const body = bodyStart !== -1 ? raw.slice(bodyStart + 4) : raw;
  return body
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, BODY_TEXT_LIMIT);
}

function extractHtml(raw: string): string | null {
  const match = raw.match(/<html[\s\S]*?<\/html>/i);
  return match ? match[0].slice(0, BODY_HTML_LIMIT) : null;
}
