import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLabelIsExclusive1749038000000 implements MigrationInterface {
  name = 'AddLabelIsExclusive1749038000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labels"
        ADD COLUMN "is_exclusive" BOOLEAN NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labels"
        DROP COLUMN "is_exclusive"
    `);
  }
}
