ALTER TABLE "projects" ADD COLUMN "auto_archive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projects" ADD COLUMN "auto_archive_delay" INTEGER NOT NULL DEFAULT 0;
