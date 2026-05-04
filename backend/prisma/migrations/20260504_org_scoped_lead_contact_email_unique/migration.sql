-- Replace global email uniqueness with org-scoped uniqueness for tenant isolation
DROP INDEX IF EXISTS "Lead_email_key";
DROP INDEX IF EXISTS "Contact_email_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_organizationId_email_key"
ON "Lead"("organizationId", "email");

CREATE UNIQUE INDEX IF NOT EXISTS "Contact_organizationId_email_key"
ON "Contact"("organizationId", "email");
