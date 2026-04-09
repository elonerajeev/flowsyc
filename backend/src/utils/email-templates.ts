import PDFDocument from "pdfkit";
import { sendMail } from "./mailer";
import { logger } from "./logger";

const APP_NAME = "Focal Point Compass";

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

export async function sendVerificationEmail(user: { name: string; email: string }, token: string) {
  const verificationUrl = `${process.env.FRONTEND_URL ?? "http://localhost:8080"}/verify-email?token=${token}`;
  try {
    const email = {
      to: user.email,
      subject: `Verify Your Email - ${APP_NAME}`,
      text: `Hello ${user.name},\n\nPlease verify your email by clicking the link below:\n\n${verificationUrl}\n\nThis link expires in 24 hours.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">Verify Your Email</h2>
          <p>Hello ${user.name},</p>
          <p>Please verify your email address to complete your account setup.</p>
          <p style="margin: 24px 0;">
            <a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
    };
    await sendMail(email);
  } catch (err) {
    logger.warn("Failed to send verification email", { error: err instanceof Error ? err.message : String(err), email: user.email });
  }
}

export async function sendPasswordResetEmail(user: { name: string; email: string }, token: string) {
  const resetUrl = `${process.env.FRONTEND_URL ?? "http://localhost:8080"}/reset-password?token=${token}`;
  try {
    const email = {
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
    await sendMail(email);
  } catch (err) {
    logger.warn("Failed to send password reset email", { error: err instanceof Error ? err.message : String(err), email: user.email });
  }
}

export async function sendHireEmail(candidate: { name: string; email: string; jobTitle: string; department: string; location: string; joiningDate: string; offeredSalary: string; hrName: string; hrDesignation: string }) {
  try {
    const offerData = {
      candidate: { name: candidate.name, email: candidate.email, jobTitle: candidate.jobTitle },
      hr: { name: candidate.hrName, designation: candidate.hrDesignation },
      offer: {
        joiningDate: candidate.joiningDate,
        offeredSalary: candidate.offeredSalary,
        jobTitle: candidate.jobTitle,
        department: candidate.department,
        location: candidate.location
      }
    };
    const pdfBuffer = generateOfferLetterPDF(offerData);

    const email = {
      to: candidate.email,
      subject: `Congratulations! You're Hired - ${APP_NAME}`,
      text: `Dear ${candidate.name},\n\nCongratulations! We're excited to offer you the position of ${candidate.jobTitle}.\n\nDepartment: ${candidate.department}\nLocation: ${candidate.location}\nJoining Date: ${candidate.joiningDate}\nOffered Salary: ${candidate.offeredSalary}\n\nWelcome to the team! Please find the attached offer letter for your records.\n\nBest regards,\n${candidate.hrName}\n${candidate.hrDesignation}\n${APP_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">Congratulations! You're Hired</h2>
          <p>Dear ${candidate.name},</p>
          <p>We're excited to offer you the position of <strong>${candidate.jobTitle}</strong> in our <strong>${candidate.department}</strong> department.</p>
          <table style="margin: 16px 0; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Department</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">${candidate.department}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Location</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">${candidate.location}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Joining Date</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">${candidate.joiningDate}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600;">Offered Salary</td><td style="padding: 8px 16px;">₹${candidate.offeredSalary}</td></tr>
          </table>
          <p>Please find the attached offer letter for your records. Welcome to the team!</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />${candidate.hrName}<br />${candidate.hrDesignation}<br />${APP_NAME}</p>
        </div>
      `,
      attachments: [{
        filename: `Offer_Letter_${candidate.name.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };
    await sendMail(email);
  } catch (err) {
    logger.warn("Failed to send hire email", { error: err instanceof Error ? err.message : String(err), email: candidate.email });
  }
}

export async function sendRejectionEmail(candidate: { name: string; email: string; jobTitle: string }, reason?: string) {
  try {
    const email = {
      to: candidate.email,
      subject: `Application Update - ${APP_NAME}`,
      text: `Dear ${candidate.name},\n\nThank you for your interest in the ${candidate.jobTitle} position at ${APP_NAME}.\n\nAfter careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.${reason ? `\n\nFeedback: ${reason}` : ''}\n\nWe appreciate your time and effort in applying. We encourage you to apply for future opportunities that match your skills.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #6b7280;">Application Update</h2>
          <p>Dear ${candidate.name},</p>
          <p>Thank you for your interest in the <strong>${candidate.jobTitle}</strong> position at ${APP_NAME}.</p>
          <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
          ${reason ? `<p><strong>Feedback:</strong> ${reason}</p>` : ''}
          <p>We appreciate your time and effort in applying and encourage you to apply for future opportunities that match your skills.</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
    };
    await sendMail(email);
  } catch (err) {
    logger.warn("Failed to send rejection email", { error: err instanceof Error ? err.message : String(err), email: candidate.email });
  }
}

export async function sendInterviewInvitationEmail(candidate: { name: string; email: string; jobTitle: string }) {
  try {
    const email = {
      to: candidate.email,
      subject: `Interview Invitation - ${APP_NAME}`,
      text: `Dear ${candidate.name},\n\nCongratulations! You've been selected for an interview for the ${candidate.jobTitle} position at ${APP_NAME}.\n\nOur HR team will contact you shortly to schedule the interview. Please check your email and phone for further details.\n\nWe look forward to speaking with you!\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">Interview Invitation</h2>
          <p>Dear ${candidate.name},</p>
          <p>Congratulations! You've been selected for an interview for the <strong>${candidate.jobTitle}</strong> position at ${APP_NAME}.</p>
          <p>Our HR team will contact you shortly to schedule the interview. Please check your email and phone for further details.</p>
          <p>We look forward to speaking with you!</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
    };
    await sendMail(email);
  } catch (err) {
    logger.warn("Failed to send interview invitation email", { error: err instanceof Error ? err.message : String(err), email: candidate.email });
  }
}

export async function sendClientWelcomeEmail(client: { name: string; email: string }) {
  try {
    const email = {
      to: client.email,
      subject: `Welcome to ${APP_NAME} - Your Account is Ready`,
      text: `Dear ${client.name},\n\nWelcome to ${APP_NAME}! Your client account has been successfully created.\n\nYou can now log in to access your projects, invoices, and communicate with our team.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">Welcome to ${APP_NAME}!</h2>
          <p>Dear ${client.name},</p>
          <p>Your client account has been successfully created. Welcome to our platform!</p>
          <p>You can now:</p>
          <ul style="margin: 16px 0; padding-left: 20px;">
            <li>Access your project details and progress</li>
            <li>View and download invoices</li>
            <li>Communicate directly with your account team</li>
            <li>Track milestones and deliverables</li>
          </ul>
          <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
    };
    await sendMail(email);
  } catch (err) {
    logger.warn("Failed to send client welcome email", { error: err instanceof Error ? err.message : String(err), email: client.email });
  }
}

export async function sendTaskAssignmentEmail(task: { title: string; description?: string; priority: string; dueDate?: string; assigneeEmail: string; assigneeName: string; assignerName: string }) {
  try {
    const email = {
      to: task.assigneeEmail,
      subject: `New Task Assigned: ${task.title}`,
      text: `Dear ${task.assigneeName},\n\n${task.assignerName} has assigned you a new task:\n\nTitle: ${task.title}\n${task.description ? `Description: ${task.description}\n` : ''}Priority: ${task.priority}\n${task.dueDate ? `Due Date: ${task.dueDate}\n` : ''}\nPlease check your dashboard for more details.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">New Task Assigned</h2>
          <p>Dear ${task.assigneeName},</p>
          <p>${task.assignerName} has assigned you a new task:</p>
          <table style="margin: 16px 0; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <tr><td style="padding: 8px 16px; font-weight: 600;">Title</td><td style="padding: 8px 16px;">${task.title}</td></tr>
            ${task.description ? `<tr><td style="padding: 8px 16px; font-weight: 600;">Description</td><td style="padding: 8px 16px;">${task.description}</td></tr>` : ''}
            <tr><td style="padding: 8px 16px; font-weight: 600;">Priority</td><td style="padding: 8px 16px;">${task.priority}</td></tr>
            ${task.dueDate ? `<tr><td style="padding: 8px 16px; font-weight: 600;">Due Date</td><td style="padding: 8px 16px;">${task.dueDate}</td></tr>` : ''}
          </table>
          <p>Please check your dashboard for more details and updates.</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
    };
    await sendMail(email);
  } catch (err) {
    logger.warn("Failed to send task assignment email", { error: err instanceof Error ? err.message : String(err), email: task.assigneeEmail });
  }
}

export async function sendProjectUpdateEmail(project: { name: string; status: string; teamMembers: { email: string; name: string }[] }) {
  const emails = project.teamMembers.map(member => member.email);
  if (emails.length === 0) return;

  try {
    for (const recipient of emails) {
      const mailData = {
        to: recipient,
        subject: `Project Update: ${project.name}`,
        text: `Hello Team,\n\nThe project "${project.name}" status has been updated to "${project.status}".\n\nPlease check your dashboard for more details.\n\nBest regards,\nThe ${APP_NAME} Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
            <h2 style="color: #2563eb;">Project Update</h2>
            <p>Hello Team,</p>
            <p>The project <strong>${project.name}</strong> status has been updated to <strong>${project.status}</strong>.</p>
            <p>Please check your dashboard for more details and next steps.</p>
            <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
          </div>
        `,
      };
      await sendMail(mailData);
    }
  } catch (err) {
    logger.warn("Failed to send project update email", { error: err instanceof Error ? err.message : String(err) });
  }
}

export async function sendSalaryPaidEmail(salary: { name: string; email: string; period: string; baseSalary: number; allowances: number; deductions: number; netPay: number; paidAt: Date }) {
  try {
    const pdfBuffer = generateSalarySlipPDF(salary);

    const email = {
      to: salary.email,
      subject: `Salary Paid for ${salary.period} - ${APP_NAME}`,
      text: `Dear ${salary.name},\n\nYour salary for ${salary.period} has been paid.\n\nBase Salary: ₹${salary.baseSalary}\nAllowances: ₹${salary.allowances}\nDeductions: ₹${salary.deductions}\nNet Salary: ₹${salary.netPay}\nPaid At: ${salary.paidAt.toLocaleDateString()}\n\nPlease check your account for the credited amount.\n\nBest regards,\nThe ${APP_NAME} Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="color: #2563eb;">Salary Paid</h2>
          <p>Dear ${salary.name},</p>
          <p>Your salary for <strong>${salary.period}</strong> has been paid successfully.</p>
          <table style="margin: 16px 0; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Base Salary</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">₹${salary.baseSalary}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Allowances</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">₹${salary.allowances}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Deductions</td><td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">₹${salary.deductions}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600; background: #f3f4f6;">Net Salary</td><td style="padding: 8px 16px; background: #f3f4f6; font-weight: 600; color: #059669;">₹${salary.netPay}</td></tr>
            <tr><td style="padding: 8px 16px; font-weight: 600;">Paid At</td><td style="padding: 8px 16px;">${salary.paidAt.toLocaleDateString()}</td></tr>
          </table>
          <p>Please check your account for the credited amount.</p>
          <p style="margin-top: 24px; color: #6b7280;">Best regards,<br />The ${APP_NAME} Team</p>
        </div>
      `,
      attachments: [{
        filename: `Salary_Slip_${salary.period}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };
    await sendMail(email);
  } catch (err) {
    logger.warn("Failed to send salary paid email", { error: err instanceof Error ? err.message : String(err), email: salary.email });
  }
}

export async function sendInvoiceReminder(invoice: { id: string; client: string; amount: string; due: string }, recipientEmail: string) {
  const email = emailTemplates.invoiceReminder(invoice, recipientEmail);
  await sendMail(email);
}
