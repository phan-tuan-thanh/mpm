import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStateTemplates1749028000000 implements MigrationInterface {
  name = 'CreateStateTemplates1749028000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Create workspace_state_templates table ───────────────────────────
    await queryRunner.query(`
      CREATE TABLE "workspace_state_templates" (
        "id"           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "workspace_id" UUID        NOT NULL,
        "name"         VARCHAR(50) NOT NULL,
        "color"        CHAR(7)     NOT NULL DEFAULT '#6B7280',
        "group"        VARCHAR(20) NOT NULL CHECK ("group" IN ('backlog','unstarted','started','completed','cancelled')),
        "is_default"   BOOLEAN     NOT NULL DEFAULT false,
        "order"        SMALLINT    NOT NULL DEFAULT 0,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE("workspace_id", "name")
      )
    `);

    // ─── Index for workspace lookup ───────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX "idx_state_templates_workspace"
        ON "workspace_state_templates"("workspace_id")
    `);

    // ─── Add template_id column to project_states ─────────────────────────
    await queryRunner.query(`
      ALTER TABLE "project_states"
        ADD COLUMN "template_id" UUID
          REFERENCES "workspace_state_templates"("id") ON DELETE SET NULL
    `);

    // ─── Partial index for template_id lookups ────────────────────────────
    await queryRunner.query(`
      CREATE INDEX "idx_project_states_template"
        ON "project_states"("template_id")
        WHERE "template_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Drop partial index on project_states.template_id ─────────────────
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_project_states_template"
    `);

    // ─── Drop template_id column from project_states ──────────────────────
    await queryRunner.query(`
      ALTER TABLE "project_states" DROP COLUMN IF EXISTS "template_id"
    `);

    // ─── Drop workspace index ─────────────────────────────────────────────
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_state_templates_workspace"
    `);

    // ─── Drop workspace_state_templates table ─────────────────────────────
    await queryRunner.query(`
      DROP TABLE IF EXISTS "workspace_state_templates"
    `);
  }
}
