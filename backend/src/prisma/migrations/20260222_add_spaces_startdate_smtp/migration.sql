-- CreateTable: spaces
CREATE TABLE "spaces" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- Add spaceId to projects
ALTER TABLE "projects" ADD COLUMN "space_id" TEXT;

-- Add startDate to tasks
ALTER TABLE "tasks" ADD COLUMN "start_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "spaces_workspace_id_idx" ON "spaces"("workspace_id");
CREATE UNIQUE INDEX "spaces_workspace_id_slug_key" ON "spaces"("workspace_id", "slug");
CREATE INDEX "projects_space_id_idx" ON "projects"("space_id");

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
