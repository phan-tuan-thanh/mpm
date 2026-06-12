import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIconToLabels1750002000000 implements MigrationInterface {
  name = 'AddIconToLabels1750002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labels" ADD COLUMN "icon" VARCHAR(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labels" DROP COLUMN "icon"
    `);
  }
}
