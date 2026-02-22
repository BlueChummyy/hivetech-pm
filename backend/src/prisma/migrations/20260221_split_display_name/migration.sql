-- Split display_name into first_name and last_name

-- Step 1: Add new columns
ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
ALTER TABLE "users" ADD COLUMN "last_name" TEXT;

-- Step 2: Populate from existing display_name
-- First word -> first_name, everything after -> last_name
UPDATE "users"
SET
  "first_name" = SPLIT_PART("display_name", ' ', 1),
  "last_name"  = CASE
    WHEN POSITION(' ' IN "display_name") > 0
    THEN SUBSTRING("display_name" FROM POSITION(' ' IN "display_name") + 1)
    ELSE ''
  END;

-- Step 3: Make columns non-nullable now that data is populated
ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;

-- Step 4: Drop the old column
ALTER TABLE "users" DROP COLUMN "display_name";
