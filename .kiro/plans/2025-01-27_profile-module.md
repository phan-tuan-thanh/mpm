# Plan: Task 8.1 — Implement Profile Service và Controller

## Task ID
8.1 Implement Profile Service và Controller

## Approach
Tạo Profile module theo NestJS module pattern, bao gồm:
- ProfileModule: register providers, imports TypeORM User entity
- ProfileService: business logic cho get/update profile
- ProfileController: REST endpoints GET/PATCH /api/profile
- DTOs: UpdateProfileDto (class-validator), ProfileResponseDto

## Files to Create
1. `apps/backend/src/profile/dto/update-profile.dto.ts`
2. `apps/backend/src/profile/dto/profile-response.dto.ts`
3. `apps/backend/src/profile/profile.service.ts`
4. `apps/backend/src/profile/profile.controller.ts`
5. `apps/backend/src/profile/profile.module.ts`

## Acceptance Criteria (from Requirements 6.1-6.5)
- GET /api/profile: trả về display_name, email, avatar_url, system_role, danh sách projects + roles
- PATCH /api/profile: update display_name (1-100 chars) và/hoặc avatar_url (http/https, max 2048)
- Validate: display_name @Length(1, 100), avatar_url @IsUrl + @MaxLength(2048)
- HTTP 400 với field-level errors cho invalid input
- Skip DB write nếu không có thay đổi so với data hiện tại
- Return profile đã cập nhật sau update

## Dependencies
- User entity (exists): `apps/backend/src/auth/entities/user.entity.ts`
- ProjectMember entity (exists): `apps/backend/src/auth/entities/project-member.entity.ts`
- @CurrentUser() decorator (exists): `apps/backend/src/auth/decorators/current-user.decorator.ts`
- RequestUser interface (exists in current-user.decorator.ts)
- TypeORM Repository pattern
- class-validator + class-transformer

## Key Design Decisions
- Use TypeORM Repository<User> for data access
- Load user with projectMembers relation for GET profile
- Compare fields before writing to skip unnecessary DB writes
- Use class-validator IsOptional() for PATCH partial updates
- Return consistent ProfileResponseDto shape
