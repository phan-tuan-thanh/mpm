import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

/**
 * Audit Module — ghi và truy vấn audit log cho authentication events
 *
 * Cung cấp:
 * - AuditService.log() — non-blocking write (fire-and-forget)
 * - GET /api/admin/audit-logs — Admin-only query endpoint
 *
 * Dependencies:
 * - TypeORM: AuditLog entity (bảng audit_logs)
 * - JWT Auth Guard (global) — bảo vệ endpoints
 * - Roles Guard — kiểm tra Admin role
 *
 * Exports:
 * - AuditService: cho các module khác gọi log() khi cần ghi audit
 *   (AuthService, RolesGuard, ProjectRolesGuard, RateLimitService, etc.)
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
