import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from './entities/user.entity';
import { ProjectMember } from './entities/project-member.entity';

// Services
import { AuthService } from './auth.service';
import { AuthOAuthService } from './auth-oauth.service';
import { AuthTokenService } from './auth-token.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { AuthentikService } from './authentik.service';
import { UserProvisionService } from './user-provision.service';

// Controllers
import { AuthController } from './auth.controller';
import { AuthSessionController } from './auth-session.controller';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ProjectRolesGuard } from './guards/project-roles.guard';

// Middleware
import {
  SecurityHeadersMiddleware,
  CorsMiddleware,
  HttpsRedirectMiddleware,
} from './middleware';

// Sub-modules
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Auth Module — module chính wire tất cả authentication/authorization components
 *
 * Chịu trách nhiệm:
 * - Register global JwtAuthGuard (APP_GUARD) — bảo vệ mọi endpoint mặc định
 * - Register RolesGuard và ProjectRolesGuard (APP_GUARD) — decorator-based authorization
 * - Configure middleware: SecurityHeaders, CORS, HTTPS Redirect cho all routes
 * - Import TypeORM entities (User, ProjectMember), ConfigModule, HttpModule
 * - Export TokenService, SessionService cho các module khác sử dụng
 *
 * Guard execution order (NestJS APP_GUARD):
 * 1. JwtAuthGuard — xác thực token (hoặc bypass nếu @Public())
 * 2. RolesGuard — kiểm tra System Role (nếu có @Roles())
 * 3. ProjectRolesGuard — kiểm tra Project Role (nếu có @ProjectRoles())
 *
 * Validates: Requirements 8.1, 8.9
 */
@Module({
  imports: [
    // TypeORM entities cho auth domain
    TypeOrmModule.forFeature([User, ProjectMember]),

    // Configuration module — đọc environment variables
    ConfigModule,

    // HTTP module — gọi Authentik API (token exchange, end-session)
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),

    // Rate limiting cho auth endpoints
    RateLimitModule,

    // Audit logging
    AuditModule,
  ],
  controllers: [AuthController, AuthSessionController],
  providers: [
    // Core services
    AuthService,
    AuthOAuthService,
    AuthTokenService,
    TokenService,
    SessionService,
    AuthentikService,
    UserProvisionService,

    // Guards registered as APP_GUARD — áp dụng globally
    // Thứ tự đăng ký quyết định thứ tự thực thi
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ProjectRolesGuard,
    },
  ],
  exports: [
    // Export cho các module khác sử dụng
    TokenService,
    SessionService,
    AuthService,
  ],
})
export class AuthModule implements NestModule {
  /**
   * Configure middleware cho tất cả routes
   *
   * Thứ tự middleware:
   * 1. HttpsRedirectMiddleware — redirect HTTP → HTTPS (production only)
   * 2. SecurityHeadersMiddleware — thêm security headers vào mọi response
   * 3. CorsMiddleware — validate Origin và set CORS headers
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        HttpsRedirectMiddleware,
        SecurityHeadersMiddleware,
        CorsMiddleware,
      )
      .forRoutes('*');
  }
}
