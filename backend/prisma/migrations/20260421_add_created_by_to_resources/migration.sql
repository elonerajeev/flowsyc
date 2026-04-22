-- Add createdBy field to Deal for resource ownership tracking
ALTER TABLE "Deal" ADD COLUMN "createdBy" TEXT;
CREATE INDEX "Deal_createdBy_idx" ON "Deal"("createdBy");

-- Add createdBy field to Project for resource ownership tracking
ALTER TABLE "Project" ADD COLUMN "createdBy" TEXT;
CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");

-- Add createdBy field to Invoice for resource ownership tracking
ALTER TABLE "Invoice" ADD COLUMN "createdBy" TEXT;
CREATE INDEX "Invoice_createdBy_idx" ON "Invoice"("createdBy");

-- Add createdBy field to Candidate for resource ownership tracking
ALTER TABLE "Candidate" ADD COLUMN "createdBy" TEXT;
CREATE INDEX "Candidate_createdBy_idx" ON "Candidate"("createdBy");
