import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSubtaskTypeToBug1750005000000 implements MigrationInterface {
  name = 'RenameSubtaskTypeToBug1750005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename enum value subtask → bug (PostgreSQL 10+)
    await queryRunner.query(`ALTER TYPE task_type_enum RENAME VALUE 'subtask' TO 'bug'`);

    // Migrate task_type_config JSONB in projects: rename key 'subtask' → 'bug'
    await queryRunner.query(`
      UPDATE projects
      SET task_type_config = (task_type_config::jsonb - 'subtask') || jsonb_build_object('bug', task_type_config::jsonb -> 'subtask')
      WHERE task_type_config::jsonb ? 'subtask'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE task_type_enum RENAME VALUE 'bug' TO 'subtask'`);

    await queryRunner.query(`
      UPDATE projects
      SET task_type_config = (task_type_config::jsonb - 'bug') || jsonb_build_object('subtask', task_type_config::jsonb -> 'bug')
      WHERE task_type_config::jsonb ? 'bug'
    `);
  }
}
