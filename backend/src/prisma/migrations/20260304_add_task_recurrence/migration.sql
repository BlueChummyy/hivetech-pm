-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "recurrence_rule" TEXT;
ALTER TABLE "tasks" ADD COLUMN "recurrence_interval" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "tasks" ADD COLUMN "recurrence_days" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tasks" ADD COLUMN "next_recurrence" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "recurrence_end_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tasks_next_recurrence_idx" ON "tasks"("next_recurrence");
