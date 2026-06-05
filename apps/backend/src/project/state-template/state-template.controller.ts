import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { StateTemplateService } from './state-template.service';
import { CreateStateDto, UpdateStateDto } from '@mpm/shared-types';

/**
 * State Template Controller
 *
 * CRUD + apply cho workspace-scoped state templates.
 * - GET: any authenticated user (workspace member) — JwtAuth guard xử lý ở global level
 * - POST/PATCH/DELETE/apply: yêu cầu System Role = Admin (Workspace Admin)
 */
@Controller('api/workspaces/:workspaceId/state-templates')
export class StateTemplateController {
  constructor(private readonly stateTemplateService: StateTemplateService) {}

  /**
   * GET /api/workspaces/:workspaceId/state-templates
   * Trả về tất cả state templates của workspace, sắp xếp theo order
   */
  @Get()
  async findAll(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.stateTemplateService.findAll(workspaceId);
  }

  /**
   * POST /api/workspaces/:workspaceId/state-templates
   * Tạo state template mới — Admin only
   */
  @Post()
  @Roles('Admin')
  async create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateStateDto,
  ) {
    return this.stateTemplateService.create(workspaceId, user.id, dto);
  }

  /**
   * PATCH /api/workspaces/:workspaceId/state-templates/:templateId
   * Cập nhật state template — Admin only
   */
  @Patch(':templateId')
  @Roles('Admin')
  async update(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: UpdateStateDto,
  ) {
    return this.stateTemplateService.update(templateId, workspaceId, dto);
  }

  /**
   * DELETE /api/workspaces/:workspaceId/state-templates/:templateId
   * Xóa state template — Admin only
   * ON DELETE SET NULL xử lý project_states.template_id tự động
   */
  @Delete(':templateId')
  @Roles('Admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    await this.stateTemplateService.delete(templateId, workspaceId);
  }

  /**
   * POST /api/workspaces/:workspaceId/state-templates/apply/:projectId
   * Apply (merge) workspace templates vào project đang tồn tại — Admin only
   * Chỉ thêm states chưa có (so sánh theo template_id), không xóa states hiện tại
   */
  @Post('apply/:projectId')
  @Roles('Admin')
  async applyToProject(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.stateTemplateService.applyToProject(workspaceId, projectId);
  }
}
