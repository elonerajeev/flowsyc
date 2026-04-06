DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'AuditLog' AND column_name = 'timestamp'
  ) THEN
    ALTER TABLE "AuditLog" RENAME COLUMN "timestamp" TO "createdAt";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'AuditLog' AND column_name = 'createdAt'
  ) THEN
    ALTER TABLE "AuditLog" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
