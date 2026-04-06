-- Add optional projectId to Task for project linkage
ALTER TABLE "Task" ADD COLUMN "projectId" INTEGER;

CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

ALTER TABLE "Task"
ADD CONSTRAINT "Task_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL
ON UPDATE NO ACTION;

