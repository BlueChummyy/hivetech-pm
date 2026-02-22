-- Add missing index on task_dependencies.depends_on_task_id
-- This column is used in reverse-lookup queries (dependedOnBy relation)
-- and circular dependency detection BFS traversal
CREATE INDEX IF NOT EXISTS "task_dependencies_depends_on_task_id_idx"
  ON "task_dependencies"("depends_on_task_id");

-- Add composite index on notifications for user notification listing
-- Notifications are listed per-user ordered by created_at desc
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx"
  ON "notifications"("user_id", "created_at");
