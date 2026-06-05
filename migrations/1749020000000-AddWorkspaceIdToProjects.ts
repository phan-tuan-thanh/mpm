import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceIdToProjects1749020000000 implements MigrationInterface {
  name = 'AddWorkspaceIdToProjects1749020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Add workspace_id column to projects table ────────────────────────
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN "workspace_id" UUID
    `);

    // ─── Create index for workspace lookup ────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX "idx_projects_workspace" ON "projects"("workspace_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Drop index ───────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_workspace"`);

    // ─── Drop column ──────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "workspace_id"
    `);
  }
}
