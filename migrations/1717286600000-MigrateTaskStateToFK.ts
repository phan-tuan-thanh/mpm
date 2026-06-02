import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateTaskStateToFK1717286600000 implements MigrationInterface {
  name = 'MigrateTaskStateToFK1717286600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Check if tasks table exists. If not, create it ──────────────────
    const hasTable = await queryRunner.hasTable('tasks');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TYPE "task_state_enum" AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled')
      `);

      await queryRunner.query(`
        CREATE TABLE "tasks" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "task_id" VARCHAR(20) NOT NULL,
          "project_id" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          "title" VARCHAR(255) NOT NULL,
          "description" TEXT,
          "state" "task_state_enum" NOT NULL DEFAULT 'backlog',
          "estimate_value" NUMERIC(6,1),
          "reporter_id" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          CONSTRAINT "pk_tasks" PRIMARY KEY ("id")
        )
      `);

      await queryRunner.query(`
        CREATE UNIQUE INDEX "idx_tasks_task_id_project" ON "tasks"("project_id", "task_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_tasks_project_id" ON "tasks"("project_id")
      `);
      await queryRunner.query(`
        CREATE INDEX "idx_tasks_state" ON "tasks"("project_id", "state")
      `);
    }

    // ─── Step 1: Add state_id column ──────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" ADD COLUMN "state_id" UUID`);

    // ─── Step 2: Migrate data ─────────────────────────────────────────────
    // Map tasks.state string enum to project_states.id
    // mapping: backlog -> Backlog, todo -> Todo, in_progress -> In Progress, in_review -> In Review, done -> Done, cancelled -> Cancelled
    await queryRunner.query(`
      UPDATE "tasks" t
      SET "state_id" = ps.id
      FROM "project_states" ps
      WHERE ps.project_id = t.project_id
        AND LOWER(REPLACE(t.state::text, '_', ' ')) = LOWER(ps.name)
    `);

    // ─── Step 3: Check that all tasks have state_id ────────────────────────
    // If there are pre-existing tasks that didn't get matched, we assign them the default state of the project
    await queryRunner.query(`
      UPDATE "tasks" t
      SET "state_id" = ps.id
      FROM "project_states" ps
      WHERE ps.project_id = t.project_id
        AND ps.is_default = true
        AND t.state_id IS NULL
    `);

    // Verify no null state_ids
    const nullStatesCount = await queryRunner.query(`SELECT COUNT(*) as count FROM "tasks" WHERE "state_id" IS NULL`);
    const count = parseInt(nullStatesCount[0].count, 10);
    if (count > 0) {
      throw new Error(`Cannot migrate tasks. state_id has ${count} null values.`);
    }

    // ─── Step 4: Add NOT NULL, FK, and Index ──────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "state_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD CONSTRAINT "fk_task_state" FOREIGN KEY ("state_id") REFERENCES project_states("id") ON DELETE RESTRICT
    `);

    // ─── Step 5: Drop state column and enum type ──────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_state"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "state"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_state_enum"`);

    // ─── Step 6: Create new index ──────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX "idx_tasks_state_id" ON "tasks"("project_id", "state_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Recreate enum ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "task_state_enum" AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled')
    `);

    // ─── Add column state ─────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" ADD COLUMN "state" "task_state_enum"`);

    // ─── Map state_id to state enum ──────────────────────────────────────
    await queryRunner.query(`
      UPDATE "tasks" t
      SET "state" = CASE
        WHEN LOWER(ps.name) = 'backlog' THEN 'backlog'::task_state_enum
        WHEN LOWER(ps.name) = 'todo' THEN 'todo'::task_state_enum
        WHEN LOWER(ps.name) = 'in progress' THEN 'in_progress'::task_state_enum
        WHEN LOWER(ps.name) = 'in review' THEN 'in_review'::task_state_enum
        WHEN LOWER(ps.name) = 'done' THEN 'done'::task_state_enum
        WHEN LOWER(ps.name) = 'cancelled' THEN 'cancelled'::task_state_enum
        ELSE 'todo'::task_state_enum
      END
      FROM "project_states" ps
      WHERE t.state_id = ps.id
    `);

    // ─── Set state NOT NULL ───────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "state" SET NOT NULL`);

    // ─── Drop FK constraint and state_id index ────────────────────────────
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "fk_task_state"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_state_id"`);

    // ─── Create old index and drop state_id column ────────────────────────
    await queryRunner.query(`CREATE INDEX "idx_tasks_state" ON "tasks"("project_id", "state")`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "state_id"`);
  }
}
