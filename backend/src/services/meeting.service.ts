import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessActor } from "../utils/access-control";
import { sendMail } from "../utils/mailer";
import { createCalendarEvent, isGoogleConnected } from "./google-auth.service";

function generateJitsiUrl(hostEmail: string): string {
  const cleanedEmail = hostEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 8) || 'crm';
  const timestamp = Date.now().toString(36);
  return `https://meet.jit.si/CRM-${cleanedEmail}-${timestamp}`;
}

function generateGoogleMeetUrl(hostEmail: string): string {
  const cleanedEmail = hostEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 6) || 'crm';
  const uniqueId = Math.random().toString(36).substring(2, 8);
  return `https://meet.google.com/${cleanedEmail}-${uniqueId}`;
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

    if (actor && (actor.role === "admin" || actor.role === "manager")) {
      const actorIds = [actor.email, actor.userId].filter(Boolean) as string[];
      where.hostId = { in: actorIds };
    }

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

  async getById(id: number, actor?: AccessActor) {
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

    if (actor && (actor.role === "admin" || actor.role === "manager")) {
      const actorIds = [actor.email, actor.userId].filter(Boolean) as string[];
      if (!actorIds.includes(meeting.hostId)) {
        throw new AppError("Access denied: you do not own this meeting", 403, "FORBIDDEN");
      }
    }

    return meeting;
  },

  async create(actor: AccessActor, input: CreateMeetingInput) {
    let meetingUrl: string | undefined;
    let googleEventId: string | undefined;
    let googleHtmlLink: string | undefined;
    const hostEmail = String(actor?.email || "crm@focalpoint.com");

    const startTime = new Date(input.scheduledAt);
    const endTime = new Date(startTime.getTime() + (input.duration || 30) * 60 * 1000);

    if (input.meetingType === "jitsi") {
      meetingUrl = generateJitsiUrl(hostEmail);
    } else if (input.meetingType === "google") {
      const googleConnected = await isGoogleConnected(hostEmail);
      if (googleConnected) {
        try {
          const result = await createCalendarEvent({
            userEmail: hostEmail,
            summary: input.title,
            description: input.agenda || `Meeting: ${input.title}\nHosted by: ${hostEmail}`,
            startTime,
            endTime,
            attendees: [input.inviteeEmail],
          });
          meetingUrl = result.meetLink ?? undefined;
          googleEventId = result.eventId || undefined;
          googleHtmlLink = result.htmlLink || undefined;
        } catch (err) {
          console.error("Google Calendar error:", err);
          meetingUrl = generateGoogleMeetUrl(hostEmail);
        }
      } else {
        meetingUrl = generateGoogleMeetUrl(hostEmail);
      }
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
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                      <span style="font-size: 32px;">📅</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Meeting Invitation</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 28px 24px;">
              <h2 style="margin: 0 0 8px; font-size: 22px; color: #111827; font-weight: 600; letter-spacing: -0.3px;">${input.title}</h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px;">You have been invited to a meeting</p>
              
              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #6b7280; font-size: 13px; width: 80px;">📆 Date</td>
                              <td style="color: #111827; font-size: 14px; font-weight: 500;">${new Date(input.scheduledAt).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #6b7280; font-size: 13px; width: 80px;">⏱️ Duration</td>
                              <td style="color: #111827; font-size: 14px; font-weight: 500;">${input.duration || 30} minutes</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #6b7280; font-size: 13px; width: 80px;">👤 Host</td>
                              <td style="color: #111827; font-size: 14px; font-weight: 500;">${actor?.email || "CRM Team"}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #6b7280; font-size: 13px; width: 80px;">💻 Platform</td>
                              <td style="color: #111827; font-size: 14px; font-weight: 500;">${input.meetingType === "jitsi" ? "Jitsi Meet (Free)" : input.meetingType === "google" ? "Google Meet" : input.meetingType === "zoom" ? "Zoom" : input.meetingType === "phone" ? "Phone Call" : "In Person"}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${input.agenda ? `
                      <tr>
                        <td style="padding: 10px 0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #6b7280; font-size: 13px; width: 80px; vertical-align: top;">📝 Agenda</td>
                              <td style="color: #111827; font-size: 14px;">${input.agenda.replace(/\n/g, "<br>")}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Join Button -->
              ${meetingUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${meetingUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; text-align: center;">🎯 Join Meeting</a>
                  </td>
                </tr>
              </table>
              ` : ""}
              
              <!-- Footer -->
              <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">Sent via Focal Point Compass CRM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    }).catch(() => {}); // non-blocking

    return meeting;
  },

  async update(id: number, actor: AccessActor, input: UpdateMeetingInput) {
    const existing = await this.getById(id, actor);
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
    const existing = await this.getById(id, actor);
    if (!existing) {
      throw new AppError("Meeting not found", 404, "NOT_FOUND");
    }

    await prisma.meeting.delete({ where: { id } });

    return { success: true };
  },

  async getUpcoming(actor: AccessActor, limit = 10) {
    const actorIds = actor ? [actor.email, actor.userId].filter(Boolean) as string[] : [];
    const hostFilter = actorIds.length > 0 ? { hostId: { in: actorIds } } : {};

    const meetings = await prisma.meeting.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        status: "scheduled",
        ...hostFilter,
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return meetings;
  },

  async getByLead(leadId: number, actor?: AccessActor) {
    const where: any = { leadId };

    if (actor && (actor.role === "admin" || actor.role === "manager")) {
      const actorIds = [actor.email, actor.userId].filter(Boolean) as string[];
      where.hostId = { in: actorIds };
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
    });

    return meetings;
  },
};
