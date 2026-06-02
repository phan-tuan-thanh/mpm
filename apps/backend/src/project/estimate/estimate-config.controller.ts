import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../../auth/decorators/project-roles.decorator';
import { EstimateConfigService } from './estimate-config.service';
import { UpdateEstimateConfigDto } from '@mpm/shared-types';

@Controller('api/projects/:projectId/estimate-config')
export class EstimateConfigController {
  constructor(private readonly estimateService: EstimateConfigService) {}

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async getConfig(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.estimateService.getConfig(projectId);
  }

  @Patch()
  @ProjectRoles('Scrum_Master')
  async updateConfig(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateEstimateConfigDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';
    return this.estimateService.updateConfig(
      projectId,
      user.id,
      dto,
      ipAddress,
      userAgent,
    );
  }

  private extractIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
