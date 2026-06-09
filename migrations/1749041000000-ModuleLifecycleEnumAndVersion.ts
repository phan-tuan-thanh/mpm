import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Chuyển module_status_enum → module_lifecycle_status_enum (7 states)
 * Mapping: backlog→planning, in_progress→active, paused→suspended,
 *          completed→maintenance, cancelled→cancelled, unknown→planning
 * Rollback note: deprecated/retired → completed (lossy, intended)
 */
export class ModuleLifecycleEnumAndVersion1749041000000 implements MigrationInterface {
  name = 'ModuleLifecycleEnumAndVersion1749041000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo enum mới
    await queryRunner.query(`
      CREATE TYPE "module_lifecycle_status_enum" AS ENUM (
        'planning', 'active', 'maintenance', 'suspended',
        'deprecated', 'retired', 'cancelled'
      )
    `);

    // 2. Thêm column tạm
    await queryRunner.query(`
      ALTER TABLE "modules" ADD COLUMN "status_new" "module_lifecycle_status_enum"
    `);

    // 3. Migrate data — unknown values → 'planning'
    await queryRunner.query(`
      UPDATE "modules" SET "status_new" = CASE "status"::text
        WHEN 'backlog'     THEN 'planning'::module_lifecycle_status_enum
        WHEN 'in_progress' THEN 'active'::module_lifecycle_status_enum
        WHEN 'paused'      THEN 'suspended'::module_lifecycle_status_enum
        WHEN 'completed'   THEN 'maintenance'::module_lifecycle_status_enum
        WHEN 'cancelled'   THEN 'cancelled'::module_lifecycle_status_enum
        ELSE               'planning'::module_lifecycle_status_enum
      END
    `);

    // 4. Validate no NULLs before swap
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM "modules" WHERE "status_new" IS NULL) THEN
          RAISE EXCEPTION 'Migration failed: NULL values in status_new';
        END IF;
      END $$
    `);

    // 5. Swap columns
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "modules" RENAME COLUMN "status_new" TO "status"`);
    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "status" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "status" SET DEFAULT 'planning'`);

    // 6. Drop old enum
    await queryRunner.query(`DROP TYPE "module_status_enum"`);

    // 7. Add version column for optimistic locking
    await queryRunner.query(`
      ALTER TABLE "modules" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback note: deprecated/retired → completed (lossy — intended, see requirements.md REQ-3)
    await queryRunner.query(`
      CREATE TYPE "module_status_enum" AS ENUM (
        'backlog', 'in_progress', 'paused', 'completed', 'cancelled'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" ADD COLUMN "status_old" "module_status_enum"
    `);

    await queryRunner.query(`
      UPDATE "modules" SET "status_old" = CASE "status"::text
        WHEN 'planning'    THEN 'backlog'::module_status_enum
        WHEN 'active'      THEN 'in_progress'::module_status_enum
        WHEN 'suspended'   THEN 'paused'::module_status_enum
        WHEN 'maintenance' THEN 'completed'::module_status_enum
        WHEN 'cancelled'   THEN 'cancelled'::module_status_enum
        WHEN 'deprecated'  THEN 'completed'::module_status_enum
        WHEN 'retired'     THEN 'completed'::module_status_enum
        ELSE               'backlog'::module_status_enum
      END
    `);

    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "modules" RENAME COLUMN "status_old" TO "status"`);
    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "status" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "modules" ALTER COLUMN "status" SET DEFAULT 'backlog'`);

    await queryRunner.query(`DROP TYPE "module_lifecycle_status_enum"`);
    await queryRunner.query(`ALTER TABLE "modules" DROP COLUMN IF EXISTS "version"`);
  }
}
