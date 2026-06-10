import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectPriorityTable1749046000000 implements MigrationInterface {
  name = 'CreateProjectPriorityTable1749046000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create project_priority table
    await queryRunner.query(`
      CREATE TABLE "project_priority" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "project_id"   UUID         NOT NULL,
        "name"         VARCHAR(50)  NOT NULL,
        "value"        VARCHAR(50)  NOT NULL,
        "color_light"  CHAR(7)      NOT NULL DEFAULT '#9CA3AF',
        "color_dark"   CHAR(7)      NOT NULL DEFAULT '#6B7280',
        "icon"         VARCHAR(100) NOT NULL DEFAULT 'pi pi-flag',
        "order"        SMALLINT     NOT NULL DEFAULT 0,
        "is_system"    BOOLEAN      NOT NULL DEFAULT FALSE,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_priority" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_priority_value" UNIQUE ("project_id", "value"),
        CONSTRAINT "FK_project_priority_project"
          FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    // Convert tasks.priority from enum to varchar so dynamic values can be stored
    await queryRunner.query(`
      ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE VARCHAR(50) USING "priority"::text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-create the enum type before converting back
    await queryRunner.query(`
      CREATE TYPE "task_priority_enum" AS ENUM ('urgent', 'high', 'medium', 'low', 'none')
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE task_priority_enum USING "priority"::task_priority_enum
    `);
    await queryRunner.query(`DROP TABLE "project_priority"`);
  }
}
