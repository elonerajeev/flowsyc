import { z } from "zod";

export const eventRepeatSchema = z.enum(["none", "weekly", "monthly"]);
export const assignmentKindSchema = z.enum(["none", "member", "team"]);
export const eventColorSchema = z.enum(["primary", "success", "warning", "info", "destructive"]);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const baseCalendarEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  startTime: z.string().regex(timeRegex, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(timeRegex, "Invalid end time format (HH:MM)"),
  location: z.string().max(500).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  color: eventColorSchema.optional().default("primary"),
  repeat: eventRepeatSchema.optional().default("none"),
  assignmentKind: assignmentKindSchema.optional().default("none"),
  assigneeId: z.string().max(200).optional().default(""),
  assigneeName: z.string().max(200).optional().default(""),
  assigneeMeta: z.string().max(200).optional().default(""),
});

export const createCalendarEventSchema = baseCalendarEventSchema.refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return data.startTime < data.endTime;
    }
    return true;
  },
  { message: "End time must be after start time", path: ["endTime"] }
);

const baseUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  color: eventColorSchema.optional(),
  repeat: eventRepeatSchema.optional(),
  assignmentKind: assignmentKindSchema.optional(),
  assigneeId: z.string().max(200).optional(),
  assigneeName: z.string().max(200).optional(),
  assigneeMeta: z.string().max(200).optional(),
});

export const updateCalendarEventSchema = baseUpdateSchema;

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
