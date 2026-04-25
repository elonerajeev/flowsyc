import { z } from "zod";

const meetingTypeSchema = z.enum(["demo", "discovery", "proposal", "negotiation", "onboarding", "check_in", "other"]);
const meetingModeSchema = z.enum(["jitsi", "google", "zoom", "phone", "in_person"]);
const meetingStatusSchema = z.enum(["scheduled", "completed", "cancelled", "no_show"]);

const datetimeStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date/time value");

export const createMeetingSchema = z.object({
  leadId: z.number().int().positive().optional(),
  clientId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(200),
  type: meetingTypeSchema.optional(),
  scheduledAt: datetimeStringSchema,
  duration: z.number().int().positive().max(24 * 60).optional(),
  meetingType: meetingModeSchema.optional(),
  inviteeEmail: z.string().trim().email(),
  inviteeName: z.string().trim().min(1).max(160),
  agenda: z.string().max(4000).optional(),
});

export const updateMeetingSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    type: meetingTypeSchema.optional(),
    scheduledAt: datetimeStringSchema.optional(),
    duration: z.number().int().positive().max(24 * 60).optional(),
    notes: z.string().max(4000).optional(),
    status: meetingStatusSchema.optional(),
    meetingUrl: z.string().trim().url().max(1000).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });
