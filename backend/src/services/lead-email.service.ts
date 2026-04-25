import { prisma } from "../config/prisma";
import { sendMail } from "../utils/mailer";
import { logger } from "../utils/logger";
import { onLeadUpdated } from "./automation-engine";
import { gtmLifecycleService } from "./gtm-lifecycle.service";
import type { LeadStatus } from "@prisma/client";

// ─── Send email to a lead ─────────────────────────────────────────────────────

export interface SendLeadEmailInput {
  subject: string;
  body: string;          // plain text
  htmlBody?: string;     // optional rich HTML
  templateId?: string;   // optional named template
}

export async function sendEmailToLead(
  leadId: number,
  input: SendLeadEmailInput,
  senderEmail: string
): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.deletedAt) throw new Error("Lead not found");

  const html = input.htmlBody ?? `<p>${input.body.replace(/\n/g, "<br>")}</p>`;

  await sendMail({
    to: lead.email,
    subject: input.subject,
    text: input.body,
    html,
  });

  // Log to EmailQueue for tracking
  await prisma.emailQueue.create({
    data: {
      to: lead.email,
      subject: input.subject,
      body: input.body,
      htmlBody: html,
      status: "sent",
      sentAt: new Date(),
      entityType: "Lead",
      entityId: leadId,
      recipientName: `${lead.firstName} ${lead.lastName}`,
    },
  });

  // Log to activity feed
  await prisma.activityLog.create({
    data: {
      action: "email_sent",
      entityType: "Lead",
      entityId: leadId,
      description: `Email sent to ${lead.email}: "${input.subject}"`,
      performedBy: senderEmail,
      isVisible: true,
    },
  });

  // Auto-advance: if lead is still "new", move to "contacted"
  if (lead.status === "new") {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "contacted" as LeadStatus },
    });
    await onLeadUpdated(leadId, { status: "contacted", trigger: "email_sent" }, senderEmail);
    logger.info(`[LeadEmail] Auto-advanced lead ${leadId} to 'contacted' after email sent`);
  }
}

// ─── Get email history for a lead ────────────────────────────────────────────

export async function getLeadEmailHistory(leadId: number) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { email: true } });
  if (!lead) return [];

  const [sent, received] = await Promise.all([
    // Emails sent from CRM to this lead
    prisma.emailQueue.findMany({
      where: { entityType: "Lead", entityId: leadId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, subject: true, body: true, status: true,
        sentAt: true, createdAt: true, recipientName: true,
      },
    }),
    // Emails received from this lead (IMAP inbox)
    prisma.inboxEmail.findMany({
      where: { fromEmail: lead.email },
      orderBy: { receivedAt: "desc" },
      select: {
        id: true, subject: true, body: true, fromName: true,
        fromEmail: true, receivedAt: true, isRead: true,
      },
    }),
  ]);

  return {
    sent: sent.map((e) => ({ ...e, direction: "outbound" as const })),
    received: received.map((e) => ({ ...e, direction: "inbound" as const })),
  };
}

// ─── Inbox reply tracking: auto-update lead status ───────────────────────────
// Called by inbox scheduler after each sync

export async function processInboxEmailForLead(inboxEmailId: number): Promise<void> {
  const email = await prisma.inboxEmail.findUnique({ where: { id: inboxEmailId } });
  if (!email || email.entityType !== "Lead" || !email.entityId) return;

  const lead = await prisma.lead.findUnique({ where: { id: email.entityId } });
  if (!lead || lead.deletedAt) return;

  // If lead replied → they're engaged → advance status
  const nextStatus = getNextStatusOnReply(lead.status);
  if (!nextStatus) return; // already at a terminal status

  logger.info(`[InboxTracking] Lead ${lead.id} replied → advancing ${lead.status} → ${nextStatus}`);

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: nextStatus as LeadStatus },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "status_auto_advanced",
      entityType: "Lead",
      entityId: lead.id,
      description: `Lead replied to email — status auto-advanced from "${lead.status}" to "${nextStatus}"`,
      performedBy: "system",
      isVisible: true,
    },
  });

  // Trigger full lifecycle sync (creates contact/deal/client as needed)
  await onLeadUpdated(lead.id, { status: nextStatus, trigger: "inbox_reply" }, "system");

  logger.info(`[InboxTracking] Lifecycle sync triggered for lead ${lead.id}`);
}

// Status advancement rules on reply:
// new → contacted (they replied = we've been in touch)
// contacted → qualified (they replied again = showing interest)
// qualified → proposal (ongoing conversation = ready for proposal)
// proposal/negotiation/closed_* → no auto-advance (human decision needed)
function getNextStatusOnReply(current: string): string | null {
  const map: Record<string, string> = {
    new:       "contacted",
    contacted: "qualified",
    qualified: "proposal",
  };
  return map[current] ?? null;
}
