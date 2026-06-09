import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModuleLifecycleLogs1749042000000 implements MigrationInterface {
  name = 'CreateModuleLifecycleLogs1749042000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "module_lifecycle_logs" (
        "id"              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "module_id"       UUID          NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
        "previous_status" "module_lifecycle_status_enum" NOT NULL,
        "new_status"      "module_lifecycle_status_enum" NOT NULL,
        "changed_by"      UUID          REFERENCES "users"("id") ON DELETE SET NULL,
        "changed_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "reason"          TEXT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_mlcl_module_id" ON "module_lifecycle_logs"("module_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_mlcl_changed_at" ON "module_lifecycle_logs"("changed_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mlcl_changed_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_mlcl_module_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "module_lifecycle_logs"`);
  }
}
