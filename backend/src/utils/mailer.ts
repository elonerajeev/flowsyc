import nodemailer from "nodemailer";
import { AppError } from "../middleware/error.middleware";
import { logger } from "./logger";

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
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "CRM Team";

  if (!host || !port || port <= 0 || !from) {
    throw new AppError(
      "Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM.",
      500,
      "EMAIL_NOT_CONFIGURED",
    );
  }

  return {
    host,
    port,
    secure,
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
    logger.warn("Mail skipped (not configured)", { message: (err as any).message });
    return;
  }

  try {
    const transporter = getTransporter();
    
    // Build proper email - let nodemailer handle multipart MIME automatically
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
    logger.warn("Failed to deliver email", { message: (err as any).message });
  }
}
