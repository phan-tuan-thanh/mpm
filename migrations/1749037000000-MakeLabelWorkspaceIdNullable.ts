import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeLabelWorkspaceIdNullable1749037000000 implements MigrationInterface {
  name = 'MakeLabelWorkspaceIdNullable1749037000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labels"
        ALTER COLUMN "workspace_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "labels"
        ALTER COLUMN "workspace_id" SET NOT NULL
    `);
  }
}
