import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/async-handler";
import { sendLeadWelcomeEmail } from "../utils/email-templates";
import { logger } from "../utils/logger";

const router = Router();

const demoBookingSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  company: z.string().max(200).optional(),
  teamSize: z.string().max(50).optional(),
  preferredTime: z.string().max(100).optional(),
});

router.post(
  "/demo-bookings",
  asyncHandler(async (req, res) => {
    const body = demoBookingSchema.parse(req.body);

    const nameParts = body.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const existing = await prisma.lead.findFirst({
      where: { email: body.email.toLowerCase(), deletedAt: null },
    });

    if (existing) {
      res.status(200).json({ message: "You've already registered. We'll be in touch soon!" });
      return;
    }

    const notes = [
      body.preferredTime ? `Preferred time: ${body.preferredTime}` : "",
      body.teamSize ? `Team size: ${body.teamSize}` : "",
    ].filter(Boolean).join("\n");

    await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email: body.email.toLowerCase(),
        company: body.company || "Not specified",
        source: "website",
        status: "new",
        score: 50,
        companySize: body.teamSize || null,
        notes: notes || null,
        tags: ["demo-booking"],
        createdBy: "public-demo-booking",
      },
    });

    sendLeadWelcomeEmail({
      name: body.name,
      email: body.email,
      company: body.company,
    }).catch((err) => logger.warn("Demo booking email failed", err));

    res.status(201).json({ message: "Booking confirmed! Check your email for details." });
  }),
);

export const publicRouter = router;
