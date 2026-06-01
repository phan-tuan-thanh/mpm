import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Tạo bảng users, project_members, invitations, audit_logs
 * cùng với các enum types và indexes cho module Authentication & Authorization.
 */
export class CreateAuthTables1706345600000 implements MigrationInterface {
  name = 'CreateAuthTables1706345600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Enable UUID extension ────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ─── Create Enum Types ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "system_role_enum" AS ENUM ('Admin', 'User')
    `);

    await queryRunner.query(`
      CREATE TYPE "project_role_enum" AS ENUM (
        'Scrum_Master',
        'Product_Owner',
        'Developer',
        'QA',
        'Stakeholder'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "invitation_status_enum" AS ENUM (
        'pending',
        'accepted',
        'expired',
        'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "audit_event_type_enum" AS ENUM (
        'login_success',
        'login_failed',
        'logout',
        'token_refresh',
        'token_refresh_failed',
        'token_theft_detected',
        'system_role_changed',
        'project_role_changed',
        'session_revoked',
        'all_sessions_revoked',
        'rate_limit_login',
        'rate_limit_refresh',
        'account_disabled',
        'account_enabled',
        'password_changed',
        'invitation_created',
        'invitation_accepted',
        'invitation_cancelled',
        'access_denied',
        'profile_updated'
      )
    `);

    // ─── Create Users Table ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "external_id" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "display_name" VARCHAR(100) NOT NULL,
        "avatar_url" VARCHAR(2048),
        "system_role" "system_role_enum" NOT NULL DEFAULT 'User',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      )
    `);

    // ─── Create Project Members Table ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "project_id" UUID NOT NULL,
        "project_role" "project_role_enum" NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_project_members" PRIMARY KEY ("id"),
        CONSTRAINT "fk_project_members_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ─── Create Invitations Table ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "project_role" "project_role_enum" NOT NULL,
        "token" VARCHAR(255) NOT NULL,
        "status" "invitation_status_enum" NOT NULL DEFAULT 'pending',
        "invited_by" UUID NOT NULL,
        "accepted_by" UUID,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "fk_invitations_invited_by" FOREIGN KEY ("invited_by")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_invitations_accepted_by" FOREIGN KEY ("accepted_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // ─── Create Audit Logs Table ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "event_type" "audit_event_type_enum" NOT NULL,
        "user_id" UUID,
        "ip_address" VARCHAR(45) NOT NULL,
        "user_agent" VARCHAR(512) NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "metadata" JSONB,
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // ─── Create Indexes ───────────────────────────────────────────────────────

    // User table indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_user_external_id" ON "users"("external_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_user_email" ON "users"("email")
    `);

    // Project Member table indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_project_member_unique" ON "project_members"("user_id", "project_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_project_member_project" ON "project_members"("project_id")
    `);

    // Invitation table indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_invitation_token" ON "invitations"("token")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_invitation_project_status" ON "invitations"("project_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_invitation_email_project" ON "invitations"("email", "project_id")
    `);

    // Audit Log table indexes
    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_user" ON "audit_logs"("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_event_type" ON "audit_logs"("event_type")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_timestamp" ON "audit_logs"("timestamp")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_log_composite" ON "audit_logs"("user_id", "event_type", "timestamp")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Drop Indexes ─────────────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_log_composite"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_log_timestamp"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_log_event_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_log_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invitation_email_project"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invitation_project_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invitation_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_member_project"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_member_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_external_id"`);

    // ─── Drop Tables ──────────────────────────────────────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // ─── Drop Enum Types ──────────────────────────────────────────────────────
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_event_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invitation_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "system_role_enum"`);
  }
}
