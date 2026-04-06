import { sendMail } from "./mailer";
import { logger } from "./logger";

const APP_NAME = "Focal Point Compass";

export const emailTemplates = {
  welcome(user: { name: string; email: string; role: string }) {
    return {
      to: user.email,
      subject: `Welcome to ${APP_NAME}!`,
      text: `Hello ${user.name},\n\nWelcome to ${APP_NAME}! Your account has been created with the role of ${user.role}.\n\nYou can now log in and start managing your CRM workflow.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">Welcome to ${APP_NAME}!</h2>
          <p>Hello ${user.name},</p>
          <p>Your account has been created successfully.</p>
          <table style="margin: 16px 0; border-collapse: collapse;">
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Email</td><td>${user.email}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Role</td><td style="text-transform: capitalize;">${user.role}</td></tr>
          </table>
          <p>You can now log in and start managing your CRM workflow.</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
    };
  },

  invoiceReminder(invoice: { id: string; client: string; amount: string; due: string }, recipientEmail: string) {
    return {
      to: recipientEmail,
      subject: `Invoice Reminder: ${invoice.id} - ${invoice.amount} due ${invoice.due}`,
      text: `Hello,\n\nThis is a reminder that invoice ${invoice.id} for ${invoice.amount} is due on ${invoice.due}.\n\nClient: ${invoice.client}\nAmount: ${invoice.amount}\nDue Date: ${invoice.due}\n\nPlease ensure timely payment.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">Invoice Reminder</h2>
          <p>Hello,</p>
          <p>This is a reminder about an upcoming invoice payment.</p>
          <table style="margin: 16px 0; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Invoice ID</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">${invoice.id}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Client</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">${invoice.client}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Amount</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: 600;">${invoice.amount}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600;">Due Date</td><td style="padding: 8px 16px; color: #dc2626; font-weight: 600;">${invoice.due}</td></tr>
          </table>
          <p>Please ensure timely payment to avoid any service interruptions.</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
    };
  },

  passwordReset(user: { name: string; email: string }, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL ?? "http://localhost:8080"}/reset-password?token=${resetToken}`;
    return {
      to: user.email,
      subject: `Password Reset - ${APP_NAME}`,
      text: `Hello ${user.name},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">Password Reset</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
    };
  },
};

export async function sendWelcomeEmail(user: { name: string; email: string; role: string }) {
  try {
    const email = emailTemplates.welcome(user);
    await sendMail(email);
  } catch (err) {
    // Don't block signup if email fails
    logger.warn("Failed to send welcome email", { error: err instanceof Error ? err.message : String(err), email: user.email });
  }
}

export async function sendInvoiceReminder(invoice: { id: string; client: string; amount: string; due: string }, recipientEmail: string) {
  const email = emailTemplates.invoiceReminder(invoice, recipientEmail);
  await sendMail(email);
}
