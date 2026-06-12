import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradeTaskComments1750000000000 implements MigrationInterface {
  name = 'UpgradeTaskComments1750000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create task_comments table
    await queryRunner.query(`
      CREATE TABLE "task_comments" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "task_id"     UUID NOT NULL,
        "author_id"   UUID NOT NULL,
        "parent_id"   UUID,
        "content"     TEXT,
        "mentions"    UUID[] NOT NULL DEFAULT '{}',
        "edited_at"   TIMESTAMPTZ,
        "deleted_at"  TIMESTAMPTZ,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_task_comments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_task_comments_task" FOREIGN KEY ("task_id")
          REFERENCES "tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_task_comments_author" FOREIGN KEY ("author_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_task_comments_parent" FOREIGN KEY ("parent_id")
          REFERENCES "task_comments"("id") ON DELETE CASCADE
      )
    `);

    // 2. Create task_comment_reactions table
    await queryRunner.query(`
      CREATE TABLE "task_comment_reactions" (
        "comment_id"  UUID NOT NULL,
        "user_id"     UUID NOT NULL,
        "emoji"       VARCHAR(50) NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_task_comment_reactions" PRIMARY KEY ("comment_id", "user_id", "emoji"),
        CONSTRAINT "fk_reactions_comment" FOREIGN KEY ("comment_id")
          REFERENCES "task_comments"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_reactions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 3. Add source column to task_attachments table
    await queryRunner.query(`
      ALTER TABLE "task_attachments" ADD COLUMN "source" VARCHAR(50) NOT NULL DEFAULT 'attachment'
    `);

    // 4. Migrate existing comments from task_activity to task_comments
    // We escape HTML characters: & -> &amp;, < -> &lt;, > -> &gt; and wrap in <p>
    await queryRunner.query(`
      INSERT INTO "task_comments" (id, task_id, author_id, parent_id, content, mentions, edited_at, deleted_at, created_at, updated_at)
      SELECT
        id,
        task_id,
        actor_id,
        NULL,
        '<p>' || regexp_replace(regexp_replace(regexp_replace(comment, '&', '&amp;', 'g'), '<', '&lt;', 'g'), '>', '&gt;', 'g') || '</p>',
        '{}',
        CASE WHEN entry_type = 'comment_edited' THEN updated_at ELSE NULL END,
        NULL,
        created_at,
        updated_at
      FROM "task_activity"
      WHERE entry_type IN ('comment_added', 'comment_edited') AND comment IS NOT NULL
    `);

    // 5. Clean up comment column in task_activity for migrated records
    await queryRunner.query(`
      UPDATE "task_activity" SET comment = NULL WHERE entry_type IN ('comment_added', 'comment_edited')
    `);

    // 6. Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_task_comment_task_id" ON "task_comments" ("task_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_task_comment_parent_id" ON "task_comments" ("parent_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Revert task_activity comment updates (approximate rollback is not fully possible since we cleared task_activity comment,
    // but we can try to restore the text content from task_comments if task_comments still exists)
    await queryRunner.query(`
      UPDATE "task_activity" ta
      SET comment = substring(tc.content from 4 for length(tc.content) - 7)
      FROM "task_comments" tc
      WHERE ta.id = tc.id AND ta.entry_type IN ('comment_added', 'comment_edited')
    `);

    // 2. Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_task_comment_parent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_task_comment_task_id"`);

    // 3. Drop columns
    await queryRunner.query(`ALTER TABLE "task_attachments" DROP COLUMN IF EXISTS "source"`);

    // 4. Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "task_comment_reactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_comments"`);
  }
}
