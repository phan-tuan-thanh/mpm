import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuthEvent } from '../auth/constants/auth-events';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import type { ProjectListItem, ProjectRole, ProjectStatus } from '@mpm/shared-types';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo project mới
   *
   * Flow:
   * 1. Check trùng key
   * 2. INSERT project
   * 3. INSERT project_member (role Scrum_Master)
   * 4. Ghi audit log
   */
  async create(
    userId: string,
    dto: CreateProjectDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<Project> {
    const key = dto.key.toUpperCase();

    // 1. Kiểm tra duplicate key
    const existing = await this.projectRepository.findOne({
      where: { key },
    });

    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Project key "${key}" already exists`,
        errorCode: 'PROJECT_KEY_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Insert project (sử dụng transaction để đảm bảo cả project và owner member được tạo cùng nhau)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = queryRunner.manager.create(Project, {
        name: dto.name,
        key,
        description: dto.description ?? null,
        status: 'active',
        ownerId: userId,
        taskCounter: 0,
      });

      const savedProject = await queryRunner.manager.save(Project, project);

      // 3. Tự động assign Scrum_Master cho creator
      const projectMember = queryRunner.manager.create(ProjectMember, {
        userId,
        projectId: savedProject.id,
        projectRole: 'Scrum_Master',
      });

      await queryRunner.manager.save(ProjectMember, projectMember);

      await queryRunner.commitTransaction();

      // 4. Ghi audit log
      this.auditService.log(
        AuthEvent.PROJECT_CREATED,
        userId,
        ipAddress,
        userAgent,
        { projectId: savedProject.id },
      );

      return savedProject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Xem danh sách project có bộ lọc
   */
  async findAll(
    userId: string,
    query: { name?: string; status?: string; startDate?: string; endDate?: string },
    systemRole: string,
  ): Promise<ProjectListItem[]> {
    const queryBuilder = this.projectRepository.createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'member', 'member.userId = :userId', { userId });

    if (systemRole !== 'Admin') {
      // Normal user chỉ thấy project mình là member
      queryBuilder.innerJoin('project.members', 'm', 'm.userId = :userId', { userId });
    }

    if (query.name) {
      queryBuilder.andWhere('project.name ILIKE :name', { name: `%${query.name}%` });
    }

    if (query.status && query.status !== 'all') {
      queryBuilder.andWhere('project.status = :status', { status: query.status });
    }

    if (query.startDate) {
      queryBuilder.andWhere('project.createdAt >= :startDate', { startDate: new Date(query.startDate) });
    }

    if (query.endDate) {
      queryBuilder.andWhere('project.createdAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    queryBuilder.orderBy('project.createdAt', 'DESC');

    const projects = await queryBuilder.getMany();

    return projects.map((p) => {
      const member = p.members && p.members[0];
      const myRole = member ? member.projectRole : (systemRole === 'Admin' ? 'Scrum_Master' : null);
      return {
        id: p.id,
        name: p.name,
        key: p.key,
        status: p.status,
        myRole: myRole as ProjectRole,
        createdAt: p.createdAt,
      };
    });
  }

  /**
   * Xem chi tiết project theo ID
   */
  async findById(id: string, userId: string, systemRole: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember && systemRole !== 'Admin') {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    return project;
  }

  /**
   * Xem chi tiết project theo Key
   */
  async findByKey(key: string, userId: string, systemRole: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { key: key.toUpperCase() },
      relations: ['owner', 'members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember && systemRole !== 'Admin') {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    return project;
  }

  /**
   * Cập nhật thông tin project
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const userMember = project.members.find((m) => m.userId === userId);
    const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

    if (!isScrumMaster && systemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient project role. Only Scrum Master or Admin can perform this action.',
        errorCode: 'INSUFFICIENT_PROJECT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    if (dto.name !== undefined) {
      project.name = dto.name;
    }
    if (dto.description !== undefined) {
      project.description = dto.description ?? null;
    }

    const updated = await this.projectRepository.save(project);

    // Ghi audit log
    this.auditService.log(
      AuthEvent.PROJECT_UPDATED,
      userId,
      ipAddress,
      userAgent,
      { projectId: id },
    );

    return updated;
  }

  /**
   * Archive project
   */
  async archive(
    id: string,
    userId: string,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const userMember = project.members.find((m) => m.userId === userId);
    const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

    if (!isScrumMaster && systemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient project role. Only Scrum Master or Admin can perform this action.',
        errorCode: 'INSUFFICIENT_PROJECT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    project.status = 'archived';
    project.archivedAt = new Date();
    const updated = await this.projectRepository.save(project);

    // Ghi audit log
    this.auditService.log(
      AuthEvent.PROJECT_ARCHIVED,
      userId,
      ipAddress,
      userAgent,
      { projectId: id },
    );

    return updated;
  }

  /**
   * Xóa project vĩnh viễn
   */
  async delete(
    id: string,
    userId: string,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const userMember = project.members.find((m) => m.userId === userId);
    const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

    if (!isScrumMaster && systemRole !== 'Admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient project role. Only Scrum Master or Admin can perform this action.',
        errorCode: 'INSUFFICIENT_PROJECT_ROLE',
        timestamp: new Date().toISOString(),
      });
    }

    await this.projectRepository.remove(project);

    // Ghi audit log
    this.auditService.log(
      AuthEvent.PROJECT_DELETED,
      userId,
      ipAddress,
      userAgent,
      { projectId: id },
    );
  }

  /**
   * Bulk delete nhiều projects
   */
  async bulkDelete(
    ids: string[],
    userId: string,
    systemRole: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ deleted: string[]; failed: { id: string; reason: string }[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deleted: string[] = [];
      for (const id of ids) {
        const project = await queryRunner.manager.findOne(Project, {
          where: { id },
          relations: ['members'],
        });

        if (!project) {
          throw new Error(`Project ${id} not found`);
        }

        const userMember = project.members.find((m) => m.userId === userId);
        const isScrumMaster = userMember?.projectRole === 'Scrum_Master';

        if (!isScrumMaster && systemRole !== 'Admin') {
          throw new Error(`Project ${id} - Insufficient project role`);
        }

        await queryRunner.manager.remove(Project, project);

        // Ghi audit log
        this.auditService.log(
          AuthEvent.PROJECT_DELETED,
          userId,
          ipAddress,
          userAgent,
          { projectId: id },
        );

        deleted.push(id);
      }

      await queryRunner.commitTransaction();
      return { deleted, failed: [] };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        deleted: [],
        failed: ids.map((id) => ({
          id,
          reason: error.message || 'Unknown error during bulk delete',
        })),
      };
    } finally {
      await queryRunner.release();
    }
  }
}
