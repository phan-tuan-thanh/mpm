import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { Task } from './entities/task.entity';
import { Label } from './entities/label.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskLink } from './entities/task-link.entity';
import { TaskRelation } from './entities/task-relation.entity';
import { TaskActivity } from './entities/task-activity.entity';

import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';

import { TaskController } from './task.controller';
import { AttachmentController } from './attachment/attachment.controller';
import { LinkController } from './link/link.controller';
import { RelationController } from './relation/relation.controller';
import { CommentController } from './comment/comment.controller';

import { TaskService } from './task.service';
import { ActivityService } from './activity/activity.service';
import { LabelService } from './label/label.service';
import { AttachmentService } from './attachment/attachment.service';
import { LinkService } from './link/link.service';
import { RelationService } from './relation/relation.service';

import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      Label,
      TaskAttachment,
      TaskLink,
      TaskRelation,
      TaskActivity,
      ProjectMember,
      User,
    ]),
    MulterModule.register({
      storage: diskStorage({ destination: 'uploads/tmp' }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
    AuthModule,
    AuditModule,
  ],
  controllers: [
    TaskController,
    AttachmentController,
    LinkController,
    RelationController,
    CommentController,
  ],
  providers: [
    TaskService,
    ActivityService,
    LabelService,
    AttachmentService,
    LinkService,
    RelationService,
  ],
  exports: [
    TaskService,
    ActivityService,
    LabelService,
  ],
})
export class TaskModule {}
