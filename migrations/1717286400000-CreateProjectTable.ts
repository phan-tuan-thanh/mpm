import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectTable1717286400000 implements MigrationInterface {
  name = 'CreateProjectTable1717286400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Create Enum Type ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "project_status_enum" AS ENUM ('active', 'archived')
    `);

    // ─── Create Projects Table ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "description" VARCHAR(2000),
        "key" VARCHAR(5) NOT NULL,
        "status" "project_status_enum" NOT NULL DEFAULT 'active',
        "owner_id" UUID NOT NULL,
        "task_counter" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "archived_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "pk_projects" PRIMARY KEY ("id"),
        CONSTRAINT "uq_project_key" UNIQUE ("key"),
        CONSTRAINT "fk_project_owner" FOREIGN KEY ("owner_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    // ─── Add FK constraint to project_members ──────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "project_members"
        ADD CONSTRAINT "fk_pm_project"
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
    `);

    // ─── Add Value to audit_event_type_enum ────────────────────────────────
    // PostgreSQL allows ALTER TYPE ... ADD VALUE, but it cannot run in a transaction block
    // in some older versions. In PG 12+, ALTER TYPE ADD VALUE is allowed within a transaction
    // unless the type is used in a table created/modified in the same transaction.
    // However, to be completely safe, we run these queries.
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_created'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_updated'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_archived'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'project_deleted'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'member_added'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'member_removed'`);
    await queryRunner.query(`ALTER TYPE "audit_event_type_enum" ADD VALUE IF NOT EXISTS 'member_role_changed'`);

    // ─── Create Indexes ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_project_key" ON "projects"("key")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_project_owner" ON "projects"("owner_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_project_status" ON "projects"("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_project_created" ON "projects"("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Drop Indexes ──────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_owner"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_key"`);

    // ─── Remove FK constraint from project_members ─────────────────────────
    await queryRunner.query(`
      ALTER TABLE "project_members" DROP CONSTRAINT IF EXISTS "fk_pm_project"
    `);

    // ─── Drop Projects Table ───────────────────────────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);

    // ─── Drop Enum Type ────────────────────────────────────────────────────
    await queryRunner.query(`DROP TYPE IF EXISTS "project_status_enum"`);

    // Note: We cannot easily remove values from an ENUM type in PostgreSQL down() migration
    // without dropping/recreating the enum type. Dropping values from enum is generally not supported
    // via simple ALTER TYPE. We leave the enum values as is, which is standard practice.
  }
}
