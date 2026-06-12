import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LabelService } from './label.service';

/**
 * Workspace Label Controller
 *
 * CRUD operations cho workspace-scoped labels.
 * Tất cả routes yêu cầu System Role = Admin (Workspace Admin).
 */
@Controller('api/workspaces/:workspaceId/labels')
@Roles('Admin')
export class WorkspaceLabelController {
  constructor(private readonly labelService: LabelService) {}

  /**
   * GET /api/workspaces/:workspaceId/labels
   * Trả về tất cả workspace-scoped labels
   */
  @Get()
  async findAll(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.labelService.findAllForWorkspace(workspaceId);
  }

  /**
   * POST /api/workspaces/:workspaceId/labels
   * Tạo workspace-scoped label mới
   */
  @Post()
  async create(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { name: string; colorLight: string; colorDark: string; isExclusive?: boolean; description?: string | null },
  ) {
    return this.labelService.create(body, {
      scope: 'workspace',
      workspaceId,
      projectId: null,
      userId: user.id,
    });
  }

  /**
   * PATCH /api/workspaces/:workspaceId/labels/:labelId
   * Cập nhật workspace label
   */
  @Patch(':labelId')
  async update(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: { name?: string; colorLight?: string; colorDark?: string; isExclusive?: boolean; description?: string | null },
  ) {
    return this.labelService.update(labelId, body, {
      workspaceId,
      userSystemRole: user.systemRole,
    });
  }

  /**
   * DELETE /api/workspaces/:workspaceId/labels/:labelId
   * Xóa workspace label — cascade xóa task_labels cross-project
   * Trả về { deletedLabelId, affectedTaskCount }
   */
  @Delete(':labelId')
  async delete(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.labelService.delete(labelId, {
      workspaceId,
      userId: user.id,
      userSystemRole: user.systemRole,
    });
  }
}
