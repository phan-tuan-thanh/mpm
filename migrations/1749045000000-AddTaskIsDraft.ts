import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskIsDraft1749045000000 implements MigrationInterface {
  name = 'AddTaskIsDraft1749045000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD COLUMN "is_draft" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "is_draft"`);
  }
}
