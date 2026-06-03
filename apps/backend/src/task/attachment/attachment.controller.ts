import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { AttachmentService } from './attachment.service';

@Controller('api/projects/:projectId/tasks/:taskId/attachments')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.attachmentService.upload(taskId, projectId, user.id, file);
  }

  @Get(':attachmentId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async download(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.attachmentService.getFile(attachmentId);
    const absolutePath = path.resolve(attachment.storagePath);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.sendFile(absolutePath);
  }

  @Delete(':attachmentId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  async delete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const callerRole = user.systemRole === 'Admin'
      ? 'Admin'
      : user.projectRoles?.find((r) => r.projectId === projectId)?.role;
    await this.attachmentService.delete(attachmentId, user.id, callerRole);
    return { ok: true };
  }
}
