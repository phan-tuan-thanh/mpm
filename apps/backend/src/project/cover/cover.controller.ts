import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { CoverService } from './cover.service';

@Controller('api/projects/:projectId/cover')
export class CoverController {
  constructor(private readonly coverService: CoverService) {}

  @Post()
  @ProjectRoles('Scrum_Master')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const coverImageUrl = await this.coverService.upload(projectId, file);
    return { coverImageUrl };
  }

  @Delete()
  @ProjectRoles('Scrum_Master')
  async delete(@Param('projectId', ParseUUIDPipe) projectId: string) {
    await this.coverService.delete(projectId);
    return { success: true };
  }

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async getCover(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.coverService.getCoverPath(projectId);
    return res.sendFile(filePath);
  }
}
