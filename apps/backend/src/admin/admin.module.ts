import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { SessionService } from '../auth/session.service';
import { AuditModule } from '../audit/audit.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * Admin Module — quản trị user (system role, disable account)
 *
 * Cung cấp:
 * - GET  /api/admin/users          — List all users
 * - PATCH /api/admin/users/:id/role — Change system role
 * - POST /api/admin/users/:id/disable — Disable account
 *
 * Dependencies:
 * - TypeORM: User entity (bảng users)
 * - SessionService: Thu hồi sessions khi thay đổi role/disable
 * - AuditModule: Ghi audit log cho admin actions
 * - JWT Auth Guard (global) + RolesGuard: Bảo vệ endpoints (Admin only)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, SessionService],
  exports: [AdminService],
})
export class AdminModule {}
