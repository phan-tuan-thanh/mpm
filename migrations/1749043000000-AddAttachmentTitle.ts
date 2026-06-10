import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttachmentTitle1749043000000 implements MigrationInterface {
  name = 'AddAttachmentTitle1749043000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_attachments" ADD COLUMN "title" character varying(255)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_attachments" DROP COLUMN "title"`,
    );
  }
}
