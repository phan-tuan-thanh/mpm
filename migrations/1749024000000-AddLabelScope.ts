import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLabelScope1749024000000 implements MigrationInterface {
  name = 'AddLabelScope1749024000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Add scope and workspace_id columns ───────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "labels"
        ADD COLUMN "scope" VARCHAR(10) NOT NULL DEFAULT 'project'
          CHECK (scope IN ('workspace', 'project')),
        ADD COLUMN "workspace_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
    `);

    // ─── Make project_id nullable ─────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "labels" ALTER COLUMN "project_id" DROP NOT NULL
    `);

    // ─── Drop old UNIQUE constraint (project_id, name) ────────────────────
    await queryRunner.query(`
      ALTER TABLE "labels" DROP CONSTRAINT IF EXISTS "uq_label_name"
    `);

    // ─── Backfill workspace_id from projects.workspace_id ─────────────────
    await queryRunner.query(`
      UPDATE "labels" l
      SET "workspace_id" = p."workspace_id"
      FROM "projects" p
      WHERE l."project_id" = p."id"
    `);

    // ─── Remove placeholder default after backfill ────────────────────────
    await queryRunner.query(`
      ALTER TABLE "labels" ALTER COLUMN "workspace_id" DROP DEFAULT
    `);

    // ─── Partial UNIQUE indexes by scope ──────────────────────────────────
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_labels_unique_workspace"
        ON "labels"("workspace_id", "name")
        WHERE "scope" = 'workspace'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_labels_unique_project"
        ON "labels"("project_id", "name")
        WHERE "scope" = 'project'
    `);

    // ─── Partial indexes for merge query performance ──────────────────────
    await queryRunner.query(`
      CREATE INDEX "idx_labels_workspace"
        ON "labels"("workspace_id")
        WHERE "scope" = 'workspace'
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_labels_project_scope"
        ON "labels"("project_id")
        WHERE "scope" = 'project'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Drop partial indexes ─────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_labels_project_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_labels_workspace"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_labels_unique_project"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_labels_unique_workspace"`);

    // ─── Remove workspace-scoped labels (project_id IS NULL) before restoring NOT NULL
    await queryRunner.query(`
      DELETE FROM "labels" WHERE "project_id" IS NULL
    `);

    // ─── Restore NOT NULL on project_id ───────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "labels" ALTER COLUMN "project_id" SET NOT NULL
    `);

    // ─── Restore original UNIQUE constraint ───────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "labels" ADD CONSTRAINT "uq_label_name" UNIQUE ("project_id", "name")
    `);

    // ─── Drop new columns ─────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "labels"
        DROP COLUMN IF EXISTS "workspace_id",
        DROP COLUMN IF EXISTS "scope"
    `);
  }
}
