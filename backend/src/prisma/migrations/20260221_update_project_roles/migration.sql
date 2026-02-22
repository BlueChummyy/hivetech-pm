-- Update ProjectRole enum: replace MEMBER with PROJECT_MANAGER, TEAM_MEMBER, GUEST

-- Step 1: Add new enum values
ALTER TYPE "ProjectRole" ADD VALUE IF NOT EXISTS 'PROJECT_MANAGER';
ALTER TYPE "ProjectRole" ADD VALUE IF NOT EXISTS 'TEAM_MEMBER';
ALTER TYPE "ProjectRole" ADD VALUE IF NOT EXISTS 'GUEST';

-- Step 2: Migrate existing MEMBER roles to TEAM_MEMBER
-- (Must commit the ALTER TYPE first, so we do this in a separate statement)
UPDATE "project_members" SET "role" = 'TEAM_MEMBER' WHERE "role" = 'MEMBER';

-- Note: PostgreSQL does not support removing enum values directly.
-- The old 'MEMBER' value remains in the enum type but is no longer used.
-- To fully remove it would require recreating the enum type, which is
-- not worth the complexity for a migration.
