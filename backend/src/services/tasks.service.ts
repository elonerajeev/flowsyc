import { logger } from "../utils/logger";
import { Prisma, type TaskColumn, type TaskPriority } from "@prisma/client";

import { prisma } from "../config/prisma";
import type { UserRole } from "../config/types";
import { AppError } from "../middleware/error.middleware";
import { getEmployeeAssigneeScope } from "../utils/access-control";
import { sendTaskAssignmentEmail } from "../utils/email-templates";
import { getIO } from "../socket";
import { triggerAutomation } from "./automation-engine";

type TaskRecord = {
  id: number;
  title: string;
  assignee: string;
  avatar: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  tags: string[];
  valueStream: "Growth" | "Product" | "Support";
  column: "todo" | "in-progress" | "done";
  projectId?: number | null;
};

type TaskInput = {
  title: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  tags?: string[];
  valueStream?: "Growth" | "Product" | "Support";
  column?: "todo" | "in-progress" | "done";
  avatar?: string;
  projectId?: number | null;
};

type TaskQuery = {
  page: number;
  limit: number;
  column?: TaskRecord["column"];
  priority?: TaskRecord["priority"];
  projectId?: number;
};

type AccessScope = {
  role: UserRole;
  userId: string;
  email: string;
} | null | undefined;

function toDbPriority(priority: TaskRecord["priority"]): TaskPriority {
  return priority;
}

function fromDbPriority(priority: TaskPriority): TaskRecord["priority"] {
  return priority;
}

function toDbColumn(column: TaskRecord["column"]): TaskColumn {
  return column === "in-progress" ? "in_progress" : column;
}

function fromDbColumn(column: TaskColumn): TaskRecord["column"] {
  return column === "in_progress" ? "in-progress" : column;
}

function mapTask(task: {
  id: number;
  title: string;
  assignee: string;
  avatar: string;
  priority: TaskPriority;
  dueDate: string;
  tags: string[];
  valueStream: string;
  column: TaskColumn;
  projectId?: number | null;
}): TaskRecord {
  return {
    id: task.id,
    title: task.title,
    assignee: task.assignee,
    avatar: task.avatar,
    priority: fromDbPriority(task.priority),
    dueDate: task.dueDate,
    tags: task.tags,
    valueStream: task.valueStream as TaskRecord["valueStream"],
    column: fromDbColumn(task.column),
    projectId: task.projectId ?? null,
  };
}

async function ensureProjectExists(projectId?: number | null) {
  if (!projectId) {
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });

  if (!project || project.deletedAt) {
    throw new AppError("Project not found", 404, "NOT_FOUND");
  }
}

async function syncProjectTaskStats(projectId?: number | null) {
  if (!projectId) {
    return;
  }

  const [tasksTotal, tasksDone] = await prisma.$transaction([
    prisma.task.count({
      where: { deletedAt: null, projectId },
    }),
    prisma.task.count({
      where: { deletedAt: null, projectId, column: "done" },
    }),
  ]);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      tasksTotal,
      tasksDone,
    },
  });
}

export const tasksService = {
  async getById(taskId: number, access?: AccessScope) {
    const employeeAssignees = await getEmployeeAssigneeScope(access);
    const task = employeeAssignees
      ? await prisma.task.findFirst({
          where: {
            deletedAt: null,
            id: taskId,
            assignee: { in: employeeAssignees },
          },
        })
      : await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) {
      throw new AppError("Task not found", 404, "NOT_FOUND");
    }
    return mapTask(task);
  },

  async list(query: TaskQuery, access?: AccessScope) {
    const employeeAssignees = await getEmployeeAssigneeScope(access);
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...(query.column ? { column: toDbColumn(query.column) } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(employeeAssignees ? { assignee: { in: employeeAssignees } } : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ column: "asc" }, { createdAt: "asc" }],
      take: 500, // safety cap — UI paginates via ShowMore
    });

    const grouped: Record<TaskRecord["column"], TaskRecord[]> = {
      todo: [],
      "in-progress": [],
      done: [],
    };
    tasks.map(mapTask).forEach((task) => grouped[task.column].push(task));
    return grouped;
  },

  async create(input: TaskInput, access?: AccessScope) {
    await ensureProjectExists(input.projectId);

    const task = await prisma.task.create({
      data: {
        title: input.title,
        assignee: input.assignee,
        avatar: input.avatar ?? input.assignee.slice(0, 2).toUpperCase(),
        priority: toDbPriority(input.priority),
        dueDate: input.dueDate,
        tags: input.tags ?? [],
        valueStream: input.valueStream ?? "Growth",
        column: toDbColumn(input.column ?? "todo"),
        projectId: input.projectId ?? null,
        updatedAt: new Date(),
      },
    });

    // Send task assignment email
    const assignee = await prisma.teamMember.findUnique({ where: { email: input.assignee }, select: { name: true, email: true } });
    let assignerName = "Task Manager";
    if (access) {
      const assigner = await prisma.teamMember.findUnique({ where: { email: access.email }, select: { name: true } });
      if (assigner) {
        assignerName = assigner.name;
      }
    }
    if (assignee) {
      sendTaskAssignmentEmail({
        title: input.title,
        description: "", // Task model doesn't have description
        priority: input.priority,
        dueDate: input.dueDate || "",
        assigneeEmail: assignee.email,
        assigneeName: assignee.name,
        assignerName,
      }).catch(() => {});
    }

    // Trigger automation: Task Completed (when new task is in done column)
    if (task.column === "done") {
      triggerAutomation("task_completed", {
        trigger: "task_completed",
        entityType: "Task",
        entityId: task.id,
        data: {
          title: task.title,
          assignee: task.assignee,
          priority: task.priority,
          completedAt: new Date().toISOString(),
        },
      }).catch((err) => logger.error("Automation trigger failed:", err));
    }

    // Trigger automation: Task Created
    triggerAutomation("task_created", {
      trigger: "task_created",
      entityType: "Task",
      entityId: task.id,
      data: {
        title: task.title,
        assignee: task.assignee,
        priority: task.priority,
        dueDate: task.dueDate,
        column: task.column,
        projectId: task.projectId,
      },
    }).catch((err) => logger.error("Automation trigger failed:", err));

    // Emit real-time update
    const socketIO = getIO();
    if (socketIO) {
      socketIO.to(`project_${task.projectId}`).emit('task:created', mapTask(task));
      if (assignee) {
        socketIO.to(`user_${assignee.email}`).emit('task:assigned', mapTask(task));
      }
    }

    await syncProjectTaskStats(task.projectId);
    return mapTask(task);
  },

  async update(taskId: number, patch: Partial<TaskInput>, access?: AccessScope) {
    const employeeAssignees = await getEmployeeAssigneeScope(access);
    const existing = employeeAssignees
      ? await prisma.task.findFirst({
          where: {
            id: taskId,
            deletedAt: null,
            assignee: { in: employeeAssignees },
          },
        })
      : await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Task not found", 404, "NOT_FOUND");
    }

    if (patch.projectId !== undefined) {
      await ensureProjectExists(patch.projectId);
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.assignee !== undefined ? { assignee: patch.assignee } : {}),
        ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
        ...(patch.priority !== undefined ? { priority: toDbPriority(patch.priority) } : {}),
        ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
        ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        ...(patch.valueStream !== undefined ? { valueStream: patch.valueStream } : {}),
        ...(patch.column !== undefined ? { column: toDbColumn(patch.column) } : {}),
        ...(patch.projectId !== undefined ? { projectId: patch.projectId ?? null } : {}),
      },
    });

    // Trigger automation: Task Completed (when task moves to done column)
    if (patch.column === "done" && existing.column !== "done") {
      triggerAutomation("task_completed", {
        trigger: "task_completed",
        entityType: "Task",
        entityId: task.id,
        data: {
          title: task.title,
          assignee: task.assignee,
          priority: task.priority,
          completedAt: new Date().toISOString(),
        },
      }).catch((err) => logger.error("Automation trigger failed:", err));
    }

    // Send email if assignee changed
    if (patch.assignee && patch.assignee !== existing.assignee) {
      const assignee = await prisma.teamMember.findUnique({ where: { email: patch.assignee }, select: { name: true, email: true } });
      if (assignee) {
        sendTaskAssignmentEmail({
          title: task.title,
          description: "", // Task model doesn't have description
          priority: fromDbPriority(task.priority),
          dueDate: task.dueDate || "",
          assigneeEmail: assignee.email,
          assigneeName: assignee.name,
          assignerName: "Task Manager",
        }).catch(() => {});
      }
    }

    await Promise.all([
      syncProjectTaskStats(existing.projectId),
      syncProjectTaskStats(task.projectId),
    ]);

    return mapTask(task);
  },

  async delete(taskId: number, access?: AccessScope) {
    const employeeAssignees = await getEmployeeAssigneeScope(access);
    const existing = employeeAssignees
      ? await prisma.task.findFirst({
          where: {
            id: taskId,
            deletedAt: null,
            assignee: { in: employeeAssignees },
          },
        })
      : await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Task not found", 404, "NOT_FOUND");
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    await syncProjectTaskStats(existing.projectId);
  },
};
