import { Prisma } from "@prisma/client";
import { getCurrentUser } from "../utils/request-context";

type ModelWithOwnership =
  | "Lead"
  | "Deal"
  | "Client"
  | "Project"
  | "Invoice"
  | "Candidate"
  | "JobPosting"
  | "Note"
  | "Comment"
  | "Attachment"
  | "CalendarEvent"
  | "Activity"
  | "AutomationRule";

interface IsolationConfig {
  createdBy?: string[];
  assignedTo?: string[];
  authorId?: string[];
  hostId?: string[];
  assignee?: string[];
}

const MODEL_ISOLATION_CONFIG: Record<ModelWithOwnership, IsolationConfig> = {
  Lead: {
    createdBy: ["createdBy"],
    assignedTo: ["assignedTo"],
  },
  Deal: {
    createdBy: ["createdBy"],
    assignedTo: ["assignedTo"],
  },
  Client: {
    assignedTo: ["assignedTo"],
  },
  Project: {
    createdBy: ["createdBy"],
  },
  Invoice: {
    createdBy: ["createdBy"],
  },
  Candidate: {
    createdBy: ["createdBy"],
  },
  JobPosting: {
    createdBy: ["createdBy"],
  },
  Note: {
    authorId: ["authorId"],
  },
  Comment: {
    authorId: ["authorId"],
  },
  Attachment: {
    authorId: ["authorId"],
  },
  CalendarEvent: {
    authorId: ["authorId"],
    assignee: ["assigneeId"],
  },
  Activity: {
    createdBy: ["createdBy"],
  },
  AutomationRule: {
    createdBy: ["createdBy"],
  },
};

export function applyIsolationFilter<T extends Record<string, unknown>>(
  modelName: ModelWithOwnership,
  where: T | undefined,
  ctx: { userId: string; email: string; role: string }
): T {
  const config = MODEL_ISOLATION_CONFIG[modelName];
  if (!config) {
    return where as T;
  }

  const filter = buildIsolationFilter(config, ctx);
  if (!filter || Object.keys(filter).length === 0) {
    return where as T;
  }

  return {
    AND: [where || {}, filter],
  } as unknown as T;
}

function buildIsolationFilter(
  config: IsolationConfig,
  ctx: { userId: string; email: string; role: string }
): Record<string, unknown> | null {
  const conditions: Record<string, unknown>[] = [];

  if (config.createdBy) {
    config.createdBy.forEach((field) => {
      conditions.push({ [field]: ctx.email });
    });
  }

  if (config.assignedTo) {
    config.assignedTo.forEach((field) => {
      conditions.push({ [field]: ctx.email });
      conditions.push({ [field]: ctx.userId });
    });
  }

  if (config.authorId) {
    config.authorId.forEach((field) => {
      conditions.push({ [field]: ctx.userId });
    });
  }

  if (config.hostId) {
    config.hostId.forEach((field) => {
      conditions.push({ [field]: ctx.email });
    });
  }

  if (config.assignee) {
    config.assignee.forEach((field) => {
      conditions.push({ [field]: ctx.email });
    });
  }

  if (conditions.length === 0) {
    return null;
  }

  return { OR: conditions };
}

export function getIsolationContext() {
  return getCurrentUser();
}

export function shouldApplyIsolation(modelName: string): modelName is ModelWithOwnership {
  return [
    "Lead",
    "Deal",
    "Client",
    "Project",
    "Invoice",
    "Candidate",
    "JobPosting",
    "Note",
    "Comment",
    "Attachment",
    "CalendarEvent",
    "Activity",
    "AutomationRule",
  ].includes(modelName);
}