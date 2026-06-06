import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { ProjectService } from './project.service';
import { ProjectStateService } from './state/project-state.service';
import { EstimateConfigService } from './estimate/estimate-config.service';
import { TaskService } from '../task/task.service';
import { User } from '../auth/entities/user.entity';
import { Project } from './entities/project.entity';
import { ProjectState } from './entities/project-state.entity';
import { Task } from '../task/entities/task.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { StateGroup, EstimateType, ProjectNetwork } from '@mpm/shared-types';

describe('ProjectSettings Integration Tests (Epic A+)', () => {
  let moduleRef: TestingModule;
  let projectService: ProjectService;
  let stateService: ProjectStateService;
  let estimateService: EstimateConfigService;
  let taskService: TaskService;
  let userRepo: Repository<User>;
  let projectRepo: Repository<Project>;
  let stateRepo: Repository<ProjectState>;
  let taskRepo: Repository<Task>;
  let memberRepo: Repository<ProjectMember>;

  let testUser1: User;
  let testUser2: User;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    projectService = moduleRef.get<ProjectService>(ProjectService);
    stateService = moduleRef.get<ProjectStateService>(ProjectStateService);
    estimateService = moduleRef.get<EstimateConfigService>(EstimateConfigService);
    taskService = moduleRef.get<TaskService>(TaskService);
    
    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepo = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    stateRepo = moduleRef.get<Repository<ProjectState>>(getRepositoryToken(ProjectState));
    taskRepo = moduleRef.get<Repository<Task>>(getRepositoryToken(Task));
    memberRepo = moduleRef.get<Repository<ProjectMember>>(getRepositoryToken(ProjectMember));

    // Seeding test users
    testUser1 = await userRepo.findOne({ where: { email: 'sm@demo.local' } }) ||
      await userRepo.save(userRepo.create({
        email: 'sm@demo.local',
        displayName: 'Scrum Master',
        avatarUrl: null,
        externalId: 'sm-external-id',
      }));

    testUser2 = await userRepo.findOne({ where: { email: 'dev@demo.local' } }) ||
      await userRepo.save(userRepo.create({
        email: 'dev@demo.local',
        displayName: 'Developer User',
        avatarUrl: null,
        externalId: 'dev-external-id',
      }));
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  // Helper to create a basic project key
  let projectCount = 0;
  const generateKey = () => {
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `P${rand}${String(++projectCount).padStart(2, '0')}`.substring(0, 5);
  };

  // P1: Default States on Create
  it('P1: Default States on Create - tạo project mới → có đúng 6 states, có đúng 1 is_default = true', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P1 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    const states = await stateRepo.find({ where: { projectId: project.id } });
    expect(states).toHaveLength(6);

    const defaultStates = states.filter((s) => s.isDefault);
    expect(defaultStates).toHaveLength(1);
    expect(defaultStates[0].name).toBe('Todo');
    expect(defaultStates[0].group).toBe(StateGroup.UNSTARTED);
  });

  // P2: Single Default State
  it('P2: Single Default State - set is_default cho state B → state A tự động set is_default = false', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P2 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    const states = await stateRepo.find({ where: { projectId: project.id } });
    const todoState = states.find((s) => s.name === 'Todo')!;
    const inProgressState = states.find((s) => s.name === 'In Progress')!;

    expect(todoState.isDefault).toBe(true);
    expect(inProgressState.isDefault).toBe(false);

    // Set In Progress as default
    await stateService.update(
      project.id,
      inProgressState.id,
      testUser1.id,
      { isDefault: true },
      '127.0.0.1',
      'test-agent',
    );

    // Fetch states again from DB to verify trigger behavior
    const updatedTodo = await stateRepo.findOneBy({ id: todoState.id });
    const updatedInProgress = await stateRepo.findOneBy({ id: inProgressState.id });

    expect(updatedInProgress?.isDefault).toBe(true);
    expect(updatedTodo?.isDefault).toBe(false);
  });

  // P3: State Name Unique
  it('P3: State Name Unique - tạo 2 states cùng tên trong project → 409', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P3 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    await expect(
      stateService.create(
        project.id,
        testUser1.id,
        { name: 'Todo', color: '#112233', group: StateGroup.UNSTARTED },
        '127.0.0.1',
        'test-agent',
      ),
    ).rejects.toThrow(ConflictException);
  });

  // P4: State Deletion Guard
  it('P4: State Deletion Guard - xóa state đang có tasks → 422 STATE_IN_USE', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P4 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    const states = await stateRepo.find({ where: { projectId: project.id } });
    const todoState = states.find((s) => s.name === 'Todo')!;

    // Create task in Todo state
    await taskService.create(project.id, testUser1.id, {
      title: 'P4 Test Task',
      stateId: todoState.id,
    });

    // Try deleting Todo state (which has tasks)
    // First, since Todo is default state, it will throw DEFAULT_STATE
    // Let's make another state default first
    const inProgressState = states.find((s) => s.name === 'In Progress')!;
    await stateService.update(project.id, inProgressState.id, testUser1.id, { isDefault: true }, '127.0.0.1', 'test-agent');

    // Now try to delete Todo state (not default, but has tasks)
    await expect(
      stateService.delete(project.id, todoState.id, testUser1.id, '127.0.0.1', 'test-agent'),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // P5: State Migration
  it('P5: State Migration - migrate + delete: không còn task nào orphan', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P5 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    const states = await stateRepo.find({ where: { projectId: project.id } });
    const todoState = states.find((s) => s.name === 'Todo')!;
    const doneState = states.find((s) => s.name === 'Done')!;

    // Create task in Todo
    const task = await taskService.create(project.id, testUser1.id, {
      title: 'P5 Test Task',
      stateId: todoState.id,
    });

    // Make In Progress default so Todo can be deleted/migrated
    const inProgressState = states.find((s) => s.name === 'In Progress')!;
    await stateService.update(project.id, inProgressState.id, testUser1.id, { isDefault: true }, '127.0.0.1', 'test-agent');

    // Migrate Todo tasks to Done, then delete Todo
    await stateService.migrate(project.id, todoState.id, doneState.id, testUser1.id, '127.0.0.1', 'test-agent');

    // Verify task state has been updated to Done
    const updatedTask = await taskRepo.findOneBy({ id: task.id });
    expect(updatedTask?.stateId).toBe(doneState.id);

    // Verify Todo state is deleted
    const deletedState = await stateRepo.findOneBy({ id: todoState.id });
    expect(deletedState).toBeNull();
  });

  // P6: Feature Flag
  it('P6: Feature Flag - toggle feature_cycles = false → GET project trả về features.cycles = false', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P6 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    // Initial value is true
    expect(project.features!.cycles).toBe(true);

    // Toggle to false
    await projectService.updateFeatures(
      project.id,
      testUser1.id,
      { cycles: false },
      'User',
      '127.0.0.1',
      'test-agent',
    );

    // Fetch again
    const updatedProject = await projectService.findById(project.id, testUser1.id, 'User');
    expect(updatedProject.features!.cycles).toBe(false);
  });

  // P7: Network Visibility
  it('P7: Network Visibility - project secret không xuất hiện trong findAll của non-member', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P7 Secret Project', key, network: ProjectNetwork.SECRET },
      '127.0.0.1',
      'test-agent',
    );

    // Find all for creator (member) -> should contain P7 project
    const memberList = await projectService.findAll(testUser1.id, {}, 'User');
    expect(memberList.some((p) => p.id === project.id)).toBe(true);

    // Find all for other user (non-member) -> should NOT contain P7 project
    const nonMemberList = await projectService.findAll(testUser2.id, {}, 'User');
    expect(nonMemberList.some((p) => p.id === project.id)).toBe(false);
  });

  // P8: Public Join
  it('P8: Public Join - user join project public → tự động role Developer; join project secret → 403', async () => {
    const keyPublic = generateKey();
    const publicProject = await projectService.create(
      testUser1.id,
      { name: 'P8 Public Project', key: keyPublic, network: ProjectNetwork.PUBLIC },
      '127.0.0.1',
      'test-agent',
    );

    const keySecret = generateKey();
    const secretProject = await projectService.create(
      testUser1.id,
      { name: 'P8 Secret Project', key: keySecret, network: ProjectNetwork.SECRET },
      '127.0.0.1',
      'test-agent',
    );

    // Join public project
    const joinResult = await projectService.join(publicProject.id, testUser2.id, '127.0.0.1', 'test-agent');
    expect(joinResult.role).toBe('Developer');

    const memberEntry = await memberRepo.findOneBy({ projectId: publicProject.id, userId: testUser2.id });
    expect(memberEntry).toBeDefined();
    expect(memberEntry?.projectRole).toBe('Developer');

    // Try joining secret project -> Forbidden 403
    await expect(
      projectService.join(secretProject.id, testUser2.id, '127.0.0.1', 'test-agent'),
    ).rejects.toThrow(ForbiddenException);
  });

  // P9: Lead Validation
  it('P9: Lead Validation - set lead_id = non-member → 422 LEAD_NOT_MEMBER', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P9 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    // Try updating lead_id to a non-member (testUser2) -> 422 Unprocessable Entity
    await expect(
      projectService.update(
        project.id,
        testUser1.id,
        { leadId: testUser2.id },
        'User',
        '127.0.0.1',
        'test-agent',
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // P10: Estimate Reset
  it('P10: Estimate Reset - đổi estimate_type → tất cả tasks.estimate_value = NULL sau job chạy', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P10 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    const states = await stateRepo.find({ where: { projectId: project.id } });
    const todoState = states.find((s) => s.name === 'Todo')!;

    // Create tasks with estimate values
    const task = await taskService.create(project.id, testUser1.id, {
      title: 'P10 Task',
      estimateValue: 5,
      stateId: todoState.id,
    });
    expect(task.estimateValue).toBe(5);

    // Change estimate config type (from points to categories)
    await estimateService.updateConfig(
      project.id,
      testUser1.id,
      { estimateType: EstimateType.CATEGORIES, values: ['XS', 'S', 'M'] },
      '127.0.0.1',
      'test-agent',
    );

    // Wait briefly for background update to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify task estimate value is reset to null
    const updatedTask = await taskRepo.findOneBy({ id: task.id });
    expect(updatedTask?.estimateValue).toBeNull();
  });

  // P11: Task Default State
  it('P11: Task Default State - create task không có stateId → state_id = default state của project', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P11 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    const states = await stateRepo.find({ where: { projectId: project.id } });
    const todoState = states.find((s) => s.name === 'Todo')!; // Todo is default state

    // Create task without specifying stateId
    const task = await taskService.create(project.id, testUser1.id, {
      title: 'P11 Task',
    });

    expect(task.stateId).toBe(todoState.id);
  });

  // P12: Backlog Filter
  it('P12: Backlog Filter - query backlog với state group filter đúng, không phụ thuộc tên state', async () => {
    const key = generateKey();
    const project = await projectService.create(
      testUser1.id,
      { name: 'P12 Project', key },
      '127.0.0.1',
      'test-agent',
    );

    const states = await stateRepo.find({ where: { projectId: project.id } });
    const backlogState = states.find((s) => s.group === StateGroup.BACKLOG)!;
    const completedState = states.find((s) => s.group === StateGroup.COMPLETED)!;

    // Create task in backlog state group
    const task1 = await taskService.create(project.id, testUser1.id, {
      title: 'Backlog Group Task',
      stateId: backlogState.id,
    });

    // Create task in completed state group
    const task2 = await taskService.create(project.id, testUser1.id, {
      title: 'Completed Group Task',
      stateId: completedState.id,
    });

    // Fetch backlog tasks
    const backlogResult = await taskService.findAll(project.id, {
      stateIds: [backlogState.id],
    });

    // task1 should be in backlog list, task2 should not
    expect(backlogResult.data.some((t) => t.id === task1.id)).toBe(true);
    expect(backlogResult.data.some((t) => t.id === task2.id)).toBe(false);
  });
});
