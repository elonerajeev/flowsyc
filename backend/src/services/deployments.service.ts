import { prisma } from "../config/prisma";
import type { AccessActor } from "../utils/access-control";
import { orgFilter } from "../utils/access-control";
import { AppError } from "../middleware/error.middleware";

export const deploymentsService = {
  async list(actor: AccessActor, limit = 50) {
    return prisma.deployment.findMany({
      where: orgFilter(actor),
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  },

  async create(input: {
    service: string; environment: string; status?: string;
    commitHash?: string; commitMessage?: string; branch?: string;
    deployedBy?: string; version?: string; notes?: string;
    startedAt?: string; finishedAt?: string;
  }, actor: AccessActor) {
    if (actor?.role !== "admin" && actor?.role !== "manager") {
      throw new AppError("Admin or manager only", 403, "FORBIDDEN");
    }
    return prisma.deployment.create({
      data: {
        organizationId: actor.organizationId ?? null,
        service:        input.service.trim(),
        environment:    input.environment.trim(),
        status:         (input.status as any) ?? "running",
        commitHash:     input.commitHash?.trim() ?? null,
        commitMessage:  input.commitMessage?.trim() ?? null,
        branch:         input.branch?.trim() ?? null,
        deployedBy:     input.deployedBy?.trim() ?? actor.email,
        version:        input.version?.trim() ?? null,
        notes:          input.notes?.trim() ?? null,
        startedAt:      input.startedAt ? new Date(input.startedAt) : new Date(),
        finishedAt:     input.finishedAt ? new Date(input.finishedAt) : null,
        updatedAt:      new Date(),
      },
    });
  },

  // Update status (e.g. running → success/failed from CI webhook)
  async updateStatus(id: number, input: { status: string; finishedAt?: string; notes?: string }, actor: AccessActor) {
    if (actor?.role !== "admin" && actor?.role !== "manager") {
      throw new AppError("Admin or manager only", 403, "FORBIDDEN");
    }
    const existing = await prisma.deployment.findFirst({ where: { id, ...orgFilter(actor) } });
    if (!existing) throw new AppError("Deployment not found", 404, "NOT_FOUND");
    return prisma.deployment.update({
      where: { id },
      data: {
        status:     input.status as any,
        finishedAt: input.finishedAt ? new Date(input.finishedAt) : (input.status !== "running" ? new Date() : null),
        notes:      input.notes ?? existing.notes,
        updatedAt:  new Date(),
      },
    });
  },

  async remove(id: number, actor: AccessActor) {
    if (actor?.role !== "admin") throw new AppError("Admin only", 403, "FORBIDDEN");
    const existing = await prisma.deployment.findFirst({ where: { id, ...orgFilter(actor) } });
    if (!existing) throw new AppError("Deployment not found", 404, "NOT_FOUND");
    return prisma.deployment.delete({ where: { id } });
  },
};
