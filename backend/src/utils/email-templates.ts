import PDFDocument from "pdfkit";
import { sendMail } from "./mailer";
import { logger } from "./logger";

const APP_NAME = "Flowsyc";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:8080";

// ─── Shared branded email layout ────────────────────────────────────────────
function emailLayout(content: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;width:52px;height:52px;line-height:52px;text-align:center;font-size:26px;font-weight:900;color:#fff;margin-bottom:12px;">F</div>
    <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;margin-bottom:4px;">Flowsyc</div>
    <div style="font-size:11px;color:#94a3b8;letter-spacing:2.5px;text-transform:uppercase;">Enterprise CRM Platform</div>
  </td></tr>
  <!-- BODY -->
  <tr><td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
    ${content}
  </td></tr>
  <!-- FOOTER -->
  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">${footerNote ?? `This email was sent by <strong>${APP_NAME}</strong>. If you have questions, reply to this email.`}</p>
    <p style="margin:0 0 16px;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} ${APP_NAME} · Enterprise CRM Platform</p>
    <a href="${FRONTEND_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">Open ${APP_NAME}</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function ctaButton(label: string, url: string, color = "linear-gradient(135deg,#6366f1,#8b5cf6)"): string {
  return `<p style="margin:28px 0 0;text-align:center;"><a href="${url}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">${label}</a></p>`;
}

function infoTable(rows: { label: string; value: string; highlight?: boolean }[]): string {
  const rowsHtml = rows.map(r => `<tr>
    <td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:600;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${r.label}</td>
    <td style="padding:10px 16px;font-size:14px;color:${r.highlight ? "#6366f1" : "#1e293b"};font-weight:${r.highlight ? "700" : "400"};border-bottom:1px solid #f1f5f9;">${r.value}</td>
  </tr>`).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:20px 0;">${rowsHtml}</table>`;
}

function alertBox(text: string, type: "info" | "warning" | "success" | "danger" = "info"): string {
  const map = { info: ["#eff6ff", "#3b82f6"], warning: ["#fffbeb", "#f59e0b"], success: ["#f0fdf4", "#22c55e"], danger: ["#fef2f2", "#ef4444"] };
  const [bg, border] = map[type];
  return `<div style="background:${bg};border-left:4px solid ${border};border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;font-size:14px;color:#1e293b;">${text}</div>`;
}

function hi(name: string): string {
  return `<p style="font-size:16px;color:#1e293b;margin:0 0 16px;">Hi <strong>${name}</strong>,</p>`;
}

function sig(): string {
  return `<p style="margin:32px 0 0;font-size:14px;color:#64748b;border-top:1px solid #f1f5f9;padding-top:20px;">Warm regards,<br/><strong style="color:#1e293b;">The ${APP_NAME} Team</strong></p>`;
}

function generateSalarySlipPDF(salary: { name: string; period: string; baseSalary: number; allowances: number; deductions: number; netPay: number; paidAt: Date }) {
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  // Header
  doc.fontSize(20).text(`${APP_NAME} - Salary Slip`, { align: 'center' });
  doc.moveDown();

  // Employee details
  doc.fontSize(14).text(`Employee Name: ${salary.name}`);
  doc.text(`Pay Period: ${salary.period}`);
  doc.text(`Payment Date: ${salary.paidAt.toLocaleDateString()}`);
  doc.moveDown();

  // Salary breakdown
  doc.fontSize(12).text('Salary Breakdown:', { underline: true });
  doc.moveDown(0.5);

  const startY = doc.y;
  doc.text('Base Salary:', 50, startY);
  doc.text(`₹${salary.baseSalary}`, 200, startY);

  doc.text('Allowances:', 50, startY + 20);
  doc.text(`₹${salary.allowances}`, 200, startY + 20);

  doc.text('Deductions:', 50, startY + 40);
  doc.text(`₹${salary.deductions}`, 200, startY + 40);

  doc.font('Helvetica-Bold').text('Net Salary:', 50, startY + 60);
  doc.text(`₹${salary.netPay}`, 200, startY + 60);

  doc.moveDown(2);
  doc.fontSize(10).text('This is a computer-generated salary slip.', { align: 'center' });

  doc.end();

  return Buffer.concat(buffers);
}

function generateOfferLetterPDF(data: {
  candidate: { name: string; email: string; jobTitle: string };
  hr: { name: string; designation: string };
  offer: { joiningDate: string; offeredSalary: string; jobTitle: string; department: string; location: string };
}) {
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  // Header
  doc.fontSize(20).text(`${APP_NAME} - Offer Letter`, { align: 'center' });
  doc.moveDown();

  // Date
  doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
  doc.moveDown();

  // Candidate details
  doc.fontSize(14).text(`To: ${data.candidate.name}`);
  doc.text(`Email: ${data.candidate.email}`);
  doc.moveDown();

  // Subject
  doc.font('Helvetica-Bold').text('Subject: Job Offer for the Position of ' + data.offer.jobTitle);
  doc.moveDown();

  // Body
  doc.font('Helvetica').fontSize(12);
  doc.text('Dear ' + data.candidate.name + ',');
  doc.moveDown();
  doc.text('We are pleased to offer you the position of ' + data.offer.jobTitle + ' in our ' + data.offer.department + ' department.');
  doc.moveDown();
  doc.text('The terms of your employment are as follows:');
  doc.moveDown(0.5);

  const startY = doc.y;
  doc.text('Position:', 50, startY);
  doc.text(data.offer.jobTitle, 150, startY);

  doc.text('Department:', 50, startY + 20);
  doc.text(data.offer.department, 150, startY + 20);

  doc.text('Location:', 50, startY + 40);
  doc.text(data.offer.location, 150, startY + 40);

  doc.text('Joining Date:', 50, startY + 60);
  doc.text(data.offer.joiningDate, 150, startY + 60);

  doc.text('Offered Salary:', 50, startY + 80);
  doc.text('₹' + data.offer.offeredSalary, 150, startY + 80);

  doc.moveDown(3);
  doc.text('We look forward to welcoming you to our team.');
  doc.moveDown();
  doc.text('Sincerely,');
  doc.text(data.hr.name);
  doc.text(data.hr.designation);
  doc.text(APP_NAME);

  doc.end();

  return Buffer.concat(buffers);
}

export const emailTemplates = {
  welcome(user: { name: string; email: string; role: string }) {
    return {
      to: user.email,
      subject: `Welcome to ${APP_NAME}!`,
      text: `Hello ${user.name},\n\nWelcome to ${APP_NAME}! Your account has been created with the role of ${user.role}.\n\nLogin at: ${FRONTEND_URL}/login\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Welcome to ${APP_NAME}! 🎉</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Your account is ready. Here's what you need to get started.</p>
        ${hi(user.name)}
        <p style="color:#475569;font-size:15px;line-height:1.6;">Your account has been created successfully. You can now log in and start managing your CRM workflow.</p>
        ${infoTable([
          { label: "Email", value: user.email },
          { label: "Role", value: user.role.charAt(0).toUpperCase() + user.role.slice(1), highlight: true },
        ])}
        ${ctaButton("Log In to " + APP_NAME, `${FRONTEND_URL}/login`)}
        ${sig()}
      `),
    };
  },

  invoiceReminder(invoice: { id: string; client: string; amount: string; due: string }, recipientEmail: string) {
    return {
      to: recipientEmail,
      subject: `Invoice Reminder: ${invoice.id} — ${invoice.amount} due ${invoice.due}`,
      text: `Invoice ${invoice.id} for ${invoice.amount} is due on ${invoice.due}.\n\nClient: ${invoice.client}\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Invoice Payment Reminder</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">A payment is due soon — please review the details below.</p>
        ${alertBox("⏰ Payment due on <strong>" + invoice.due + "</strong>. Please ensure timely payment to avoid service interruptions.", "warning")}
        ${infoTable([
          { label: "Invoice ID", value: invoice.id },
          { label: "Client", value: invoice.client },
          { label: "Amount", value: invoice.amount, highlight: true },
          { label: "Due Date", value: invoice.due },
        ])}
        ${ctaButton("View Invoice", `${FRONTEND_URL}/finance`, "linear-gradient(135deg,#f59e0b,#d97706)")}
        ${sig()}
      `),
    };
  },

  passwordReset(user: { name: string; email: string }, resetToken: string) {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    return {
      to: user.email,
      subject: `Reset Your Password — ${APP_NAME}`,
      text: `Hello ${user.name},\n\nReset your password: ${resetUrl}\n\nExpires in 1 hour.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Reset Your Password</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">We received a request to reset your password.</p>
        ${hi(user.name)}
        <p style="color:#475569;font-size:15px;line-height:1.6;">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        ${ctaButton("Reset Password", resetUrl, "linear-gradient(135deg,#ef4444,#dc2626)")}
        ${alertBox("If you didn't request this, you can safely ignore this email. Your password won't change.", "info")}
        ${sig()}
      `, "If you didn't request a password reset, please ignore this email."),
    };
  },
};

export async function sendWelcomeEmail(user: { name: string; email: string; role: string }) {
  try {
    await sendMail(emailTemplates.welcome(user));
  } catch (err) {
    logger.warn("Failed to send welcome email", { error: err instanceof Error ? err.message : String(err), email: user.email });
  }
}

export async function sendVerificationEmail(user: { name: string; email: string }, token: string) {
  const url = `${FRONTEND_URL}/verify-email?token=${token}`;
  try {
    await sendMail({
      to: user.email,
      subject: `Verify Your Email — ${APP_NAME}`,
      text: `Hello ${user.name},\n\nVerify your email: ${url}\n\nExpires in 1 hour.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Verify Your Email Address</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">One quick step to activate your account.</p>
        ${hi(user.name)}
        <p style="color:#475569;font-size:15px;line-height:1.6;">Please verify your email address to complete your ${APP_NAME} account setup. This link expires in <strong>1 hour</strong>.</p>
        ${ctaButton("Verify Email Address", url, "linear-gradient(135deg,#22c55e,#16a34a)")}
        ${alertBox("If you didn't create a ${APP_NAME} account, you can safely ignore this email.", "info")}
        ${sig()}
      `, "If you didn't create this account, please ignore this email."),
    });
  } catch (err) {
    logger.warn("Failed to send verification email", { error: err instanceof Error ? err.message : String(err), email: user.email });
  }
}

export async function sendPasswordResetEmail(user: { name: string; email: string }, token: string) {
  try {
    await sendMail(emailTemplates.passwordReset(user, token));
  } catch (err) {
    logger.warn("Failed to send password reset email", { error: err instanceof Error ? err.message : String(err), email: user.email });
  }
}

export async function sendEmployeeInviteEmail(params: {
  name: string;
  email: string;
  token: string;
  inviterName?: string;
  organizationName?: string;
}) {
  const setupUrl = `${FRONTEND_URL}/reset-password?token=${params.token}&mode=invite`;
  const inviter = params.inviterName ? params.inviterName : APP_NAME;
  const orgName = params.organizationName ?? APP_NAME;

  try {
    await sendMail({
      to: params.email,
      subject: `You're invited to join ${orgName} on ${APP_NAME}`,
      text: `Hello ${params.name},\n\nYou've been invited by ${inviter} to join ${orgName} on ${APP_NAME}.\n\nSet your password to activate your account:\n${setupUrl}\n\nExpires in 24 hours.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">You're Invited! 🎉</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">${inviter} has invited you to join <strong>${orgName}</strong> on ${APP_NAME}.</p>
        ${hi(params.name)}
        <p style="color:#475569;font-size:15px;line-height:1.6;">Your account has been created. Click the button below to set your password and activate your account.</p>
        ${infoTable([
          { label: "Email", value: params.email },
          { label: "Organization", value: orgName, highlight: true },
          { label: "Invited by", value: inviter },
        ])}
        ${ctaButton("Set Password & Activate Account", setupUrl)}
        ${alertBox("⏳ This invitation link expires in <strong>24 hours</strong>. Set your password before it expires.", "warning")}
        ${sig()}
      `, "You received this because someone invited you to " + APP_NAME + ". If this was a mistake, ignore this email."),
    });
  } catch (err) {
    logger.warn("Failed to send employee invite email", { error: err instanceof Error ? err.message : String(err), email: params.email });
  }
}

export async function sendHireEmail(candidate: { name: string; email: string; jobTitle: string; department: string; location: string; joiningDate: string; offeredSalary: string; hrName: string; hrDesignation: string }) {
  try {
    const offerData = {
      candidate: { name: candidate.name, email: candidate.email, jobTitle: candidate.jobTitle },
      hr: { name: candidate.hrName, designation: candidate.hrDesignation },
      offer: { joiningDate: candidate.joiningDate, offeredSalary: candidate.offeredSalary, jobTitle: candidate.jobTitle, department: candidate.department, location: candidate.location }
    };
    const pdfBuffer = generateOfferLetterPDF(offerData);
    await sendMail({
      to: candidate.email,
      subject: `🎉 Congratulations! You're Hired — ${APP_NAME}`,
      text: `Dear ${candidate.name},\n\nCongratulations! You've been offered the position of ${candidate.jobTitle}.\n\nDepartment: ${candidate.department}\nLocation: ${candidate.location}\nJoining Date: ${candidate.joiningDate}\nOffered Salary: ${candidate.offeredSalary}\n\nWelcome to the team!\n\n${candidate.hrName}\n${candidate.hrDesignation}`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Congratulations! You're Hired 🎉</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">We're thrilled to welcome you to the team.</p>
        ${hi(candidate.name)}
        <p style="color:#475569;font-size:15px;line-height:1.6;">We're excited to offer you the position of <strong>${candidate.jobTitle}</strong>. Please find your offer details below.</p>
        ${infoTable([
          { label: "Position", value: candidate.jobTitle, highlight: true },
          { label: "Department", value: candidate.department },
          { label: "Location", value: candidate.location },
          { label: "Joining Date", value: candidate.joiningDate },
          { label: "Offered Salary", value: "₹" + candidate.offeredSalary },
        ])}
        ${alertBox("📎 Your offer letter is attached to this email. Please review and confirm your acceptance.", "success")}
        ${ctaButton("Log In to " + APP_NAME, `${FRONTEND_URL}/login`, "linear-gradient(135deg,#22c55e,#16a34a)")}
        <p style="margin:28px 0 0;font-size:14px;color:#64748b;border-top:1px solid #f1f5f9;padding-top:20px;">Warm regards,<br/><strong style="color:#1e293b;">${candidate.hrName}</strong><br/><span style="color:#94a3b8;">${candidate.hrDesignation} · ${APP_NAME}</span></p>
      `),
      attachments: [{ filename: `Offer_Letter_${candidate.name.replace(/\s+/g, "_")}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
    });
  } catch (err) {
    logger.warn("Failed to send hire email", { error: err instanceof Error ? err.message : String(err), email: candidate.email });
  }
}

export async function sendRejectionEmail(candidate: { name: string; email: string; jobTitle: string }, reason?: string) {
  try {
    await sendMail({
      to: candidate.email,
      subject: `Application Update — ${APP_NAME}`,
      text: `Dear ${candidate.name},\n\nThank you for applying for ${candidate.jobTitle}. After careful consideration, we've decided to move forward with other candidates.${reason ? "\n\nFeedback: " + reason : ""}\n\nWe encourage you to apply for future opportunities.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Application Update</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Thank you for your interest in joining our team.</p>
        ${hi(candidate.name)}
        <p style="color:#475569;font-size:15px;line-height:1.6;">Thank you for applying for the <strong>${candidate.jobTitle}</strong> position. After careful consideration, we've decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
        ${reason ? alertBox("<strong>Feedback:</strong> " + reason, "info") : ""}
        <p style="color:#475569;font-size:15px;line-height:1.6;">We appreciate your time and encourage you to apply for future opportunities that match your skills.</p>
        ${sig()}
      `),
    });
  } catch (err) {
    logger.warn("Failed to send rejection email", { error: err instanceof Error ? err.message : String(err), email: candidate.email });
  }
}

export async function sendInterviewInvitationEmail(candidate: { name: string; email: string; jobTitle: string }) {
  try {
    await sendMail({
      to: candidate.email,
      subject: `Interview Invitation — ${candidate.jobTitle} at ${APP_NAME}`,
      text: `Dear ${candidate.name},\n\nCongratulations! You've been selected for an interview for the ${candidate.jobTitle} position.\n\nOur HR team will contact you shortly to schedule the interview.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Interview Invitation 🎯</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Great news — you've been shortlisted!</p>
        ${hi(candidate.name)}
        <p style="color:#475569;font-size:15px;line-height:1.6;">Congratulations! You've been selected for an interview for the <strong>${candidate.jobTitle}</strong> position at ${APP_NAME}.</p>
        ${alertBox("📅 Our HR team will contact you shortly to schedule the interview. Please keep an eye on your email and phone.", "success")}
        <p style="color:#475569;font-size:15px;line-height:1.6;">We look forward to speaking with you!</p>
        ${sig()}
      `),
    });
  } catch (err) {
    logger.warn("Failed to send interview invitation email", { error: err instanceof Error ? err.message : String(err), email: candidate.email });
  }
}

export async function sendClientWelcomeEmail(client: { name: string; email: string }) {
  try {
    await sendMail({
      to: client.email,
      subject: `Welcome to ${APP_NAME} — Your Account is Ready`,
      text: `Dear ${client.name},\n\nWelcome to ${APP_NAME}! Your client account has been created.\n\nLogin at: ${FRONTEND_URL}/login\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Welcome to ${APP_NAME}! 👋</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Your client account is ready to use.</p>
        ${hi(client.name)}
        <p style="color:#475569;font-size:15px;line-height:1.6;">Your client account has been successfully created. You now have access to your dedicated workspace.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 12px;font-weight:700;color:#1e293b;font-size:15px;">What you can do:</p>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
            <li>View your project details and progress</li>
            <li>Download invoices and payment history</li>
            <li>Communicate with your account team</li>
            <li>Track milestones and deliverables</li>
          </ul>
        </div>
        ${ctaButton("Access Your Dashboard", `${FRONTEND_URL}/login`)}
        ${sig()}
      `),
    });
  } catch (err) {
    logger.warn("Failed to send client welcome email", { error: err instanceof Error ? err.message : String(err), email: client.email });
  }
}

export async function sendTaskAssignmentEmail(task: { title: string; description?: string; priority: string; dueDate?: string; assigneeEmail: string; assigneeName: string; assignerName: string }) {
  const priorityColor = task.priority === "high" ? "#ef4444" : task.priority === "medium" ? "#f59e0b" : "#22c55e";
  try {
    await sendMail({
      to: task.assigneeEmail,
      subject: `New Task Assigned: ${task.title}`,
      text: `Hi ${task.assigneeName},\n\n${task.assignerName} assigned you a task: ${task.title}\nPriority: ${task.priority}${task.dueDate ? "\nDue: " + task.dueDate : ""}\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">New Task Assigned</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">${task.assignerName} has assigned you a task.</p>
        ${hi(task.assigneeName)}
        ${infoTable([
          { label: "Task", value: task.title, highlight: true },
          ...(task.description ? [{ label: "Description", value: task.description }] : []),
          { label: "Priority", value: `<span style="color:${priorityColor};font-weight:700;">${task.priority.toUpperCase()}</span>` },
          ...(task.dueDate ? [{ label: "Due Date", value: task.dueDate }] : []),
          { label: "Assigned by", value: task.assignerName },
        ])}
        ${ctaButton("View Task", `${FRONTEND_URL}/workspace/tasks`)}
        ${sig()}
      `),
    });
  } catch (err) {
    logger.warn("Failed to send task assignment email", { error: err instanceof Error ? err.message : String(err), email: task.assigneeEmail });
  }
}

export async function sendProjectUpdateEmail(project: { name: string; status: string; teamMembers: { email: string; name: string }[] }) {
  if (project.teamMembers.length === 0) return;
  try {
    for (const member of project.teamMembers) {
      await sendMail({
        to: member.email,
        subject: `Project Update: ${project.name}`,
        text: `Hi ${member.name},\n\nProject "${project.name}" status updated to "${project.status}".\n\nBest regards,\nThe ${APP_NAME} Team`,
        html: emailLayout(`
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Project Status Update</h2>
          <p style="margin:0 0 20px;color:#64748b;font-size:15px;">There's an update on a project you're part of.</p>
          ${hi(member.name)}
          ${infoTable([
            { label: "Project", value: project.name, highlight: true },
            { label: "New Status", value: project.status },
          ])}
          ${ctaButton("View Project", `${FRONTEND_URL}/workspace/projects`)}
          ${sig()}
        `),
      });
    }
  } catch (err) {
    logger.warn("Failed to send project update email", { error: err instanceof Error ? err.message : String(err) });
  }
}

export async function sendSalaryPaidEmail(salary: { name: string; email: string; period: string; baseSalary: number; allowances: number; deductions: number; netPay: number; paidAt: Date }) {
  try {
    const pdfBuffer = generateSalarySlipPDF(salary);
    await sendMail({
      to: salary.email,
      subject: `Salary Paid for ${salary.period} — ${APP_NAME}`,
      text: `Dear ${salary.name},\n\nYour salary for ${salary.period} has been paid.\n\nNet Salary: ₹${salary.netPay}\nPaid: ${salary.paidAt.toLocaleDateString()}\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: emailLayout(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Salary Credited 💰</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Your salary for <strong>${salary.period}</strong> has been processed.</p>
        ${hi(salary.name)}
        ${infoTable([
          { label: "Pay Period", value: salary.period },
          { label: "Base Salary", value: "₹" + salary.baseSalary.toLocaleString() },
          { label: "Allowances", value: "+ ₹" + salary.allowances.toLocaleString() },
          { label: "Deductions", value: "− ₹" + salary.deductions.toLocaleString() },
          { label: "Net Salary", value: "₹" + salary.netPay.toLocaleString(), highlight: true },
          { label: "Paid On", value: salary.paidAt.toLocaleDateString() },
        ])}
        ${alertBox("📎 Your salary slip is attached to this email for your records.", "success")}
        ${ctaButton("View Payroll", `${FRONTEND_URL}/hr/payroll`)}
        ${sig()}
      `),
      attachments: [{ filename: `Salary_Slip_${salary.period.replace(/\s+/g, "_")}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
    });
  } catch (err) {
    logger.warn("Failed to send salary paid email", { error: err instanceof Error ? err.message : String(err), email: salary.email });
  }
}

export async function sendInvoiceReminder(invoice: { id: string; client: string; amount: string; due: string }, recipientEmail: string) {
  await sendMail(emailTemplates.invoiceReminder(invoice, recipientEmail));
}

export async function sendInvoiceSentEmail(invoice: { id: string; client: string; amount: string; due: string }, recipientEmail: string) {
  await sendMail({
    to: recipientEmail,
    subject: `Invoice ${invoice.id} — ${invoice.amount} due ${invoice.due}`,
    text: `Invoice ${invoice.id} for ${invoice.amount} has been sent. Due: ${invoice.due}.\n\nBest regards,\nThe ${APP_NAME} Team`,
    html: emailLayout(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1e293b;">Invoice Sent</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;">A new invoice has been issued for your review.</p>
      ${infoTable([
        { label: "Invoice ID", value: invoice.id },
        { label: "Client", value: invoice.client },
        { label: "Amount", value: invoice.amount, highlight: true },
        { label: "Due Date", value: invoice.due },
      ])}
      ${ctaButton("View Invoice", `${FRONTEND_URL}/finance`, "linear-gradient(135deg,#f59e0b,#d97706)")}
      ${sig()}
    `),
  });
}
