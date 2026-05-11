-- Add user linkage to team members for durable auth mapping
ALTER TABLE "TeamMember"
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Ensure one team member is linked to at most one user
CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_userId_key"
ON "TeamMember"("userId");

-- Enforce referential integrity to User table
ALTER TABLE "TeamMember"
ADD CONSTRAINT "TeamMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Invite token type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InviteTokenType') THEN
    CREATE TYPE "InviteTokenType" AS ENUM ('invite_setup');
  END IF;
END $$;

-- Persist invite tokens to prevent replay and support expiry checks
CREATE TABLE IF NOT EXISTS "InviteToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "type" "InviteTokenType" NOT NULL,
  "createdBy" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_tokenHash_key" ON "InviteToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "InviteToken_userId_idx" ON "InviteToken"("userId");
CREATE INDEX IF NOT EXISTS "InviteToken_organizationId_idx" ON "InviteToken"("organizationId");
CREATE INDEX IF NOT EXISTS "InviteToken_email_idx" ON "InviteToken"("email");
CREATE INDEX IF NOT EXISTS "InviteToken_type_idx" ON "InviteToken"("type");
CREATE INDEX IF NOT EXISTS "InviteToken_expiresAt_idx" ON "InviteToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "InviteToken_usedAt_idx" ON "InviteToken"("usedAt");

ALTER TABLE "InviteToken"
ADD CONSTRAINT "InviteToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
