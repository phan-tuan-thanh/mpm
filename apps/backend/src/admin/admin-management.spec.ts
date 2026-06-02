import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { AdminService } from './admin.service';
import { ProjectMemberService } from '../project/members/project-member.service';
import { ProjectService } from '../project/project.service';
import { User } from '../auth/entities/user.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../auth/session.service';
import { ProjectRolesGuard } from '../auth/guards/project-roles.guard';
import { Reflector } from '@nestjs/core';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProjectRole } from '@mpm/shared-types';

describe('Admin Management & Project Member Bootstrap Integration Tests (Epic D)', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let adminService: AdminService;
  let projectMemberService: ProjectMemberService;
  let projectService: ProjectService;
  let sessionService: SessionService;
  let configService: ConfigService;
  let reflector: Reflector;

  let userRepo: Repository<User>;
  let projectRepo: Repository<Project>;
  let memberRepo: Repository<ProjectMember>;

  let testAdmin: User;
  let testUser: User;
  let testProject: Project;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    adminService = moduleRef.get<AdminService>(AdminService);
    projectMemberService = moduleRef.get<ProjectMemberService>(ProjectMemberService);
    projectService = moduleRef.get<ProjectService>(ProjectService);
    sessionService = moduleRef.get<SessionService>(SessionService);
    configService = moduleRef.get<ConfigService>(ConfigService);
    reflector = moduleRef.get<Reflector>(Reflector);

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepo = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    memberRepo = moduleRef.get<Repository<ProjectMember>>(getRepositoryToken(ProjectMember));

    // Seed an admin user
    testAdmin = await userRepo.findOne({ where: { email: 'admin-spec@demo.local' } }) ||
      await userRepo.save(userRepo.create({
        email: 'admin-spec@demo.local',
        displayName: 'Spec Admin',
        externalId: 'spec-admin-ext',
        systemRole: 'Admin',
        isActive: true,
      }));

    // Seed a standard user
    testUser = await userRepo.findOne({ where: { email: 'user-spec@demo.local' } }) ||
      await userRepo.save(userRepo.create({
        email: 'user-spec@demo.local',
        displayName: 'Spec User',
        externalId: 'spec-user-ext',
        systemRole: 'User',
        isActive: true,
      }));

    const randKey = ('AD' + Math.random().toString(36).substring(2, 5).toUpperCase()).substring(0, 5);
    // Seed a project
    testProject = await projectRepo.save(projectRepo.create({
      name: 'Spec Project',
      key: randKey,
      leadId: testAdmin.id,
      ownerId: testAdmin.id,
    }));
  });

  afterAll(async () => {
    try {
      if (testProject) {
        const members = await memberRepo.find({ where: { projectId: testProject.id } });
        if (members.length > 0) {
          await memberRepo.remove(members);
        }
        await projectRepo.remove(testProject);
      }
      if (testAdmin) {
        await userRepo.remove(testAdmin);
      }
      if (testUser) {
        await userRepo.remove(testUser);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  // P1: INITIAL_ADMIN_EMAIL — new user
  it('P1: INITIAL_ADMIN_EMAIL - new user matching INITIAL_ADMIN_EMAIL gets systemRole Admin', async () => {
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'INITIAL_ADMIN_EMAIL') return 'p1-admin@demo.local';
      return undefined;
    });

    const claims = {
      sub: 'p1-ext-id',
      email: 'p1-admin@demo.local',
      name: 'P1 Admin User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const user = await authService['upsertUser'](claims);
    expect(user.systemRole).toBe('Admin');

    // Clean up
    await userRepo.remove(user);
    jest.restoreAllMocks();
  });

  // P2: INITIAL_ADMIN_EMAIL — existing user
  it('P2: INITIAL_ADMIN_EMAIL - existing user matching INITIAL_ADMIN_EMAIL does not change systemRole', async () => {
    const existing = await userRepo.save(userRepo.create({
      email: 'p2-user@demo.local',
      displayName: 'P2 Existing',
      externalId: 'p2-ext-id',
      systemRole: 'User',
    }));

    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'INITIAL_ADMIN_EMAIL') return 'p2-user@demo.local';
      return undefined;
    });

    const claims = {
      sub: 'p2-ext-id',
      email: 'p2-user@demo.local',
      name: 'P2 Existing',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const user = await authService['upsertUser'](claims);
    expect(user.systemRole).toBe('User'); // Role remains 'User'

    // Clean up
    await userRepo.remove(existing);
    jest.restoreAllMocks();
  });

  // P3: INITIAL_ADMIN_EMAIL — case insensitive
  it('P3: INITIAL_ADMIN_EMAIL - case insensitive matching works', async () => {
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'INITIAL_ADMIN_EMAIL') return 'P3-AdMiN@dEmO.lOcAl';
      return undefined;
    });

    const claims = {
      sub: 'p3-ext-id',
      email: 'p3-admin@demo.local',
      name: 'P3 Case Insensitive',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const user = await authService['upsertUser'](claims);
    expect(user.systemRole).toBe('Admin');

    // Clean up
    await userRepo.remove(user);
    jest.restoreAllMocks();
  });

  // P4: INITIAL_ADMIN_EMAIL — not set
  it('P4: INITIAL_ADMIN_EMAIL - new user when INITIAL_ADMIN_EMAIL is not set gets systemRole User', async () => {
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'INITIAL_ADMIN_EMAIL') return undefined;
      return undefined;
    });

    const claims = {
      sub: 'p4-ext-id',
      email: 'p4-user@demo.local',
      name: 'P4 Normal User',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    const user = await authService['upsertUser'](claims);
    expect(user.systemRole).toBe('User');

    // Clean up
    await userRepo.remove(user);
    jest.restoreAllMocks();
  });

  // P5: Add member — valid
  it('P5: Add member - valid user added to project successfully', async () => {
    const memberUser = await userRepo.save(userRepo.create({
      email: 'p5-member@demo.local',
      displayName: 'P5 Member',
      externalId: 'p5-member-ext',
      systemRole: 'User',
    }));

    const result = await projectMemberService.addMember(
      testProject.id,
      testAdmin.id,
      { email: 'p5-member@demo.local', projectRole: 'Developer' },
      '127.0.0.1',
      'spec-agent',
    );

    expect(result.userId).toBe(memberUser.id);
    expect(result.projectRole).toBe('Developer');

    // Clean up
    const memberRow = await memberRepo.findOne({ where: { projectId: testProject.id, userId: memberUser.id } });
    if (memberRow) {
      await memberRepo.remove(memberRow);
    }
    await userRepo.remove(memberUser);
  });

  // P6: Add member — email not found
  it('P6: Add member - email not found throws 404', async () => {
    await expect(
      projectMemberService.addMember(
        testProject.id,
        testAdmin.id,
        { email: 'notfound-spec@demo.local', projectRole: 'Developer' },
        '127.0.0.1',
        'spec-agent',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  // P7: Add member — duplicate
  it('P7: Add member - duplicate user throws 409', async () => {
    const memberUser = await userRepo.save(userRepo.create({
      email: 'p7-member@demo.local',
      displayName: 'P7 Member',
      externalId: 'p7-member-ext',
      systemRole: 'User',
    }));

    // First add
    await projectMemberService.addMember(
      testProject.id,
      testAdmin.id,
      { email: 'p7-member@demo.local', projectRole: 'Developer' },
      '127.0.0.1',
      'spec-agent',
    );

    // Second add (duplicate)
    await expect(
      projectMemberService.addMember(
        testProject.id,
        testAdmin.id,
        { email: 'p7-member@demo.local', projectRole: 'Developer' },
        '127.0.0.1',
        'spec-agent',
      ),
    ).rejects.toThrow(ConflictException);

    // Clean up
    const memberRow = await memberRepo.findOne({ where: { projectId: testProject.id, userId: memberUser.id } });
    if (memberRow) {
      await memberRepo.remove(memberRow);
    }
    await userRepo.remove(memberUser);
  });

  // P8: Change role — last scrum master
  it('P8: Change role - demoting last scrum master throws 422', async () => {
    const smUser = await userRepo.save(userRepo.create({
      email: 'p8-sm@demo.local',
      displayName: 'P8 SM',
      externalId: 'p8-sm-ext',
      systemRole: 'User',
    }));

    // Add as Scrum Master
    await projectMemberService.addMember(
      testProject.id,
      testAdmin.id,
      { email: 'p8-sm@demo.local', projectRole: 'Scrum_Master' },
      '127.0.0.1',
      'spec-agent',
    );

    // Try to demote smUser (he is the only Scrum Master in testProject)
    await expect(
      projectMemberService.changeRole(
        testProject.id,
        smUser.id,
        testAdmin.id,
        { projectRole: 'Developer' },
        '127.0.0.1',
        'spec-agent',
      ),
    ).rejects.toThrow(UnprocessableEntityException);

    // Clean up
    const memberRow = await memberRepo.findOne({ where: { projectId: testProject.id, userId: smUser.id } });
    if (memberRow) {
      await memberRepo.remove(memberRow);
    }
    await userRepo.remove(smUser);
  });

  // P9: Remove member — last scrum master
  it('P9: Remove member - removing last scrum master throws 422', async () => {
    const smUser = await userRepo.save(userRepo.create({
      email: 'p9-sm@demo.local',
      displayName: 'P9 SM',
      externalId: 'p9-sm-ext',
      systemRole: 'User',
    }));

    // Add as Scrum Master
    await projectMemberService.addMember(
      testProject.id,
      testAdmin.id,
      { email: 'p9-sm@demo.local', projectRole: 'Scrum_Master' },
      '127.0.0.1',
      'spec-agent',
    );

    // Try to remove smUser (he is the only Scrum Master in testProject)
    await expect(
      projectMemberService.removeMember(
        testProject.id,
        smUser.id,
        testAdmin.id,
        '127.0.0.1',
        'spec-agent',
      ),
    ).rejects.toThrow(UnprocessableEntityException);

    // Clean up
    const memberRow = await memberRepo.findOne({ where: { projectId: testProject.id, userId: smUser.id } });
    if (memberRow) {
      await memberRepo.remove(memberRow);
    }
    await userRepo.remove(smUser);
  });

  // P10: Force re-login
  it('P10: Force re-login - member role change adds user to forced logout list in Redis', async () => {
    const smUser = await userRepo.save(userRepo.create({
      email: 'p10-sm@demo.local',
      displayName: 'P10 SM',
      externalId: 'p10-sm-ext',
      systemRole: 'User',
    }));

    const otherUser = await userRepo.save(userRepo.create({
      email: 'p10-other@demo.local',
      displayName: 'P10 Other',
      externalId: 'p10-other-ext',
      systemRole: 'User',
    }));

    // Add both
    await projectMemberService.addMember(
      testProject.id,
      testAdmin.id,
      { email: 'p10-sm@demo.local', projectRole: 'Scrum_Master' },
      '127.0.0.1',
      'spec-agent',
    );

    await projectMemberService.addMember(
      testProject.id,
      testAdmin.id,
      { email: 'p10-other@demo.local', projectRole: 'Developer' },
      '127.0.0.1',
      'spec-agent',
    );

    // Clear force log out flag for test
    await sessionService['redis'].del(`forced_logout:${otherUser.id}`);

    // Change role of otherUser (now there are 2 members, smUser is SM, otherUser is Dev)
    await projectMemberService.changeRole(
      testProject.id,
      otherUser.id,
      testAdmin.id,
      { projectRole: 'QA' },
      '127.0.0.1',
      'spec-agent',
    );

    // Verify otherUser is added to forced logout
    const isForced = await sessionService.isForceLoggedOut(otherUser.id);
    expect(isForced).toBe(true);

    // Clean up
    const m1 = await memberRepo.findOne({ where: { projectId: testProject.id, userId: smUser.id } });
    if (m1) await memberRepo.remove(m1);
    const m2 = await memberRepo.findOne({ where: { projectId: testProject.id, userId: otherUser.id } });
    if (m2) await memberRepo.remove(m2);
    await userRepo.remove(smUser);
    await userRepo.remove(otherUser);
  });

  // P11: Admin bypass
  it('P11: Admin bypass - ProjectRolesGuard bypasses check if user systemRole is Admin', async () => {
    const guard = new ProjectRolesGuard(reflector, memberRepo);

    // Mock ExecutionContext
    const context = {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            id: testAdmin.id,
            systemRole: 'Admin',
            projectRoles: [],
          },
          params: { projectId: testProject.id },
        }),
      }),
    } as any;

    // Spy on Reflector to return project roles for the endpoint (e.g., ['Scrum_Master'])
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Scrum_Master']);

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true); // Bypass successful

    jest.restoreAllMocks();
  });

  // P12: Last admin protection
  it('P12: Last admin protection - demoting or disabling the only active Admin throws 400', async () => {
    // There is only 1 admin active in our test suite (testAdmin)
    // Try to demote testAdmin to User
    await expect(
      adminService.changeRole(
        testAdmin.id,
        'User',
        testAdmin.id,
        '127.0.0.1',
        'spec-agent',
      ),
    ).rejects.toThrow(BadRequestException);

    // Try to disable testAdmin
    await expect(
      adminService.disableAccount(
        testAdmin.id,
        testAdmin.id,
        '127.0.0.1',
        'spec-agent',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
