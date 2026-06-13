import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskTypeConfigToProject1750004000000 implements MigrationInterface {
  name = 'AddTaskTypeConfigToProject1750004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "task_type_config" jsonb NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "task_type_config"`);
  }
}
