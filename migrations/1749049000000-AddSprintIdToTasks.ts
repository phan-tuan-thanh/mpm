import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSprintIdToTasks1749049000000 implements MigrationInterface {
  name = 'AddSprintIdToTasks1749049000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột sprint_id (nullable FK → sprints.id)
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD COLUMN "sprint_id" UUID,
        ADD CONSTRAINT "fk_tasks_sprint"
          FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE SET NULL
    `);

    // Migrate dữ liệu từ cycle_id cũ sang sprint_id (sprints chưa tồn tại nên cycle_id = NULL)
    await queryRunner.query(`
      UPDATE "tasks" SET "sprint_id" = NULL WHERE "sprint_id" IS NULL
    `);

    // Index cho sprint_id
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_sprint_id"
        ON "tasks" ("sprint_id")
        WHERE "sprint_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_sprint_id"`);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        DROP CONSTRAINT IF EXISTS "fk_tasks_sprint",
        DROP COLUMN IF EXISTS "sprint_id"
    `);
  }
}
