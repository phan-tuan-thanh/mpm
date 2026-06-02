import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectSettingsColumns1717286500000 implements MigrationInterface {
  name = 'AddProjectSettingsColumns1717286500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Add columns to projects table ────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN "emoji" VARCHAR(10),
        ADD COLUMN "cover_image_url" VARCHAR(500),
        ADD COLUMN "network" VARCHAR(10) NOT NULL DEFAULT 'secret' CHECK (network IN ('public', 'secret')),
        ADD COLUMN "lead_id" UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        ADD COLUMN "feature_cycles" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN "feature_modules" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN "feature_views" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN "feature_pages" BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN "feature_intake" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "feature_time_tracking" BOOLEAN NOT NULL DEFAULT false
    `);

    // ─── Create Indexes for projects ──────────────────────────────────────
    await queryRunner.query(`CREATE INDEX "idx_projects_network" ON "projects"("network")`);
    await queryRunner.query(`CREATE INDEX "idx_projects_lead" ON "projects"("lead_id")`);

    // ─── Create State Group Enum Type ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "state_group_enum" AS ENUM ('backlog', 'unstarted', 'started', 'completed', 'cancelled')
    `);

    // ─── Create Project States Table ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "project_states" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        "name" VARCHAR(50) NOT NULL,
        "color" CHAR(7) NOT NULL DEFAULT '#6B7280',
        "group" "state_group_enum" NOT NULL,
        "is_default" BOOLEAN NOT NULL DEFAULT false,
        "order" SMALLINT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_project_states" PRIMARY KEY ("id"),
        CONSTRAINT "uq_project_state_name" UNIQUE ("project_id", "name")
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_project_states_project" ON "project_states"("project_id", "order")`);
    await queryRunner.query(`CREATE INDEX "idx_project_states_default" ON "project_states"("project_id") WHERE is_default = true`);

    // ─── Create enforce_single_default_state trigger ──────────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION enforce_single_default_state()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.is_default = true THEN
              UPDATE project_states
              SET is_default = false
              WHERE project_id = NEW.project_id
                AND id <> NEW.id
                AND is_default = true;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_single_default_state
      BEFORE INSERT OR UPDATE ON project_states
      FOR EACH ROW EXECUTE FUNCTION enforce_single_default_state();
    `);

    // ─── Create Estimate Type Enum and Table ──────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "estimate_type_enum" AS ENUM ('points', 'categories', 'time')
    `);

    await queryRunner.query(`
      CREATE TABLE "project_estimate_configs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        "estimate_type" "estimate_type_enum" NOT NULL DEFAULT 'points',
        "values" JSONB NOT NULL DEFAULT '[0, 0.5, 1, 2, 3, 5, 8, 13, 21]',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_project_estimate_configs" PRIMARY KEY ("id"),
        CONSTRAINT "uq_project_estimate_config_project" UNIQUE ("project_id"),
        CONSTRAINT "chk_estimate_values_not_empty" CHECK (jsonb_array_length(values) >= 2)
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_estimate_configs_project" ON "project_estimate_configs"("project_id")`);

    // ─── Add new values to audit_event_type_enum ──────────────────────────
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_features_updated'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_state_created'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_state_updated'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_state_deleted'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_estimate_updated'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'member_joined_public'`);

    // ─── Seeding existing projects ────────────────────────────────────────
    const projects = await queryRunner.query(`SELECT id FROM projects`);
    for (const project of projects) {
      const pid = project.id;
      // Seeding 6 default states
      await queryRunner.query(`
        INSERT INTO "project_states" ("project_id", "name", "color", "group", "is_default", "order") VALUES
          ('${pid}', 'Backlog', '#6B7280', 'backlog', false, 0),
          ('${pid}', 'Todo', '#3B82F6', 'unstarted', true, 1),
          ('${pid}', 'In Progress', '#F59E0B', 'started', false, 2),
          ('${pid}', 'In Review', '#8B5CF6', 'started', false, 3),
          ('${pid}', 'Done', '#10B981', 'completed', false, 4),
          ('${pid}', 'Cancelled', '#EF4444', 'cancelled', false, 5)
      `);
      // Seeding default estimate config
      await queryRunner.query(`
        INSERT INTO "project_estimate_configs" ("project_id", "estimate_type", "values") VALUES
          ('${pid}', 'points', '[0, 0.5, 1, 2, 3, 5, 8, 13, 21]')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop Tables & Views
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_estimate_configs_project"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_estimate_configs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estimate_type_enum"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_single_default_state ON project_states`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS enforce_single_default_state()`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_states_default"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_states_project"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_states"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "state_group_enum"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_lead"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_network"`);

    await queryRunner.query(`
      ALTER TABLE "projects"
        DROP COLUMN IF EXISTS "emoji",
        DROP COLUMN IF EXISTS "cover_image_url",
        DROP COLUMN IF EXISTS "network",
        DROP COLUMN IF EXISTS "lead_id",
        DROP COLUMN IF EXISTS "timezone",
        DROP COLUMN IF EXISTS "feature_cycles",
        DROP COLUMN IF EXISTS "feature_modules",
        DROP COLUMN IF EXISTS "feature_views",
        DROP COLUMN IF EXISTS "feature_pages",
        DROP COLUMN IF EXISTS "feature_intake",
        DROP COLUMN IF EXISTS "feature_time_tracking"
    `);
  }
}
