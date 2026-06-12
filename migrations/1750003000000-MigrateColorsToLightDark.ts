import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateColorsToLightDark1750003000000 implements MigrationInterface {
  name = 'MigrateColorsToLightDark1750003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename color to color_light and alter type/default
    await queryRunner.query(`ALTER TABLE "project_states" RENAME COLUMN "color" TO "color_light"`);
    await queryRunner.query(`ALTER TABLE "project_states" ALTER COLUMN "color_light" TYPE CHAR(7)`);
    await queryRunner.query(`ALTER TABLE "project_states" ALTER COLUMN "color_light" SET DEFAULT '#6B7280'`);

    await queryRunner.query(`ALTER TABLE "workspace_state_templates" RENAME COLUMN "color" TO "color_light"`);
    await queryRunner.query(`ALTER TABLE "workspace_state_templates" ALTER COLUMN "color_light" TYPE CHAR(7)`);
    await queryRunner.query(`ALTER TABLE "workspace_state_templates" ALTER COLUMN "color_light" SET DEFAULT '#6B7280'`);

    await queryRunner.query(`ALTER TABLE "labels" RENAME COLUMN "color" TO "color_light"`);
    await queryRunner.query(`ALTER TABLE "labels" ALTER COLUMN "color_light" TYPE CHAR(7)`);
    await queryRunner.query(`ALTER TABLE "labels" ALTER COLUMN "color_light" SET DEFAULT '#6B7280'`);

    // 2. Add color_dark
    await queryRunner.query(`ALTER TABLE "project_states" ADD COLUMN "color_dark" CHAR(7) DEFAULT '#6B7280' NOT NULL`);
    await queryRunner.query(`ALTER TABLE "workspace_state_templates" ADD COLUMN "color_dark" CHAR(7) DEFAULT '#6B7280' NOT NULL`);
    await queryRunner.query(`ALTER TABLE "labels" ADD COLUMN "color_dark" CHAR(7) DEFAULT '#6B7280' NOT NULL`);

    // 3. Update color_dark based on color_light
    const updateQuery = (table: string) => `
      UPDATE "${table}" SET "color_dark" = CASE
        WHEN UPPER("color_light") = '#EF4444' THEN '#F87171'
        WHEN UPPER("color_light") = '#F97316' THEN '#FB923C'
        WHEN UPPER("color_light") = '#F59E0B' THEN '#FBBF24'
        WHEN UPPER("color_light") = '#EAB308' THEN '#FDE047'
        WHEN UPPER("color_light") = '#10B981' THEN '#34D399'
        WHEN UPPER("color_light") = '#14B8A6' THEN '#2DD4BF'
        WHEN UPPER("color_light") = '#3B82F6' THEN '#60A5FA'
        WHEN UPPER("color_light") = '#6366F1' THEN '#818CF8'
        WHEN UPPER("color_light") = '#8B5CF6' THEN '#A78BFA'
        WHEN UPPER("color_light") = '#EC4899' THEN '#F472B6'
        WHEN UPPER("color_light") = '#6B7280' THEN '#9CA3AF'
        ELSE "color_light"
      END
    `;
    await queryRunner.query(updateQuery('project_states'));
    await queryRunner.query(updateQuery('workspace_state_templates'));
    await queryRunner.query(updateQuery('labels'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop color_dark columns
    await queryRunner.query(`ALTER TABLE "project_states" DROP COLUMN "color_dark"`);
    await queryRunner.query(`ALTER TABLE "workspace_state_templates" DROP COLUMN "color_dark"`);
    await queryRunner.query(`ALTER TABLE "labels" DROP COLUMN "color_dark"`);

    // Rename color_light back to color
    await queryRunner.query(`ALTER TABLE "project_states" RENAME COLUMN "color_light" TO "color"`);
    await queryRunner.query(`ALTER TABLE "project_states" ALTER COLUMN "color" SET DEFAULT '#6B7280'`);
    await queryRunner.query(`ALTER TABLE "workspace_state_templates" RENAME COLUMN "color_light" TO "color"`);
    await queryRunner.query(`ALTER TABLE "workspace_state_templates" ALTER COLUMN "color" SET DEFAULT '#6B7280'`);
    await queryRunner.query(`ALTER TABLE "labels" RENAME COLUMN "color_light" TO "color"`);
    await queryRunner.query(`ALTER TABLE "labels" ALTER COLUMN "color" SET DEFAULT '#6B7280'`);
  }
}
