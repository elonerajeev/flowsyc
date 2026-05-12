CREATE TABLE "MonitoredServer" (
  "id"             SERIAL NOT NULL,
  "organizationId" TEXT,
  "name"           TEXT NOT NULL,
  "ip"             TEXT NOT NULL,
  "port"           INTEGER NOT NULL DEFAULT 22,
  "provider"       TEXT,
  "region"         TEXT,
  "tags"           TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdBy"      TEXT,
  "deletedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonitoredServer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MonitoredServer_organizationId_idx" ON "MonitoredServer"("organizationId");
CREATE INDEX "MonitoredServer_isActive_idx"       ON "MonitoredServer"("isActive");
CREATE INDEX "MonitoredServer_deletedAt_idx"      ON "MonitoredServer"("deletedAt");
