-- CreateEnum
CREATE TYPE "ScheduledJobType" AS ENUM ('email', 'task', 'alert', 'webhook', 'reminder');

-- CreateEnum
CREATE TYPE "ScheduledJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" SERIAL NOT NULL,
    "jobType" "ScheduledJobType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "cronExpression" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "ScheduledJobStatus" NOT NULL DEFAULT 'pending',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "nextRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "entityType" TEXT,
    "entityId" INTEGER,
    "createdBy" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledJob_status_scheduledFor_idx" ON "ScheduledJob"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledJob_entityType_entityId_idx" ON "ScheduledJob"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ScheduledJob_isRecurring_idx" ON "ScheduledJob"("isRecurring");

-- CreateIndex
CREATE INDEX "ScheduledJob_organizationId_idx" ON "ScheduledJob"("organizationId");
