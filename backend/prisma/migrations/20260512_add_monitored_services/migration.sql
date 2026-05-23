-- CreateEnum
CREATE TYPE "ServiceCheckType" AS ENUM ('http', 'tcp', 'ping');
CREATE TYPE "ServiceStatus" AS ENUM ('up', 'down', 'degraded', 'unknown');

-- CreateTable MonitoredService
CREATE TABLE "MonitoredService" (
  "id"             SERIAL NOT NULL,
  "organizationId" TEXT,
  "name"           TEXT NOT NULL,
  "url"            TEXT NOT NULL,
  "checkType"      "ServiceCheckType" NOT NULL DEFAULT 'http',
  "intervalSecs"   INTEGER NOT NULL DEFAULT 30,
  "timeoutMs"      INTEGER NOT NULL DEFAULT 5000,
  "expectedStatus" INTEGER DEFAULT 200,
  "tags"           TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdBy"      TEXT,
  "deletedAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonitoredService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MonitoredService_organizationId_idx" ON "MonitoredService"("organizationId");
CREATE INDEX "MonitoredService_isActive_idx"       ON "MonitoredService"("isActive");
CREATE INDEX "MonitoredService_deletedAt_idx"      ON "MonitoredService"("deletedAt");

-- CreateTable ServiceCheck
CREATE TABLE "ServiceCheck" (
  "id"         SERIAL NOT NULL,
  "serviceId"  INTEGER NOT NULL,
  "status"     "ServiceStatus" NOT NULL,
  "responseMs" INTEGER,
  "statusCode" INTEGER,
  "error"      TEXT,
  "checkedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceCheck_serviceId_idx"            ON "ServiceCheck"("serviceId");
CREATE INDEX "ServiceCheck_checkedAt_idx"            ON "ServiceCheck"("checkedAt");
CREATE INDEX "ServiceCheck_serviceId_checkedAt_idx"  ON "ServiceCheck"("serviceId", "checkedAt");

ALTER TABLE "ServiceCheck"
  ADD CONSTRAINT "ServiceCheck_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "MonitoredService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
