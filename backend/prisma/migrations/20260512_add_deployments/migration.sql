CREATE TYPE "DeploymentStatus" AS ENUM ('success', 'failed', 'running', 'cancelled');

CREATE TABLE "Deployment" (
  "id"             SERIAL NOT NULL,
  "organizationId" TEXT,
  "service"        TEXT NOT NULL,
  "environment"    TEXT NOT NULL,
  "status"         "DeploymentStatus" NOT NULL DEFAULT 'running',
  "commitHash"     TEXT,
  "commitMessage"  TEXT,
  "branch"         TEXT,
  "deployedBy"     TEXT,
  "version"        TEXT,
  "notes"          TEXT,
  "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Deployment_organizationId_idx" ON "Deployment"("organizationId");
CREATE INDEX "Deployment_status_idx"         ON "Deployment"("status");
CREATE INDEX "Deployment_environment_idx"    ON "Deployment"("environment");
CREATE INDEX "Deployment_startedAt_idx"      ON "Deployment"("startedAt");
