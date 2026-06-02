import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectState } from './entities/project-state.entity';
import { ProjectEstimateConfig } from './entities/project-estimate-config.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { Task } from '../task/entities/task.entity';

import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

import { ProjectMemberController } from './members/project-member.controller';
import { ProjectMemberService } from './members/project-member.service';

import { ProjectStateController } from './state/project-state.controller';
import { ProjectStateService } from './state/project-state.service';

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
      ProjectMember,
      User,
      Task,
    ]),
    AuthModule,
    AuditModule,
  ],
  controllers: [
    ProjectController,
    ProjectMemberController,
    ProjectStateController,
    EstimateConfigController,
    CoverController,
  ],
  providers: [
    ProjectService,
    ProjectMemberService,
    ProjectStateService,
    EstimateConfigService,
    CoverService,
  ],
  exports: [
    ProjectService,
    ProjectMemberService,
    ProjectStateService,
    EstimateConfigService,
    CoverService,
  ],
})
export class ProjectModule {}
