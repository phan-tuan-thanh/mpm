import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLabelDescription1749039000000 implements MigrationInterface {
  name = 'AddLabelDescription1749039000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labels"
        ADD COLUMN "description" VARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labels"
        DROP COLUMN "description"
    `);
  }
}
