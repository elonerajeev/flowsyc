-- Composite indexes for high-traffic paginated queries.

CREATE INDEX IF NOT EXISTS "Task_deletedAt_column_updatedAt_id_idx"
ON "Task" ("deletedAt", "column", "updatedAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Task_deletedAt_projectId_column_updatedAt_id_idx"
ON "Task" ("deletedAt", "projectId", "column", "updatedAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Task_deletedAt_priority_column_updatedAt_id_idx"
ON "Task" ("deletedAt", "priority", "column", "updatedAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Comment_taskId_deletedAt_createdAt_id_idx"
ON "Comment" ("taskId", "deletedAt", "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Comment_projectId_deletedAt_createdAt_id_idx"
ON "Comment" ("projectId", "deletedAt", "createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "Attachment_taskId_deletedAt_createdAt_idx"
ON "Attachment" ("taskId", "deletedAt", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Attachment_projectId_deletedAt_createdAt_idx"
ON "Attachment" ("projectId", "deletedAt", "createdAt" DESC);
