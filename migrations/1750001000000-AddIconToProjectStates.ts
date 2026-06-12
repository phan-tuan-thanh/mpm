import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIconToProjectStates1750001000000 implements MigrationInterface {
  name = 'AddIconToProjectStates1750001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project_states" ADD COLUMN "icon" VARCHAR(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project_states" DROP COLUMN "icon"
    `);
  }
}
