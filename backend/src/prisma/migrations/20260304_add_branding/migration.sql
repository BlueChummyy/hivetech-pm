CREATE TABLE "brandings" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "org_name" TEXT,
    "primary_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brandings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brandings_workspace_id_key" ON "brandings"("workspace_id");
ALTER TABLE "brandings" ADD CONSTRAINT "brandings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
