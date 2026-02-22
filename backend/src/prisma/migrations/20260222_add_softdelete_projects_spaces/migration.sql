-- Add soft-delete support to projects and spaces

-- Add deleted_at column to projects table
ALTER TABLE "projects" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Add deleted_at column to spaces table
ALTER TABLE "spaces" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Add indexes for soft-delete queries
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");
CREATE INDEX "spaces_deleted_at_idx" ON "spaces"("deleted_at");
