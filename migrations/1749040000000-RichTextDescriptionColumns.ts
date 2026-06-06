import { MigrationInterface, QueryRunner } from 'typeorm';

export class RichTextDescriptionColumns1749040000000 implements MigrationInterface {
  name = 'RichTextDescriptionColumns1749040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm cột description_plain (text) cho FTS — làm trước khi đổi type
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description_plain text`);
    await queryRunner.query(`ALTER TABLE modules ADD COLUMN IF NOT EXISTS description_plain text`);
    await queryRunner.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description_plain text`);

    // 2. Copy plain text cũ sang description_plain trước khi ALTER TYPE
    await queryRunner.query(`
      UPDATE tasks SET description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);
    await queryRunner.query(`
      UPDATE modules SET description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);
    await queryRunner.query(`
      UPDATE projects SET description_plain = description
      WHERE description IS NOT NULL AND description != ''
    `);

    // 3. Đổi description từ text/varchar → jsonb (wrap plain text trong TipTap paragraph JSON)
    const wrapToTiptap = `
      CASE
        WHEN description IS NULL OR description = '' THEN NULL
        ELSE jsonb_build_object(
          'type', 'doc',
          'content', jsonb_build_array(
            jsonb_build_object(
              'type', 'paragraph',
              'content', jsonb_build_array(
                jsonb_build_object('type', 'text', 'text', description)
              )
            )
          )
        )
      END
    `;
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN description TYPE jsonb USING (${wrapToTiptap})
    `);
    await queryRunner.query(`
      ALTER TABLE modules ALTER COLUMN description TYPE jsonb USING (${wrapToTiptap})
    `);
    await queryRunner.query(`
      ALTER TABLE projects ALTER COLUMN description TYPE jsonb USING (${wrapToTiptap})
    `);

    // 4. GIN index trên description_plain để FTS
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_description_fts
      ON tasks USING GIN (to_tsvector('simple', coalesce(description_plain, '')))
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_modules_description_fts
      ON modules USING GIN (to_tsvector('simple', coalesce(description_plain, '')))
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_description_fts
      ON projects USING GIN (to_tsvector('simple', coalesce(description_plain, '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_description_fts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_modules_description_fts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_projects_description_fts`);

    // Rollback description về text (lấy plain text từ description_plain)
    await queryRunner.query(`
      ALTER TABLE tasks ALTER COLUMN description TYPE text
      USING coalesce(description_plain, '')
    `);
    await queryRunner.query(`
      ALTER TABLE modules ALTER COLUMN description TYPE text
      USING coalesce(description_plain, '')
    `);
    await queryRunner.query(`
      ALTER TABLE projects ALTER COLUMN description TYPE varchar(2000)
      USING coalesce(description_plain, '')
    `);

    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS description_plain`);
    await queryRunner.query(`ALTER TABLE modules DROP COLUMN IF EXISTS description_plain`);
    await queryRunner.query(`ALTER TABLE projects DROP COLUMN IF EXISTS description_plain`);
  }
}
