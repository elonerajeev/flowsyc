CREATE TYPE "DevOpsAlertSeverity" AS ENUM ('critical', 'warning', 'info');
CREATE TABLE "DevOpsAlert" (
  "id"             SERIAL NOT NULL,
  "organizationId" TEXT,
  "title"          TEXT NOT NULL,
  "service"        TEXT NOT NULL,
  "severity"       "DevOpsAlertSeverity" NOT NULL DEFAULT 'warning',
  "description"    TEXT,
  "resolved"       BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt"     TIMESTAMP(3),
  "resolvedBy"     TEXT,
  "createdBy"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevOpsAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DevOpsAlert_organizationId_idx" ON "DevOpsAlert"("organizationId");
CREATE INDEX "DevOpsAlert_resolved_idx"       ON "DevOpsAlert"("resolved");
CREATE INDEX "DevOpsAlert_severity_idx"       ON "DevOpsAlert"("severity");
CREATE INDEX "DevOpsAlert_createdAt_idx"      ON "DevOpsAlert"("createdAt");
