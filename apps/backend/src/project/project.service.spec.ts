import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepo: any;
  let projectMemberRepo: any;
  let userRepo: any;
  let auditService: any;
  let dataSource: any;
  let queryRunner: any;

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn().mockImplementation((entity, data) => data),
        save: jest.fn().mockImplementation((entity, data) => Promise.resolve({ id: 'new-project-id', ...data })),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepo = module.get(getRepositoryToken(Project));
    projectMemberRepo = module.get(getRepositoryToken(ProjectMember));
    userRepo = module.get(getRepositoryToken(User));
    auditService = module.get(AuditService);
  });

  describe('create', () => {
    it('should create a project and assign owner as Scrum_Master', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      const dto = { name: 'Test Project', key: 'TEST', description: 'A test project' };
      const project = await service.create('user-id', dto, '127.0.0.1', 'Mozilla');

      expect(project).toBeDefined();
      expect(project.name).toBe(dto.name);
      expect(project.key).toBe(dto.key);
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        'project_created',
        'user-id',
        '127.0.0.1',
        'Mozilla',
        { projectId: 'new-project-id' },
      );
    });

    it('should throw ConflictException if project key already exists', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'existing-id', key: 'TEST' });

      const dto = { name: 'Test Project', key: 'TEST' };
      await expect(service.create('user-id', dto, '127.0.0.1', 'Mozilla')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should query projects and return list with roles', async () => {
      const mockProjects = [
        {
          id: 'p1',
          name: 'Project 1',
          key: 'P1',
          status: 'active',
          createdAt: new Date(),
          members: [{ userId: 'user-id', projectRole: 'Scrum_Master' }],
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockProjects),
      };

      projectRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll('user-id', {}, 'User');
      expect(result).toHaveLength(1);
      expect(result[0].myRole).toBe('Scrum_Master');
    });
  });

  describe('findById / findByKey', () => {
    it('should find project if user is a member', async () => {
      const mockProject = {
        id: 'p1',
        name: 'Project 1',
        key: 'P1',
        status: 'active',
        members: [{ userId: 'user-id', projectRole: 'Developer' }],
      };
      projectRepo.findOne.mockResolvedValue(mockProject);

      const result = await service.findById('p1', 'user-id', 'User');
      expect(result).toBeDefined();
      expect(result.id).toBe('p1');
    });

    it('should throw NotFoundException if user is not member and not admin', async () => {
      const mockProject = {
        id: 'p1',
        name: 'Project 1',
        key: 'P1',
        status: 'active',
        members: [{ userId: 'other-user', projectRole: 'Developer' }],
      };
      projectRepo.findOne.mockResolvedValue(mockProject);

      await expect(service.findById('p1', 'user-id', 'User')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project name and description if Scrum_Master', async () => {
      const mockProject = {
        id: 'p1',
        name: 'Old Name',
        members: [{ userId: 'user-id', projectRole: 'Scrum_Master' }],
      };
      projectRepo.findOne.mockResolvedValue(mockProject);
      projectRepo.save.mockImplementation((p: any) => Promise.resolve(p));

      const result = await service.update(
        'p1',
        'user-id',
        { name: 'New Name' },
        'User',
        '127.0.0.1',
        'Mozilla',
      );
      expect(result.name).toBe('New Name');
      expect(auditService.log).toHaveBeenCalledWith(
        'project_updated',
        'user-id',
        '127.0.0.1',
        'Mozilla',
        { projectId: 'p1' },
      );
    });

    it('should throw ForbiddenException if user is not Scrum_Master or Admin', async () => {
      const mockProject = {
        id: 'p1',
        name: 'Old Name',
        members: [{ userId: 'user-id', projectRole: 'Developer' }],
      };
      projectRepo.findOne.mockResolvedValue(mockProject);

      await expect(
        service.update('p1', 'user-id', { name: 'New' }, 'User', '127', 'M'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
