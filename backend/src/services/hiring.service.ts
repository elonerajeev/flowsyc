import { type JobStatus } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessScope } from "../utils/access-control";

type JobRecord = {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  status: "open" | "draft" | "closed";
  description: string;
  salary: string;
  experience: string;
  skills: string[];
  priority: "urgent" | "high" | "normal" | "low";
  deadline?: string | null;
  candidateCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
};

type JobInput = {
  title: string;
  department: string;
  location: string;
  type?: string;
  status?: "open" | "draft" | "closed";
  description?: string;
  salary?: string;
  experience?: string;
  skills?: string[];
  priority?: "urgent" | "high" | "normal" | "low";
  deadline?: string | null;
};

function getActorIds(access?: AccessScope) {
  return [access?.email, access?.userId].filter(Boolean) as string[];
}

function assertJobAccess(
  job: { organizationId?: string | null; createdBy?: string | null },
  access?: AccessScope,
) {
  if (!access) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }

  if (access.organizationId) {
    if (job.organizationId !== access.organizationId) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    // Managers are scoped to jobs they created even within their org
    if (access.role === "manager") {
      const actorIds = getActorIds(access);
      if (!job.createdBy || !actorIds.includes(job.createdBy)) {
        throw new AppError("Access denied", 403, "FORBIDDEN");
      }
    }
    return;
  }

  // Legacy fallback (no org context): admins/managers can only see their own jobs
  const actorIds = getActorIds(access);
  if (!job.createdBy || !actorIds.includes(job.createdBy)) {
    throw new AppError("Access denied", 403, "FORBIDDEN");
  }
}

function mapJob(job: {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  status: JobStatus;
  description: string;
  salary: string | null;
  experience: string | null;
  skills: string[];
  priority: string | null;
  deadline: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
} & { _count?: { Candidate: number } }): JobRecord {
  return {
    id: job.id,
    title: job.title,
    department: job.department,
    location: job.location,
    type: job.type,
    status: job.status,
    description: job.description,
    salary: job.salary ?? "Competitive",
    experience: job.experience ?? "2-5 years",
    skills: job.skills,
    priority: (job.priority as JobRecord["priority"]) ?? "normal",
    deadline: job.deadline,
    candidateCount: job._count?.Candidate,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    createdBy: job.createdBy,
  };
}

const includeCount = { _count: { select: { Candidate: true } } } as const;

export const hiringService = {
  async list(access?: AccessScope) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (access?.organizationId) {
      where.organizationId = access.organizationId;
      if (access?.role === "manager") {
        where.createdBy = access?.email;
      }
    } else if (access?.role === "admin" || access?.role === "manager") {
      where.createdBy = { in: getActorIds(access) };
    }

    const jobs = await prisma.jobPosting.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: includeCount,
    });
    return { data: jobs.map(mapJob) };
  },

  async getById(jobId: number, access?: AccessScope) {
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: includeCount,
    });
    if (!job || job.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
    assertJobAccess(job, access);

    return mapJob(job);
  },

  async create(input: JobInput, access?: AccessScope) {
    const job = await prisma.jobPosting.create({
      data: {
        title: input.title,
        department: input.department,
        location: input.location,
        type: input.type ?? "Full-time",
        status: (input.status ?? "open") as JobStatus,
        description: input.description ?? "",
        salary: input.salary ?? "Competitive",
        experience: input.experience ?? "2-5 years",
        skills: input.skills ?? [],
        priority: input.priority ?? "normal",
        deadline: input.deadline ?? null,
        updatedAt: new Date(),
        createdBy: access?.email,
        organizationId: access?.organizationId ?? null,
      },
      include: includeCount,
    });
    return mapJob(job);
  },

  async update(jobId: number, patch: Partial<JobInput>, access?: AccessScope) {
    const existing = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!existing || existing.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
    assertJobAccess(existing, access);

    const job = await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.department !== undefined && { department: patch.department }),
        ...(patch.location !== undefined && { location: patch.location }),
        ...(patch.type !== undefined && { type: patch.type }),
        ...(patch.status !== undefined && { status: patch.status as JobStatus }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.salary !== undefined && { salary: patch.salary }),
        ...(patch.experience !== undefined && { experience: patch.experience }),
        ...(patch.skills !== undefined && { skills: patch.skills }),
        ...(patch.priority !== undefined && { priority: patch.priority }),
        ...(patch.deadline !== undefined && { deadline: patch.deadline }),
      },
      include: includeCount,
    });
    return mapJob(job);
  },

  async toggleStatus(jobId: number, access?: AccessScope) {
    const existing = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!existing || existing.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
    assertJobAccess(existing, access);

    const nextStatus: Record<string, JobStatus> = { open: "closed", closed: "open", draft: "open" };
    const job = await prisma.jobPosting.update({
      where: { id: jobId },
      data: { status: nextStatus[existing.status] ?? "open" },
      include: includeCount,
    });
    return mapJob(job);
  },

  async clone(jobId: number, access?: AccessScope) {
    const existing = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!existing || existing.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
    assertJobAccess(existing, access);

    const job = await prisma.jobPosting.create({
      data: {
        title: `${existing.title} (Copy)`,
        department: existing.department,
        location: existing.location,
        type: existing.type,
        status: "draft",
        description: existing.description,
        salary: existing.salary,
        experience: existing.experience,
        skills: existing.skills,
        priority: existing.priority,
        deadline: null,
        updatedAt: new Date(),
        createdBy: access?.email,
        organizationId: existing.organizationId ?? access?.organizationId ?? null,
      },
      include: includeCount,
    });
    return mapJob(job);
  },

  async delete(jobId: number, access?: AccessScope) {
    const existing = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!existing || existing.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
    assertJobAccess(existing, access);

    await prisma.jobPosting.update({ where: { id: jobId }, data: { deletedAt: new Date() } });
  },
};
