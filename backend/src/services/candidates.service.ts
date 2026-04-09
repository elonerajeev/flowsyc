import { Prisma, type CandidateStage } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { sendMail } from "../utils/mailer";
import { sendHireEmail, sendRejectionEmail, sendInterviewInvitationEmail } from "../utils/email-templates";

type CandidateRecord = {
  id: number;
  name: string;
  email: string;
  jobId: number;
  jobTitle: string;
  stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  source?: string;
  phone?: string | null;
  rating?: number;
  interviewDate?: string | null;
  interviewers?: string[];
  resume?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CandidateInput = {
  name: string;
  email: string;
  jobId: number;
  stage?: CandidateRecord["stage"];
  resume?: string;
  notes?: string;
};

function mapStage(stage: CandidateStage): CandidateRecord["stage"] {
  return stage;
}

function mapCandidate(candidate: {
  id: number;
  name: string;
  email: string;
  jobId: number;
  stage: CandidateStage;
  source: string | null;
  phone: string | null;
  rating: number | null;
  interviewDate: Date | null;
  interviewers: string[];
  resume: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  JobPosting: { title: string };
}): CandidateRecord {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    jobId: candidate.jobId,
    jobTitle: candidate.JobPosting.title,
    stage: mapStage(candidate.stage),
    source: candidate.source ?? undefined,
    phone: candidate.phone ?? undefined,
    rating: candidate.rating ?? undefined,
    interviewDate: candidate.interviewDate?.toISOString() ?? undefined,
    interviewers: candidate.interviewers,
    resume: candidate.resume ?? undefined,
    notes: candidate.notes ?? undefined,
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString(),
  };
}

function isEmailUniqueConstraintError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes("email");
  }
  if (typeof target === "string") {
    return target.includes("email");
  }
  return false;
}

function buildOfferLetterEmail(data: {
  candidate: { name: string; email: string; jobTitle: string; department: string; location: string };
  hr: { name: string; designation: string; email: string; signatureUrl: string | null };
  offer: { joiningDate: string; offeredSalary: string; jobTitle: string; department: string; location: string; type: string; generatedAt: string };
}) {
  const subject = `Offer Letter for ${data.candidate.jobTitle} - ${data.candidate.name}`;
  const text = [
    `Hello ${data.candidate.name},`,
    "",
    "We are pleased to share your offer letter details.",
    `Role: ${data.offer.jobTitle}`,
    `Department: ${data.offer.department}`,
    `Location: ${data.offer.location}`,
    `Employment Type: ${data.offer.type}`,
    `Joining Date: ${data.offer.joiningDate}`,
    `Offered Salary: ${data.offer.offeredSalary}`,
    "",
    `Regards,`,
    `${data.hr.name}`,
    `${data.hr.designation}`,
    data.hr.email,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <p>Hello ${data.candidate.name},</p>
      <p>We are pleased to share your offer letter details.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tbody>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Role</td><td>${data.offer.jobTitle}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Department</td><td>${data.offer.department}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Location</td><td>${data.offer.location}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Employment Type</td><td>${data.offer.type}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Joining Date</td><td>${data.offer.joiningDate}</td></tr>
          <tr><td style="padding: 6px 12px 6px 0; font-weight: 600;">Offered Salary</td><td>${data.offer.offeredSalary}</td></tr>
        </tbody>
      </table>
      <p>Please reply to this email if you need any clarification.</p>
      <p style="margin-top: 20px;">
        Regards,<br />
        ${data.hr.name}<br />
        ${data.hr.designation}<br />
        <a href="mailto:${data.hr.email}">${data.hr.email}</a>
      </p>
      ${data.hr.signatureUrl ? `<p><img src="${data.hr.signatureUrl}" alt="HR Signature" style="max-width: 180px; height: auto;" /></p>` : ""}
    </div>
  `.trim();

  return { subject, text, html };
}

export const candidatesService = {
  async list(query?: { page?: number; limit?: number; stage?: string; jobId?: number }) {
    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: { deletedAt: null; stage?: string; jobId?: number } = { deletedAt: null };
    if (query?.stage) where.stage = query.stage as any;
    if (query?.jobId) where.jobId = query.jobId;

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        include: { JobPosting: { select: { title: true } } },
        skip,
        take: limit,
      }),
      prisma.candidate.count({ where: where as any }),
    ]);
    return {
      data: candidates.map(mapCandidate),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  },

  async getById(candidateId: number) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { JobPosting: { select: { title: true } } },
    });
    if (!candidate || candidate.deletedAt) {
      throw new AppError("Candidate not found", 404, "NOT_FOUND");
    }
    return mapCandidate(candidate);
  },

  async create(input: CandidateInput) {
    const existingEmail = await prisma.candidate.findUnique({ where: { email: input.email } });
    if (existingEmail) {
      throw new AppError("Candidate email already exists", 409, "CONFLICT");
    }

    const job = await prisma.jobPosting.findUnique({ where: { id: input.jobId } });
    if (!job || job.deletedAt) {
      throw new AppError("Job posting not found", 404, "NOT_FOUND");
    }

    try {
      const candidate = await prisma.candidate.create({
        data: {
          name: input.name,
          email: input.email,
          jobId: input.jobId,
          stage: input.stage ?? "applied",
          resume: input.resume ?? null,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        },
        include: { JobPosting: { select: { title: true } } },
      });
      return mapCandidate(candidate);
    } catch (error) {
      if (isEmailUniqueConstraintError(error)) {
        throw new AppError("Candidate email already exists", 409, "CONFLICT");
      }
      throw error;
    }
  },

  async update(candidateId: number, patch: Partial<CandidateInput>) {
    const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Candidate not found", 404, "NOT_FOUND");
    }

    if (patch.jobId !== undefined) {
      const job = await prisma.jobPosting.findUnique({ where: { id: patch.jobId } });
      if (!job || job.deletedAt) {
        throw new AppError("Job posting not found", 404, "NOT_FOUND");
      }
    }

    if (patch.email !== undefined && patch.email !== existing.email) {
      const emailOwner = await prisma.candidate.findUnique({ where: { email: patch.email } });
      if (emailOwner && emailOwner.id !== existing.id) {
        throw new AppError("Candidate email already exists", 409, "CONFLICT");
      }
    }

    try {
      const candidate = await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.jobId !== undefined ? { jobId: patch.jobId } : {}),
          ...(patch.stage !== undefined ? { stage: patch.stage as CandidateStage } : {}),
          ...(patch.resume !== undefined ? { resume: patch.resume } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        },
        include: { JobPosting: { select: { title: true } } },
      });
      return mapCandidate(candidate);
    } catch (error) {
      if (isEmailUniqueConstraintError(error)) {
        throw new AppError("Candidate email already exists", 409, "CONFLICT");
      }
      throw error;
    }
  },

  async delete(candidateId: number) {
    const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Candidate not found", 404, "NOT_FOUND");
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { deletedAt: new Date() },
    });
  },

  async moveToNextStage(candidateId: number) {
    const existing = await prisma.candidate.findUnique({ 
      where: { id: candidateId },
      include: { JobPosting: true },
    });
    if (!existing || existing.deletedAt) {
      throw new AppError("Candidate not found", 404, "NOT_FOUND");
    }

    const stageFlow: Record<CandidateStage, CandidateStage | null> = {
      applied: "screening",
      screening: "interview",
      interview: "offer",
      offer: "hired",
      hired: null,
      rejected: null,
    };

    const nextStage = stageFlow[existing.stage];
    if (!nextStage) {
      throw new AppError(`Cannot move from ${existing.stage} stage`, 400, "BAD_REQUEST");
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update candidate stage
      const updatedCandidate = await tx.candidate.update({
        where: { id: candidateId },
        data: { stage: nextStage },
        include: { JobPosting: { select: { title: true, department: true, location: true } } },
      });

      // 2. Log activity
      await (tx as any).candidateActivity.create({
        data: { candidateId, action: "stage_change", detail: `Moved from ${existing.stage} to ${nextStage}`, performedBy: "HR System" },
      }).catch(() => {}); // Don't fail the whole transaction for a failed log

      // 3. 🎯 AUTO-CREATE EMPLOYEE when hired
      if (nextStage === "hired") {
        const existingEmployee = await tx.teamMember.findUnique({ where: { email: existing.email } });
        
        if (!existingEmployee) {
          await tx.teamMember.create({
            data: {
              name: existing.name,
              email: existing.email,
              role: "Employee",
              status: "pending",
              avatar: existing.name.slice(0, 2).toUpperCase(),
              department: existing.JobPosting.department,
              team: "New Hires",
              designation: existing.JobPosting.title,
              manager: "HR Manager",
              workingHours: "09:00 - 18:00",
              officeLocation: existing.JobPosting.location,
              timeZone: "Asia/Calcutta",
              baseSalary: 60000,
              allowances: 10000,
              deductions: 2500,
              paymentMode: "bank_transfer",
              attendance: "present",
              checkIn: "-",
              location: "Onboarding",
              workload: 0,
              updatedAt: new Date(),
            },
          });

          await (tx as any).candidateActivity.create({
            data: { candidateId, action: "hired", detail: "Automatically added to team members", performedBy: "HR System" },
          }).catch(() => {});
        }
      }

      return updatedCandidate;
    });

    // Send interview invitation when candidate moves to interview stage
    if (nextStage === "interview") {
      sendInterviewInvitationEmail({
        name: result.name,
        email: result.email,
        jobTitle: result.JobPosting.title,
      }).catch(() => {});
    }

    // Send hire email automatically when candidate is hired
    if (nextStage === "hired") {
      // Get HR details (assuming current user is HR)
      // For now, use placeholder HR details
      const hrName = "HR Manager";
      const hrDesignation = "Human Resources";

      sendHireEmail({
        name: result.name,
        email: result.email,
        jobTitle: result.JobPosting.title,
        department: result.JobPosting.department,
        location: result.JobPosting.location,
        joiningDate: result.joiningDate || "TBD",
        offeredSalary: result.offeredSalary ? `₹${result.offeredSalary}` : "TBD",
        hrName,
        hrDesignation,
      }).catch(() => {});
    }

    return mapCandidate(result);
  },

  async generateOfferLetter(candidateId: number, hrUserId: string, input: {
    joiningDate: string;
    offeredSalary: string;
    signatureUrl?: string;
  }) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { JobPosting: true },
    });
    if (!candidate || candidate.deletedAt) {
      throw new AppError("Candidate not found", 404, "NOT_FOUND");
    }
    if (candidate.stage !== "offer") {
      throw new AppError("Candidate must be in offer stage to generate offer letter", 400, "BAD_REQUEST");
    }

    const hr = await prisma.user.findUnique({ where: { id: hrUserId } });
    if (!hr) throw new AppError("HR user not found", 404, "NOT_FOUND");

    const offerLetter = {
      candidate: {
        name: candidate.name,
        email: candidate.email,
        jobTitle: candidate.JobPosting.title,
        department: candidate.JobPosting.department,
        location: candidate.JobPosting.location,
      },
      hr: {
        name: hr.name,
        designation: hr.designation,
        email: hr.email,
        signatureUrl: input.signatureUrl ?? hr.signatureUrl ?? null,
      },
      offer: {
        joiningDate: input.joiningDate,
        offeredSalary: input.offeredSalary,
        jobTitle: candidate.JobPosting.title,
        department: candidate.JobPosting.department,
        location: candidate.JobPosting.location,
        type: candidate.JobPosting.type,
        generatedAt: new Date().toISOString(),
      },
    };

    const email = buildOfferLetterEmail(offerLetter);
    
    await sendMail({
      to: offerLetter.candidate.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        joiningDate: input.joiningDate,
        offeredSalary: input.offeredSalary,
        offerLetterSent: true,
      },
    });

    try {
      await (prisma as any).candidateActivity.create({
        data: {
          candidateId,
          action: "offer_letter_sent",
          detail: `Offer letter emailed to ${candidate.email}`,
          performedBy: hr.email,
        },
      });
    } catch (err) {
      console.warn("Activity log failed (permissions/schema):", (err as any).message);
    }

    return offerLetter;
  },

  async reject(candidateId: number, reason?: string) {
    const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Candidate not found", 404, "NOT_FOUND");
    }

    if (existing.stage === "rejected") {
      throw new AppError("Candidate already rejected", 400, "BAD_REQUEST");
    }

    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { stage: "rejected" },
      include: { JobPosting: { select: { title: true } } },
    });

    // Send rejection email
    sendRejectionEmail({
      name: candidate.name,
      email: candidate.email,
      jobTitle: candidate.JobPosting.title,
    }, reason).catch(() => {});

    try {
      await (prisma as any).candidateActivity.create({
        data: { candidateId, action: "rejected", detail: reason ?? "No reason provided", performedBy: "HR System" },
      });
    } catch (err) {
      console.warn("Activity log failed (permissions/schema):", (err as any).message);
    }
    return mapCandidate(candidate);
  },

  async getTimeline(candidateId: number) {
    const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!existing || existing.deletedAt) throw new AppError("Candidate not found", 404, "NOT_FOUND");

    const activities = await (prisma as any).candidateActivity.findMany({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
    });
    return activities;
  },

  async addNote(candidateId: number, note: string, performedBy: string) {
    const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!existing || existing.deletedAt) throw new AppError("Candidate not found", 404, "NOT_FOUND");

    try {
      await (prisma as any).candidateActivity.create({
        data: { candidateId, action: "note", detail: note, performedBy },
      });
    } catch (err) {
      console.warn("Activity log failed (permissions/schema):", (err as any).message);
    }
    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { notes: existing.notes ? `${existing.notes}\n\n${note}` : note },
      include: { JobPosting: { select: { title: true } } },
    });
    return mapCandidate(candidate);
  },
};
