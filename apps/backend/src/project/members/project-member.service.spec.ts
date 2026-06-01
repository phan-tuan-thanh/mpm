import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectMemberService } from './project-member.service';
import { ProjectMember } from '../../auth/entities/project-member.entity';
import { User } from '../../auth/entities/user.entity';
import { SessionService } from '../../auth/session.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';

describe('ProjectMemberService', () => {
  let service: ProjectMemberService;
  let projectMemberRepo: any;
  let userRepo: any;
  let sessionService: any;
  let auditService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectMemberService,
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            create: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            revokeAllSessions: jest.fn(),
            addToForcedLogout: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectMemberService>(ProjectMemberService);
    projectMemberRepo = module.get(getRepositoryToken(ProjectMember));
    userRepo = module.get(getRepositoryToken(User));
    sessionService = module.get(SessionService);
    auditService = module.get(AuditService);
  });

  describe('addMember', () => {
    it('should add a member successfully and force logout/revoke sessions of the target user', async () => {
      const mockUser = { id: 'target-user-id', email: 'test@example.com', displayName: 'Test User' };
      userRepo.findOne.mockResolvedValue(mockUser);
      projectMemberRepo.findOne.mockResolvedValue(null);
      projectMemberRepo.create.mockImplementation((dto: any) => dto);
      projectMemberRepo.save.mockImplementation((dto: any) => Promise.resolve({ id: 'pm-id', ...dto, createdAt: new Date() }));

      const result = await service.addMember('p1', 'actor-id', { email: 'test@example.com', projectRole: 'Developer' }, '127.0.0.1', 'Mozilla');

      expect(result).toBeDefined();
      expect(result.userId).toBe('target-user-id');
      expect(result.projectRole).toBe('Developer');
      expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('target-user-id');
      expect(sessionService.addToForcedLogout).toHaveBeenCalledWith('target-user-id');
      expect(auditService.log).toHaveBeenCalledWith(
        'member_added',
        'actor-id',
        '127.0.0.1',
        'Mozilla',
        { projectId: 'p1', targetUserId: 'target-user-id' },
      );
    });

    it('should throw NotFoundException if user email does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addMember('p1', 'actor-id', { email: 'unknown@example.com', projectRole: 'Developer' }, '127.0.0.1', 'Mozilla')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already a project member', async () => {
      const mockUser = { id: 'target-user-id', email: 'test@example.com' };
      userRepo.findOne.mockResolvedValue(mockUser);
      projectMemberRepo.findOne.mockResolvedValue({ id: 'pm-id' });

      await expect(
        service.addMember('p1', 'actor-id', { email: 'test@example.com', projectRole: 'Developer' }, '127.0.0.1', 'Mozilla')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changeRole', () => {
    it('should change member role successfully', async () => {
      const mockMember = {
        userId: 'target-user-id',
        projectRole: 'Developer',
        user: { displayName: 'Name', email: 'email@example.com', avatarUrl: null },
      };
      projectMemberRepo.findOne.mockResolvedValue(mockMember);
      projectMemberRepo.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.changeRole('p1', 'target-user-id', 'actor-id', { projectRole: 'QA' }, '127.0.0.1', 'Mozilla');

      expect(result.projectRole).toBe('QA');
      expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('target-user-id');
      expect(sessionService.addToForcedLogout).toHaveBeenCalledWith('target-user-id');
    });

    it('should throw UnprocessableEntityException when trying to demote the last Scrum_Master', async () => {
      const mockMember = {
        userId: 'target-user-id',
        projectRole: 'Scrum_Master',
        user: { displayName: 'Name', email: 'email@example.com' },
      };
      projectMemberRepo.findOne.mockResolvedValue(mockMember);
      projectMemberRepo.count.mockResolvedValue(1); // Only 1 SM left

      await expect(
        service.changeRole('p1', 'target-user-id', 'actor-id', { projectRole: 'Developer' }, '127.0.0.1', 'Mozilla')
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      const mockMember = { userId: 'target-user-id', projectRole: 'Developer' };
      projectMemberRepo.findOne.mockResolvedValue(mockMember);
      projectMemberRepo.remove.mockResolvedValue(mockMember);

      await service.removeMember('p1', 'target-user-id', 'actor-id', '127.0.0.1', 'Mozilla');

      expect(projectMemberRepo.remove).toHaveBeenCalled();
      expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('target-user-id');
      expect(sessionService.addToForcedLogout).toHaveBeenCalledWith('target-user-id');
    });

    it('should throw UnprocessableEntityException when trying to remove the last Scrum_Master', async () => {
      const mockMember = { userId: 'target-user-id', projectRole: 'Scrum_Master' };
      projectMemberRepo.findOne.mockResolvedValue(mockMember);
      projectMemberRepo.count.mockResolvedValue(1);

      await expect(
        service.removeMember('p1', 'target-user-id', 'actor-id', '127.0.0.1', 'Mozilla')
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
