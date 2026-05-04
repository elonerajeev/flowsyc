-- CreateTable
CREATE TABLE IF NOT EXISTS "InboxEmail" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "messageId" TEXT,
    "subject" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL DEFAULT '',
    "toEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "htmlBody" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "folder" TEXT NOT NULL DEFAULT 'INBOX',
    "entityType" TEXT,
    "entityId" INTEGER,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ImapAccount" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT 'imap.gmail.com',
    "port" INTEGER NOT NULL DEFAULT 993,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImapAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InboxEmail_uid_toEmail_key" ON "InboxEmail"("uid", "toEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InboxEmail_receivedAt_idx" ON "InboxEmail"("receivedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InboxEmail_fromEmail_idx" ON "InboxEmail"("fromEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InboxEmail_isRead_idx" ON "InboxEmail"("isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InboxEmail_entityType_entityId_idx" ON "InboxEmail"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ImapAccount_userId_key" ON "ImapAccount"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ImapAccount_userId_idx" ON "ImapAccount"("userId");
