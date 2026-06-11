import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSprintTables1749048000000 implements MigrationInterface {
  name = 'CreateSprintTables1749048000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── sprints ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "sprint_status_enum" AS ENUM ('planning', 'active', 'completed')
    `);

    await queryRunner.query(`
      CREATE TABLE "sprints" (
        "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
        "project_id"            UUID NOT NULL,
        "name"                  VARCHAR(255) NOT NULL,
        "goal"                  VARCHAR(1000),
        "start_date"            DATE,
        "end_date"              DATE,
        "status"                "sprint_status_enum" NOT NULL DEFAULT 'planning',
        "target_capacity"       NUMERIC(8,2),
        "initial_story_points"  NUMERIC(8,1),
        "initial_tasks_count"   INTEGER,
        "completed_at"          TIMESTAMPTZ,
        "created_by"            UUID NOT NULL,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"            TIMESTAMPTZ,
        CONSTRAINT "pk_sprints" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sprints_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_sprints_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sprints_project_status"
        ON "sprints" ("project_id", "status")
        WHERE "deleted_at" IS NULL
    `);

    // ── sprint_member_capacities ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "sprint_member_capacities" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "sprint_id"  UUID NOT NULL,
        "user_id"    UUID NOT NULL,
        "capacity"   NUMERIC(7,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "pk_sprint_member_capacities" PRIMARY KEY ("id"),
        CONSTRAINT "fk_smc_sprint" FOREIGN KEY ("sprint_id")
          REFERENCES "sprints"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_smc_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_smc_sprint_user" UNIQUE ("sprint_id", "user_id")
      )
    `);

    // ── sprint_snapshots ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "sprint_snapshots" (
        "id"                       UUID NOT NULL DEFAULT gen_random_uuid(),
        "sprint_id"                UUID NOT NULL,
        "snapshot_date"            DATE NOT NULL,
        "remaining_story_points"   NUMERIC(8,1) NOT NULL DEFAULT 0,
        "remaining_tasks_count"    INTEGER NOT NULL DEFAULT 0,
        "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"               TIMESTAMPTZ,
        CONSTRAINT "pk_sprint_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sprint_snapshots_sprint" FOREIGN KEY ("sprint_id")
          REFERENCES "sprints"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_sprint_snapshots_sprint_date"
        ON "sprint_snapshots" ("sprint_id", "snapshot_date")
        WHERE "deleted_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sprint_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sprint_member_capacities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sprints"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sprint_status_enum"`);
  }
}
