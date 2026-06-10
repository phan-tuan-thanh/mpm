import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentSortOrder1749044000000 implements MigrationInterface {
  name = 'AddAttachmentSortOrder1749044000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_attachments" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0`,
    );
    // Assign initial sort order based on creation time per task
    await queryRunner.query(`
      UPDATE task_attachments ta
      SET sort_order = ordered.rn
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY created_at) - 1 AS rn
        FROM task_attachments
      ) ordered
      WHERE ta.id = ordered.id
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task_attachments" DROP COLUMN "sort_order"`);
  }
}
