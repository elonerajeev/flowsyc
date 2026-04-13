import nodemailer from "nodemailer";

import { AppError } from "../middleware/error.middleware";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
};

let cachedTransporter: nodemailer.Transporter | null = null;

function readMailConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "0");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !port || port <= 0 || !from) {
    throw new AppError(
      "Offer letter email delivery is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM.",
      500,
      "EMAIL_NOT_CONFIGURED",
    );
  }

  return {
    host,
    port,
    secure,
    from,
    auth: user && pass ? { user, pass } : undefined,
  };
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = readMailConfig();
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return cachedTransporter;
}

export async function sendMail(input: SendMailInput) {
  if (process.env.DISABLE_EMAIL_DELIVERY === "true") {
    return;
  }

  let config;
  try {
    config = readMailConfig();
  } catch (err) {
    console.warn("Mail skipped (not configured):", (err as any).message);
    return;
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
  } catch (err) {
    console.warn("Failed to deliver email:", (err as any).message);
    // We don't re-throw here to allow the rest of the business logic to complete
  }
}
