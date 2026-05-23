import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { AppError } from "../middleware/error.middleware";
import { logger } from "./logger";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
};

let cachedTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
let transporterVerifiedAt = 0;
const VERIFY_TTL_MS = 5 * 60 * 1000;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readMailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "0");
  const secure = process.env.SMTP_SECURE === "true";
  const familyRaw = process.env.SMTP_FAMILY?.trim();
  const family = familyRaw === "6" ? 6 : 4;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "CRM Team";

  if (!host || !port || port <= 0 || !from) {
    throw new AppError(
      "Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM.",
      500,
      "EMAIL_NOT_CONFIGURED",
    );
  }

  if (!isEmail(from)) {
    throw new AppError("SMTP_FROM is not a valid email address.", 500, "EMAIL_NOT_CONFIGURED");
  }

  if (secure && port === 587) {
    throw new AppError(
      "Invalid SMTP setup: SMTP_SECURE=true with port 587. Use SMTP_SECURE=false for 587, or port 465 for secure SMTP.",
      500,
      "EMAIL_NOT_CONFIGURED",
    );
  }

  if (!secure && port === 465) {
    throw new AppError(
      "Invalid SMTP setup: SMTP_SECURE=false with port 465. Set SMTP_SECURE=true for port 465.",
      500,
      "EMAIL_NOT_CONFIGURED",
    );
  }

  const authRequired = host.toLowerCase().includes("gmail") || process.env.SMTP_REQUIRE_AUTH === "true";
  if (authRequired) {
    if (!user || !pass) {
      throw new AppError(
        "SMTP_USER and SMTP_PASS are required for this SMTP provider.",
        500,
        "EMAIL_NOT_CONFIGURED",
      );
    }
    if (!isEmail(user)) {
      throw new AppError("SMTP_USER must be a valid email address.", 500, "EMAIL_NOT_CONFIGURED");
    }
  }

  return {
    host,
    port,
    secure,
    family,
    from,
    fromName,
    auth: user && pass ? { user, pass } : undefined,
  };
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = readMailConfig();
  const transportConfig: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  };
  cachedTransporter = nodemailer.createTransport(transportConfig);

  return cachedTransporter;
}

async function verifyTransporter() {
  const now = Date.now();
  if (cachedTransporter && now - transporterVerifiedAt < VERIFY_TTL_MS) {
    return;
  }

  const transporter = getTransporter();
  try {
    await transporter.verify();
    transporterVerifiedAt = now;
  } catch (err) {
    throw new AppError(
      `SMTP verification failed. Check SMTP_HOST/PORT/USER/PASS: ${(err as Error)?.message || "unknown error"}`,
      500,
      "EMAIL_PROVIDER_AUTH_FAILED",
    );
  }
}

export async function sendMailDirect(input: SendMailInput) {
  if (process.env.DISABLE_EMAIL_DELIVERY === "true") {
    return;
  }

  const config = readMailConfig();
  await verifyTransporter();

  try {
    const transporter = getTransporter();

    const mailOptions: nodemailer.SendMailOptions = {
      from: `${config.fromName} <${config.from}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    throw new AppError(
      `Failed to deliver email: ${(err as Error)?.message || "unknown error"}`,
      500,
      "EMAIL_DELIVERY_FAILED",
    );
  }
}

export async function sendMail(input: SendMailInput) {
  const { queueEmail } = await import("../services/queue.service");
  await queueEmail(input);
}
