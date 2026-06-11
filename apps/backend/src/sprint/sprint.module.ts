import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Sprint } from './entities/sprint.entity';
import { SprintMemberCapacity } from './entities/sprint-member-capacity.entity';
import { SprintSnapshot } from './entities/sprint-snapshot.entity';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { AuthModule } from '../auth/auth.module';
import { SprintController } from './sprint.controller';
import { SprintService } from './sprint.service';
import { CapacityService } from './capacity.service';
import { SnapshotService } from './snapshot.service';
import { SnapshotCronJob } from './snapshot.cron';
import { VelocityService } from './velocity.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sprint,
      SprintMemberCapacity,
      SprintSnapshot,
      Project,
      Task,
      ProjectMember,
    ]),
    AuthModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [SprintController],
  providers: [
    SprintService,
    CapacityService,
    SnapshotService,
    SnapshotCronJob,
    VelocityService,
  ],
  exports: [SprintService, CapacityService, SnapshotService, VelocityService],
})
export class SprintModule {}
