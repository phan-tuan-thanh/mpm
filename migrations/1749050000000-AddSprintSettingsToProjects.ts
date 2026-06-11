import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_SPRINT_SETTINGS = JSON.stringify({
  terminology: 'sprint',
  maxActiveSprints: 1,
  defaultDurationWeeks: 2,
  capacityMode: 'total',
});

export class AddSprintSettingsToProjects1749050000000 implements MigrationInterface {
  name = 'AddSprintSettingsToProjects1749050000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột sprint_settings nếu chưa tồn tại
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD COLUMN IF NOT EXISTS "sprint_settings" JSONB NOT NULL DEFAULT '${DEFAULT_SPRINT_SETTINGS}'::jsonb
    `);

    // Backfill giá trị mặc định cho project chưa có
    await queryRunner.query(`
      UPDATE "projects"
        SET "sprint_settings" = '${DEFAULT_SPRINT_SETTINGS}'::jsonb
        WHERE "sprint_settings" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "sprint_settings"
    `);
  }
}
