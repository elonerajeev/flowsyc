import { prisma } from "../config/prisma";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "stage_change"
  | "hire"
  | "email_sent";

export type AuditLogRecord = {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction | string;
  entity: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
};

export async function resolveAuditActorName(userId: string, fallback?: string) {
  if (fallback?.trim()) {
    return fallback.trim();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return user?.name ?? user?.email ?? "Unknown";
}

export async function logAudit(params: {
  userId: string;
  userName?: string;
  action: AuditAction | string;
  entity: string;
  entityId?: string | number;
  detail?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: await resolveAuditActorName(params.userId, params.userName),
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ? String(params.entityId) : null,
        detail: params.detail ?? null,
      },
    });
  } catch {
    // Never let audit logging break the main flow
  }
}

export async function getAuditLogs(limit = 50) {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return logs.map<AuditLogRecord>((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
