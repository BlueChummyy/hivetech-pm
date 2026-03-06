-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_global_admin" BOOLEAN NOT NULL DEFAULT false;

-- Set existing OWNER users as global admins
UPDATE "users" SET "is_global_admin" = true
WHERE "id" IN (
  SELECT DISTINCT "user_id" FROM "workspace_members" WHERE "role" = 'OWNER'
);
