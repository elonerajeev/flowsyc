import { logger } from "../utils/logger";
import { getIO } from "../socket";
import { prisma } from "../config/prisma";
import type { NotificationType, NotificationPriority } from "@prisma/client";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  linkUrl?: string;
  linkLabel?: string;
  entityType?: string;
  entityId?: number;
  batchKey?: string;
  metadata?: Record<string, unknown>;
};

type NotificationQuery = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

function toNotificationType(type: string): NotificationType {
  const validTypes = ["task", "lead", "deal", "client", "project", "invoice", "system", "collaboration"];
  if (validTypes.includes(type)) {
    return type as NotificationType;
  }
  return "system";
}

function toNotificationPriority(priority?: string): NotificationPriority {
  if (priority === "low" || priority === "high" || priority === "urgent") {
    return priority;
  }
  return "medium";
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const { userId, batchKey, metadata } = input;

  // Check for existing unread notification with same batchKey to batch them
  if (batchKey) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        batchKey,
        isRead: false,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Within last 5 minutes
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (existing) {
      // Batch with existing notification
      await prisma.notification.update({
        where: { id: existing.id },
        data: {
          batchCount: existing.batchCount + 1,
          createdAt: new Date(), // Update timestamp
        },
      });
      return;
    }
  }

  // Create new notification
  await prisma.notification.create({
    data: {
      userId,
      type: toNotificationType(input.type),
      title: input.title,
      message: input.message,
      priority: toNotificationPriority(input.priority),
      linkUrl: input.linkUrl,
      linkLabel: input.linkLabel,
      entityType: input.entityType,
      entityId: input.entityId,
      batchKey: input.batchKey,
      batchCount: 1,
      metadata: metadata ? JSON.stringify(metadata) : {},
    },
  });

  // Emit real-time event
  const io = getIO();
  if (io) {
    io.to(`user_${userId}`).emit("notification", {
      type: input.type,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl,
      entityType: input.entityType,
      entityId: input.entityId,
    });
  }
}

export async function listNotifications(
  userId: string,
  query: NotificationQuery
): Promise<{ data: Array<{
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  entityType?: string;
  entityId?: number;
  isRead: boolean;
  batchCount: number;
  createdAt: Date;
}>; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };
  if (query.unreadOnly) {
    where.isRead = false;
  }

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        linkUrl: true,
        linkLabel: true,
        entityType: true,
        entityId: true,
        isRead: true,
        batchCount: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: data as Array<{
      id: number;
      type: NotificationType;
      title: string;
      message: string;
      linkUrl?: string;
      linkLabel?: string;
      entityType?: string;
      entityId?: number;
      isRead: boolean;
      batchCount: number;
      createdAt: Date;
    }>,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function markAsRead(userId: string, notificationId: number): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function deleteOldNotifications(userId: string, daysOld: number = 30): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  await prisma.notification.deleteMany({
    where: {
      userId,
      isRead: true,
      createdAt: { lt: cutoffDate },
    },
  });
}