import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModules1749032000000 implements MigrationInterface {
  name = 'CreateModules1749032000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Create module_status_enum type ───────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "module_status_enum"
        AS ENUM ('backlog', 'in_progress', 'paused', 'completed', 'cancelled')
    `);

    // ─── Create modules table ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "modules" (
        "id"           UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
        "scope"        VARCHAR(10)        NOT NULL CHECK ("scope" IN ('workspace', 'project')),
        "workspace_id" UUID               NOT NULL,
        "project_id"   UUID               REFERENCES "projects"("id") ON DELETE CASCADE,
        "name"         VARCHAR(100)       NOT NULL,
        "description"  TEXT,
        "status"       "module_status_enum" NOT NULL DEFAULT 'backlog',
        "start_date"   DATE,
        "end_date"     DATE,
        "created_by"   UUID               NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at"   TIMESTAMPTZ        NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ        NOT NULL DEFAULT now(),
        CONSTRAINT "chk_module_scope" CHECK (
          ("scope" = 'workspace' AND "project_id" IS NULL) OR
          ("scope" = 'project'   AND "project_id" IS NOT NULL)
        )
      )
    `);

    // ─── Partial UNIQUE indexes for name uniqueness per scope ─────────────
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_modules_unique_workspace"
        ON "modules"("workspace_id", "name")
        WHERE "scope" = 'workspace'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_modules_unique_project"
        ON "modules"("project_id", "name")
        WHERE "scope" = 'project'
    `);

    // ─── Partial indexes for filtered queries ─────────────────────────────
    await queryRunner.query(`
      CREATE INDEX "idx_modules_workspace"
        ON "modules"("workspace_id")
        WHERE "scope" = 'workspace'
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_modules_project"
        ON "modules"("project_id")
        WHERE "scope" = 'project'
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_modules_end_date"
        ON "modules"("end_date")
        WHERE "end_date" IS NOT NULL
    `);

    // ─── Create task_modules join table ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "task_modules" (
        "task_id"   UUID        NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "module_id" UUID        NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
        "added_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY ("task_id", "module_id")
      )
    `);

    // ─── Indexes for task_modules reverse lookups ─────────────────────────
    await queryRunner.query(`
      CREATE INDEX "idx_task_modules_module"
        ON "task_modules"("module_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_task_modules_task"
        ON "task_modules"("task_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Drop task_modules indexes ────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_task_modules_task"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_task_modules_module"`);

    // ─── Drop task_modules table ──────────────────────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "task_modules"`);

    // ─── Drop modules indexes ─────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_modules_end_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_modules_project"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_modules_workspace"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_modules_unique_project"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_modules_unique_workspace"`);

    // ─── Drop modules table ───────────────────────────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "modules"`);

    // ─── Drop enum type ───────────────────────────────────────────────────
    await queryRunner.query(`DROP TYPE IF EXISTS "module_status_enum"`);
  }
}
