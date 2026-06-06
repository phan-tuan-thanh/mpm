import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { Task } from './entities/task.entity';
import { Label } from './entities/label.entity';
import { Module as ModuleEntity } from './entities/module.entity';
import { TaskModule as TaskModuleEntity } from './entities/task-module.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskLink } from './entities/task-link.entity';
import { TaskRelation } from './entities/task-relation.entity';
import { TaskActivity } from './entities/task-activity.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { Project } from '../project/entities/project.entity';

import { TaskController } from './task.controller';
import { TaskQueryController } from './task-query.controller';
import { LabelController } from './label/label.controller';
import { WorkspaceLabelController } from './label/workspace-label.controller';
import { AttachmentController } from './attachment/attachment.controller';
import { LinkController } from './link/link.controller';
import { RelationController } from './relation/relation.controller';
import { CommentController } from './comment/comment.controller';
import { ModuleController, WorkspaceModuleController } from './module/module.controller';

import { TaskService } from './task.service';
import { TaskQueryService } from './task-query.service';
import { TaskCreateService } from './task-create.service';
import { TaskUpdateService } from './task-update.service';
import { TaskDeleteService } from './task-delete.service';
import { TaskOrderService } from './task-order.service';
import { ActivityService } from './activity/activity.service';
import { LabelService } from './label/label.service';
import { AttachmentService } from './attachment/attachment.service';
import { LinkService } from './link/link.service';
import { RelationService } from './relation/relation.service';
import { ModuleService } from './module/module.service';

import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Label,
      ModuleEntity,
      TaskModuleEntity,
      TaskAttachment,
      TaskLink,
      TaskRelation,
      TaskActivity,
      ProjectMember,
      User,
      Project,
    ]),
    MulterModule.register({
      storage: diskStorage({ destination: 'uploads/tmp' }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
    AuthModule, AuditModule,
  ],
  controllers: [
    TaskController,
    TaskQueryController,
    LabelController,
    WorkspaceLabelController,
    AttachmentController,
    LinkController,
    RelationController,
    CommentController,
    ModuleController,
    WorkspaceModuleController,
  ],
  providers: [
    TaskService,
    TaskQueryService,
    TaskCreateService,
    TaskUpdateService,
    TaskDeleteService,
    TaskOrderService,
    ActivityService,
    LabelService,
    AttachmentService,
    LinkService,
    RelationService,
    ModuleService,
  ],
  exports: [TaskService, ActivityService, LabelService],
})
export class TaskModule {}
