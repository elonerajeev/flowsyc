-- Create Contact table (was missing from prior migrations)
CREATE TABLE IF NOT EXISTS "Contact" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "seniority" TEXT,
    "clientId" INTEGER,
    "leadId" INTEGER,
    "organizationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Contact_deletedAt_idx" ON "Contact"("deletedAt");
CREATE INDEX IF NOT EXISTS "Contact_clientId_idx" ON "Contact"("clientId");
CREATE INDEX IF NOT EXISTS "Contact_email_idx" ON "Contact"("email");
CREATE INDEX IF NOT EXISTS "Contact_leadId_idx" ON "Contact"("leadId");
CREATE INDEX IF NOT EXISTS "Contact_organizationId_idx" ON "Contact"("organizationId");

ALTER TABLE "Contact"
ADD CONSTRAINT "Contact_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure organizationId exists on Lead (may be missing on fresh DBs)
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "Lead_organizationId_idx" ON "Lead"("organizationId");

-- Replace global email uniqueness with org-scoped uniqueness for tenant isolation
DROP INDEX IF EXISTS "Lead_email_key";
DROP INDEX IF EXISTS "Contact_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_organizationId_email_key"
ON "Lead"("organizationId", "email");

CREATE UNIQUE INDEX IF NOT EXISTS "Contact_organizationId_email_key"
ON "Contact"("organizationId", "email");
