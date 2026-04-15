import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessActor } from "../utils/access-control";
import { sendMail } from "../utils/mailer";

function generateJitsiUrl(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let roomId = "";
  for (let i = 0; i < 12; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `https://meet.jit.si/CRM-${roomId}`;
}

function generateGoogleMeetUrl(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let roomId = "";
  for (let i = 0; i < 20; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `https://meet.google.com/${roomId.slice(0, 3)}-${roomId.slice(3, 7)}-${roomId.slice(7)}`;
}

export interface CreateMeetingInput {
  leadId?: number;
  clientId?: number;
  contactId?: number;
  title: string;
  type?: "demo" | "discovery" | "proposal" | "negotiation" | "onboarding" | "check_in" | "other";
  scheduledAt: string;
  duration?: number;
  meetingType?: "jitsi" | "google" | "zoom" | "phone" | "in_person";
  inviteeEmail: string;
  inviteeName: string;
  agenda?: string;
}

export interface UpdateMeetingInput {
  title?: string;
  type?: "demo" | "discovery" | "proposal" | "negotiation" | "onboarding" | "check_in" | "other";
  scheduledAt?: string;
  duration?: number;
  notes?: string;
  status?: "scheduled" | "completed" | "cancelled" | "no_show";
  meetingUrl?: string;
}

export const meetingService = {
  async list(actor: AccessActor, filters?: { leadId?: number; clientId?: number; contactId?: number; status?: string }) {
    const where: any = {};

    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.contactId) where.contactId = filters.contactId;
    if (filters?.status) where.status = filters.status;

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return meetings;
  },

  async getById(id: number) {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!meeting) {
      throw new AppError("Meeting not found", 404, "NOT_FOUND");
    }

    return meeting;
  },

  async create(actor: AccessActor, input: CreateMeetingInput) {
    let meetingUrl: string | undefined;

    if (input.meetingType === "jitsi") {
      meetingUrl = generateJitsiUrl();
    } else if (input.meetingType === "google") {
      meetingUrl = generateGoogleMeetUrl();
    }

    const meeting = await prisma.meeting.create({
      data: {
        leadId: input.leadId,
        clientId: input.clientId,
        contactId: input.contactId,
        title: input.title,
        type: input.type || "other",
        scheduledAt: new Date(input.scheduledAt),
        duration: input.duration || 30,
        meetingUrl,
        hostId: String(actor?.userId || actor?.email || "unknown"),
        hostName: actor?.email || "Unknown Host",
        inviteeEmail: input.inviteeEmail,
        inviteeName: input.inviteeName,
        agenda: input.agenda || "",
        status: "scheduled",
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Log activity for lead, client, or contact
    const activityTarget = input.leadId
      ? { entityType: "lead", entityId: input.leadId }
      : input.clientId
      ? { entityType: "client", entityId: input.clientId }
      : input.contactId
      ? { entityType: "contact", entityId: input.contactId }
      : null;

    if (activityTarget) {
      await prisma.activity.create({
        data: {
          entityType: activityTarget.entityType,
          entityId: activityTarget.entityId,
          type: "meeting",
          title: `Meeting Scheduled: ${input.title}`,
          description: `Meeting scheduled for ${new Date(input.scheduledAt).toLocaleString()} with ${input.inviteeName}`,
          metadata: JSON.stringify({ meetingId: meeting.id, meetingUrl }),
          createdBy: String(actor?.userId || actor?.email || "system"),
        },
      });
    }

    // Send invite email (non-blocking)
    sendMail({
      to: input.inviteeEmail,
      subject: `Meeting Invite: ${input.title}`,
      text: `Hi ${input.inviteeName},\n\nYou have a meeting scheduled.\n\nTitle: ${input.title}\nDate: ${new Date(input.scheduledAt).toLocaleString()}\nDuration: ${input.duration || 30} minutes\n${meetingUrl ? `Join: ${meetingUrl}` : ""}\n${input.agenda ? `\nAgenda:\n${input.agenda}` : ""}\n\nHosted by: ${actor?.email || "CRM"}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="margin:0 0 4px;font-size:18px;color:#111">📅 ${input.title}</h2>
          <p style="margin:0 0 16px;color:#6b7280;font-size:14px">You have a meeting scheduled</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
            <tr><td style="padding:6px 0;color:#6b7280;width:90px">Date</td><td style="padding:6px 0;font-weight:500">${new Date(input.scheduledAt).toLocaleString()}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Duration</td><td style="padding:6px 0;font-weight:500">${input.duration || 30} minutes</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Host</td><td style="padding:6px 0;font-weight:500">${actor?.email || "CRM"}</td></tr>
            ${input.agenda ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top">Agenda</td><td style="padding:6px 0">${input.agenda.replace(/\n/g, "<br>")}</td></tr>` : ""}
          </table>
          ${meetingUrl ? `<a href="${meetingUrl}" style="display:inline-block;background:#4285f4;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">Join Google Meet</a>` : ""}
          <p style="margin-top:20px;font-size:12px;color:#9ca3af">Sent via Focal Point Compass CRM</p>
        </div>
      `,
    }).catch(() => {}); // non-blocking

    return meeting;
  },

  async update(id: number, actor: AccessActor, input: UpdateMeetingInput) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new AppError("Meeting not found", 404, "NOT_FOUND");
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.type && { type: input.type }),
        ...(input.scheduledAt && { scheduledAt: new Date(input.scheduledAt) }),
        ...(input.duration && { duration: input.duration }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status && { status: input.status }),
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (existing.leadId && (input.status === "completed" || input.notes)) {
      await prisma.activity.create({
        data: {
          entityType: "lead",
          entityId: existing.leadId,
          type: "meeting",
          title: input.status === "completed" ? `Meeting Completed: ${meeting.title}` : `Meeting Updated: ${meeting.title}`,
          description: input.notes || `Meeting ${input.status} on ${new Date().toLocaleString()}`,
          metadata: JSON.stringify({ meetingId: meeting.id }),
          createdBy: String(actor?.userId || actor?.email || "system"),
        },
      });
    }

    return meeting;
  },

  async delete(id: number, actor: AccessActor) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new AppError("Meeting not found", 404, "NOT_FOUND");
    }

    await prisma.meeting.delete({ where: { id } });

    return { success: true };
  },

  async getUpcoming(actor: AccessActor, limit = 10) {
    const meetings = await prisma.meeting.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        status: "scheduled",
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return meetings;
  },

  async getByLead(leadId: number) {
    const meetings = await prisma.meeting.findMany({
      where: { leadId },
      orderBy: { scheduledAt: "desc" },
    });

    return meetings;
  },
};
