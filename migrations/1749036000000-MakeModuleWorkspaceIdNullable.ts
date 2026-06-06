import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeModuleWorkspaceIdNullable1749036000000 implements MigrationInterface {
  name = 'MakeModuleWorkspaceIdNullable1749036000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "modules"
        ALTER COLUMN "workspace_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "modules"
        ALTER COLUMN "workspace_id" SET NOT NULL
    `);
  }
}
