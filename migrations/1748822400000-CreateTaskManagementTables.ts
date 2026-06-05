import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskManagementTables1748822400000 implements MigrationInterface {
  name = 'CreateTaskManagementTables1748822400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enums ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "task_type_enum" AS ENUM ('epic', 'story', 'task', 'subtask')
    `);

    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM ('urgent', 'high', 'medium', 'low', 'none')
    `);

    await queryRunner.query(`
      CREATE TYPE "task_relation_type_enum" AS ENUM ('blocking', 'blocked_by', 'relates_to', 'duplicate_of')
    `);

    await queryRunner.query(`
      CREATE TYPE "task_activity_type_enum" AS ENUM (
        'created',
        'title_changed',
        'description_changed',
        'state_changed',
        'priority_changed',
        'type_changed',
        'parent_changed',
        'estimate_changed',
        'start_date_changed',
        'due_date_changed',
        'assignee_added',
        'assignee_removed',
        'label_added',
        'label_removed',
        'attachment_added',
        'attachment_removed',
        'link_added',
        'link_removed',
        'relation_added',
        'relation_removed',
        'comment_added',
        'comment_edited',
        'comment_deleted',
        'deleted',
        'completed',
        'reopened'
      )
    `);

    // ─── Extend existing tasks table ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD COLUMN "type" "task_type_enum" NOT NULL DEFAULT 'task',
        ADD COLUMN "priority" "task_priority_enum" NOT NULL DEFAULT 'none',
        ADD COLUMN "parent_id" UUID REFERENCES "tasks"("id") ON DELETE CASCADE,
        ADD COLUMN "backlog_order" FLOAT8 NOT NULL DEFAULT 0,
        ADD COLUMN "start_date" DATE,
        ADD COLUMN "due_date" DATE,
        ADD COLUMN "completed_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN "cycle_id" UUID,
        ADD CONSTRAINT "chk_task_dates" CHECK (
          "start_date" IS NULL OR "due_date" IS NULL OR "start_date" <= "due_date"
        )
    `);

    // ─── Indexes on tasks ─────────────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX "idx_tasks_type" ON "tasks"("project_id", "type")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_priority" ON "tasks"("project_id", "priority")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tasks_state_id" ON "tasks"("project_id", "state_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_parent" ON "tasks"("parent_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_backlog_order" ON "tasks"("project_id", "backlog_order")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_due_date" ON "tasks"("project_id", "due_date")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_cycle" ON "tasks"("cycle_id") WHERE "cycle_id" IS NOT NULL`);

    // GIN index for full-text search on title
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_search" ON "tasks" USING GIN(to_tsvector('simple', "title"))
    `);

    // ─── task_assignees ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "task_assignees" (
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_task_assignees" PRIMARY KEY ("task_id", "user_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_task_assignees_user" ON "task_assignees"("user_id")`);

    // ─── labels ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "labels" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "name" VARCHAR(50) NOT NULL,
        "color" CHAR(7) NOT NULL DEFAULT '#6B7280',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_labels" PRIMARY KEY ("id"),
        CONSTRAINT "uq_label_name" UNIQUE ("project_id", "name")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_labels_project" ON "labels"("project_id")`);

    // ─── task_labels ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "task_labels" (
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "label_id" UUID NOT NULL REFERENCES "labels"("id") ON DELETE CASCADE,
        CONSTRAINT "pk_task_labels" PRIMARY KEY ("task_id", "label_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_task_labels_label" ON "task_labels"("label_id")`);

    // ─── task_attachments ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "task_attachments" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "original_name" VARCHAR(255) NOT NULL,
        "storage_path" VARCHAR(500) NOT NULL,
        "mime_type" VARCHAR(100) NOT NULL,
        "size_bytes" BIGINT NOT NULL,
        "uploader_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_task_attachments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_task_attachments_task" ON "task_attachments"("task_id")`);

    // ─── task_links ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "task_links" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "url" VARCHAR(2048) NOT NULL,
        "title" VARCHAR(255),
        "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_task_links" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_task_links_task" ON "task_links"("task_id")`);

    // ─── task_relations ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "task_relations" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "source_task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "target_task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "relation_type" "task_relation_type_enum" NOT NULL,
        "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_task_relations" PRIMARY KEY ("id"),
        CONSTRAINT "uq_task_relation" UNIQUE ("source_task_id", "target_task_id", "relation_type")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_task_relations_source" ON "task_relations"("source_task_id")`);
    await queryRunner.query(`CREATE INDEX "idx_task_relations_target" ON "task_relations"("target_task_id")`);

    // ─── task_activity ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "task_activity" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "actor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "entry_type" "task_activity_type_enum" NOT NULL,
        "field" VARCHAR(100),
        "old_value" TEXT,
        "new_value" TEXT,
        "comment" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_task_activity" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_task_activity_task" ON "task_activity"("task_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "idx_task_activity_actor" ON "task_activity"("actor_id")`);

    // ─── Audit event enum additions ───────────────────────────────────────
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'task_created'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'task_updated'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'task_deleted'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'task_reordered'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'label_created'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'label_deleted'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "task_activity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_relations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_links"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_labels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "labels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_assignees"`);

    // Remove indexes on tasks
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_cycle"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_backlog_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_parent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_state_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_type"`);

    // Remove added columns and constraint from tasks
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "chk_task_dates"`);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        DROP COLUMN IF EXISTS "cycle_id",
        DROP COLUMN IF EXISTS "completed_at",
        DROP COLUMN IF EXISTS "due_date",
        DROP COLUMN IF EXISTS "start_date",
        DROP COLUMN IF EXISTS "backlog_order",
        DROP COLUMN IF EXISTS "parent_id",
        DROP COLUMN IF EXISTS "priority",
        DROP COLUMN IF EXISTS "type"
    `);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "task_activity_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_relation_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_type_enum"`);
  }
}
