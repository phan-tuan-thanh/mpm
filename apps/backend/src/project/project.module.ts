import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectMemberController } from './members/project-member.controller';
import { ProjectMemberService } from './members/project-member.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, User]),
    AuthModule,
    AuditModule,
  ],
  controllers: [ProjectController, ProjectMemberController],
  providers: [ProjectService, ProjectMemberService],
  exports: [ProjectService, ProjectMemberService],
})
export class ProjectModule {}
