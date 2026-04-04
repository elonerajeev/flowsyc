import { type JobStatus } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";

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
  };
}

const includeCount = { _count: { select: { Candidate: true } } } as const;

export const hiringService = {
  async list() {
    const jobs = await prisma.jobPosting.findMany({
      where: { deletedAt: null },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      include: includeCount,
    });
    return { data: jobs.map(mapJob) };
  },

  async getById(jobId: number) {
    const job = await prisma.jobPosting.findUnique({ where: { id: jobId }, include: includeCount });
    if (!job || job.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
    return mapJob(job);
  },

  async create(input: JobInput) {
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
      },
      include: includeCount,
    });
    return mapJob(job);
  },

  async update(jobId: number, patch: Partial<JobInput>) {
    const existing = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!existing || existing.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");

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

  // Toggle status: open → closed → open
  async toggleStatus(jobId: number) {
    const existing = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!existing || existing.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
    const nextStatus: Record<string, JobStatus> = { open: "closed", closed: "open", draft: "open" };
    const job = await prisma.jobPosting.update({
      where: { id: jobId },
      data: { status: nextStatus[existing.status] ?? "open" },
      include: includeCount,
    });
    return mapJob(job);
  },

  // Clone a job posting
  async clone(jobId: number) {
    const existing = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!existing || existing.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
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
      },
      include: includeCount,
    });
    return mapJob(job);
  },

  async delete(jobId: number) {
    const existing = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!existing || existing.deletedAt) throw new AppError("Job posting not found", 404, "NOT_FOUND");
    await prisma.jobPosting.update({ where: { id: jobId }, data: { deletedAt: new Date() } });
  },
};
