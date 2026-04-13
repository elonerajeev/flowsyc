import { Prisma, type ProjectStage, type ProjectStatus } from "@prisma/client";

import { prisma } from "../config/prisma";
import type { UserRole } from "../config/types";
import { AppError } from "../middleware/error.middleware";
import { getEmployeeAssigneeScope, getEmployeeProjectScope } from "../utils/access-control";
import { sendProjectUpdateEmail } from "../utils/email-templates";

type ProjectRecord = {
  id: number;
  name: string;
  description: string;
  progress: number;
  status: "active" | "pending" | "completed" | "in-progress";
  team: string[];
  dueDate: string;
  stage: "Discovery" | "Build" | "Review" | "Launch";
  budget: string;
  tasks: { done: number; total: number };
};

type ProjectInput = {
  name: string;
  description?: string;
  progress?: number;
  status?: "active" | "pending" | "completed" | "in-progress";
  team?: string[];
  dueDate?: string;
  stage?: "Discovery" | "Build" | "Review" | "Launch";
  budget?: string;
  tasksDone?: number;
  tasksTotal?: number;
};

type ProjectQuery = {
  page: number;
  limit: number;
  status?: ProjectRecord["status"];
};

type AccessScope = {
  role: UserRole;
  userId: string;
  email: string;
} | null | undefined;

function toDbStatus(status: ProjectRecord["status"]): ProjectStatus {
  return status === "in-progress" ? "in_progress" : status;
}

function fromDbStatus(status: ProjectStatus): ProjectRecord["status"] {
  return status === "in_progress" ? "in-progress" : status;
}

function toDbStage(stage: ProjectRecord["stage"]): ProjectStage {
  return stage;
}

function fromDbStage(stage: ProjectStage): ProjectRecord["stage"] {
  return stage;
}

function mapProject(project: {
  id: number;
  name: string;
  description: string;
  progress: number;
  status: ProjectStatus;
  team: string[];
  dueDate: string;
  stage: ProjectStage;
  budget: string;
  tasksDone: number;
  tasksTotal: number;
  createdAt: Date;
  updatedAt: Date;
}, role?: UserRole): ProjectRecord {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    progress: project.progress,
    status: fromDbStatus(project.status),
    team: project.team,
    dueDate: project.dueDate,
    stage: fromDbStage(project.stage),
    budget: role === "employee" ? "Restricted" : project.budget,
    tasks: { done: project.tasksDone, total: project.tasksTotal },
  };
}

export const projectsService = {
  async getById(projectId: number, access?: AccessScope) {
    const [employeeProjectScopes, employeeAssignees] = await Promise.all([
      getEmployeeProjectScope(access),
      getEmployeeAssigneeScope(access),
    ]);
    const project = employeeProjectScopes || employeeAssignees
      ? await prisma.project.findFirst({
          where: {
            deletedAt: null,
            id: projectId,
            OR: [
              ...(employeeProjectScopes ? [{ team: { hasSome: employeeProjectScopes } }] : []),
              ...(employeeAssignees ? [{ tasks: { some: { deletedAt: null, assignee: { in: employeeAssignees } } } }] : []),
            ],
          },
        })
      : await prisma.project.findUnique({ where: { id: projectId } });
    
    if (!project || project.deletedAt) {
      throw new AppError("Project not found", 404, "NOT_FOUND");
    }
    return mapProject(project, access?.role);
  },

  async list(query: ProjectQuery, access?: AccessScope) {
    const [employeeProjectScopes, employeeAssignees] = await Promise.all([
      getEmployeeProjectScope(access),
      getEmployeeAssigneeScope(access),
    ]);
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: toDbStatus(query.status) } : {}),
      ...(
        employeeProjectScopes || employeeAssignees
          ? {
              OR: [
                ...(employeeProjectScopes ? [{ team: { hasSome: employeeProjectScopes } }] : []),
                ...(employeeAssignees ? [{ tasks: { some: { deletedAt: null, assignee: { in: employeeAssignees } } } }] : []),
              ],
            }
          : {}
      ),
    };

    const [total, projects] = await prisma.$transaction([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      data: projects.map((project) => mapProject(project, access?.role)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  async create(input: ProjectInput) {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description ?? "",
        progress: input.progress ?? 0,
        status: toDbStatus(input.status ?? "pending"),
        team: input.team ?? [],
        dueDate: input.dueDate ?? "",
        stage: toDbStage(input.stage ?? "Discovery"),
        budget: input.budget ?? "$0",
        tasksDone: input.tasksDone ?? 0,
        tasksTotal: input.tasksTotal ?? 0,
        updatedAt: new Date(),
      },
    });
    return mapProject(project);
  },

  async update(projectId: number, patch: Partial<ProjectInput>) {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Project not found", 404, "NOT_FOUND");
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
        ...(patch.status !== undefined ? { status: toDbStatus(patch.status) } : {}),
        ...(patch.team !== undefined ? { team: patch.team } : {}),
        ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
        ...(patch.stage !== undefined ? { stage: toDbStage(patch.stage) } : {}),
        ...(patch.budget !== undefined ? { budget: patch.budget } : {}),
        ...(patch.tasksDone !== undefined ? { tasksDone: patch.tasksDone } : {}),
        ...(patch.tasksTotal !== undefined ? { tasksTotal: patch.tasksTotal } : {}),
      },
    });

    // Send email if status changed
    if (patch.status && patch.status !== fromDbStatus(existing.status)) {
      // Get team members for the project
      const teamMembers = await prisma.teamMember.findMany({
        where: { department: existing.team?.[0] || "All" }, // Simple match, can be improved
        select: { email: true, name: true },
        take: 10, // Limit to avoid too many emails
      });

      if (teamMembers.length > 0) {
        sendProjectUpdateEmail({
          name: project.name,
          status: patch.status,
          teamMembers,
        }).catch(() => {});
      }
    }

    return mapProject(project);
  },

  async delete(projectId: number) {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Project not found", 404, "NOT_FOUND");
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });
  },
};
