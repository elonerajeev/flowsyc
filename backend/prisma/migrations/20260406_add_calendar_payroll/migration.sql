DO $$ BEGIN
  CREATE TYPE "EventRepeat" AS ENUM ('none', 'weekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AssignmentKind" AS ENUM ('none', 'member', 'team');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollStatus" AS ENUM ('pending', 'processed', 'paid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CalendarEvent" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "starttime" TEXT NOT NULL,
  "endtime" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT '',
  "notes" TEXT NOT NULL DEFAULT '',
  "color" TEXT NOT NULL DEFAULT 'primary',
  "repeat" "EventRepeat" NOT NULL DEFAULT 'none',
  "assignmentKind" "AssignmentKind" NOT NULL DEFAULT 'none',
  "assigneeId" TEXT NOT NULL DEFAULT '',
  "assigneeName" TEXT NOT NULL DEFAULT '',
  "assigneeMeta" TEXT NOT NULL DEFAULT '',
  "authorId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarEvent_authorId_idx" ON "CalendarEvent"("authorId");
CREATE INDEX IF NOT EXISTS "CalendarEvent_deletedAt_idx" ON "CalendarEvent"("deletedAt");
CREATE INDEX IF NOT EXISTS "CalendarEvent_date_idx" ON "CalendarEvent"("date");
CREATE INDEX IF NOT EXISTS "CalendarEvent_assigneeId_idx" ON "CalendarEvent"("assigneeId");

CREATE TABLE IF NOT EXISTS "Payroll" (
  "id" SERIAL NOT NULL,
  "memberId" TEXT NOT NULL,
  "memberName" TEXT NOT NULL,
  "department" TEXT NOT NULL DEFAULT '',
  "period" TEXT NOT NULL,
  "baseSalary" INTEGER NOT NULL,
  "allowances" INTEGER NOT NULL,
  "deductions" INTEGER NOT NULL,
  "netPay" INTEGER NOT NULL,
  "status" "PayrollStatus" NOT NULL DEFAULT 'pending',
  "paymentMode" "PaymentMode" NOT NULL DEFAULT 'bank_transfer',
  "paidAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Payroll_memberId_idx" ON "Payroll"("memberId");
CREATE INDEX IF NOT EXISTS "Payroll_period_idx" ON "Payroll"("period");
CREATE INDEX IF NOT EXISTS "Payroll_status_idx" ON "Payroll"("status");
CREATE INDEX IF NOT EXISTS "Payroll_deletedAt_idx" ON "Payroll"("deletedAt");

