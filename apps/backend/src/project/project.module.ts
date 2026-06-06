import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectState } from './entities/project-state.entity';
import { ProjectEstimateConfig } from './entities/project-estimate-config.entity';
import { WorkspaceStateTemplate } from './entities/workspace-state-template.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { Task } from '../task/entities/task.entity';

import { ProjectController } from './project.controller';
import { ProjectQueryController } from './project-query.controller';
import { ProjectService } from './project.service';
import { ProjectCreateService } from './project-create.service';
import { ProjectQueryService } from './project-query.service';
import { ProjectUpdateService } from './project-update.service';
import { ProjectDeleteService } from './project-delete.service';

import { ProjectMemberController } from './members/project-member.controller';
import { ProjectMemberService } from './members/project-member.service';

import { ProjectStateController } from './state/project-state.controller';
import { ProjectStateService } from './state/project-state.service';

import { StateTemplateController } from './state-template/state-template.controller';
import { StateTemplateService } from './state-template/state-template.service';

import { EstimateConfigController } from './estimate/estimate-config.controller';
import { EstimateConfigService } from './estimate/estimate-config.service';

import { CoverController } from './cover/cover.controller';
import { CoverService } from './cover/cover.service';

import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectState,
      ProjectEstimateConfig,
      WorkspaceStateTemplate,
      ProjectMember,
      User,
      Task,
    ]),
    AuthModule,
    AuditModule,
  ],
  controllers: [
    ProjectController,
    ProjectQueryController,
    ProjectMemberController,
    ProjectStateController,
    StateTemplateController,
    EstimateConfigController,
    CoverController,
  ],
  providers: [
    ProjectService,
    ProjectCreateService,
    ProjectQueryService,
    ProjectUpdateService,
    ProjectDeleteService,
    ProjectMemberService,
    ProjectStateService,
    StateTemplateService,
    EstimateConfigService,
    CoverService,
  ],
  exports: [
    ProjectService,
    ProjectCreateService,
    ProjectQueryService,
    ProjectUpdateService,
    ProjectDeleteService,
    ProjectMemberService,
    ProjectStateService,
    StateTemplateService,
    EstimateConfigService,
    CoverService,
  ],
})
export class ProjectModule {}
