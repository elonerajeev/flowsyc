import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type MockTask = {
  id: number;
  title: string;
  assignee: string;
  avatar: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  tags: string[];
  valueStream: "Growth" | "Product" | "Support";
  column: "todo" | "in-progress" | "done";
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const mockState = {
  tasks: [] as MockTask[],
};

const mockPrisma = {
  task: {
    findUnique: jest.fn(async ({ where }: { where: { id: number } }) => mockState.tasks.find((task) => task.id === where.id) ?? null),
    findMany: jest.fn(async () => mockState.tasks.filter((task) => !task.deletedAt)),
    create: jest.fn(async ({ data }: { data: Omit<MockTask, "id" | "deletedAt" | "createdAt" | "updatedAt"> }) => {
      const task: MockTask = {
        id: mockState.tasks.length + 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      mockState.tasks.push(task);
      return task;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: number }; data: Partial<MockTask> }) => {
      const task = mockState.tasks.find((entry) => entry.id === where.id);
      if (!task) throw new Error("Task not found");
      Object.assign(task, data, { updatedAt: new Date() });
      return task;
    }),
  },
  teamMember: {
    findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
      // Mock team member lookup
      if (where.email === "test@example.com") {
        return { name: "Test User", email: "test@example.com" };
      }
      return null;
    }),
  },
};

jest.mock("../config/prisma", () => ({
  prisma: mockPrisma,
}));

describe("tasksService", () => {
  beforeEach(() => {
    mockState.tasks.length = 0;
    mockPrisma.task.findUnique.mockClear();
    mockPrisma.task.findMany.mockClear();
    mockPrisma.task.create.mockClear();
    mockPrisma.task.update.mockClear();
  });

  it('creates a task that defaults to "todo"', async () => {
    const { tasksService } = await import("../services/tasks.service");
    const task = await tasksService.create({
      title: "Ship UI",
      assignee: "Sarah",
      priority: "medium",
      dueDate: "2026-04-01",
    });
    expect(task.column).toBe("todo");
  });

  it("returns grouped kanban structure", async () => {
    mockState.tasks.push({
      id: 1,
      title: "Task 1",
      assignee: "Sarah",
      avatar: "SJ",
      priority: "medium",
      dueDate: "2026-04-01",
      tags: [],
      valueStream: "Growth",
      column: "todo",
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { tasksService } = await import("../services/tasks.service");
    const grouped = await tasksService.list({ page: 1, limit: 50 });
    expect(grouped.todo).toHaveLength(1);
    expect(grouped["in-progress"]).toHaveLength(0);
    expect(grouped.done).toHaveLength(0);
  });

  it("moves a task to a different column on update", async () => {
    mockState.tasks.push({
      id: 1,
      title: "Task 1",
      assignee: "Sarah",
      avatar: "SJ",
      priority: "medium",
      dueDate: "2026-04-01",
      tags: [],
      valueStream: "Growth",
      column: "todo",
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { tasksService } = await import("../services/tasks.service");
    const task = await tasksService.update(1, { column: "done" });
    expect(task.column).toBe("done");
  });
});
