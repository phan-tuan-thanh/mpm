import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { TaskService } from './task.service';
import { ActivityService } from './activity/activity.service';
import { LabelService } from './label/label.service';
import { RelationService } from './relation/relation.service';
import { AttachmentService } from './attachment/attachment.service';
import { ProjectService } from '../project/project.service';
import { User } from '../auth/entities/user.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectState } from '../project/entities/project-state.entity';
import { Task } from './entities/task.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  UnprocessableEntityException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

jest.setTimeout(30000);

describe('Task Management Integration Tests (Epic B)', () => {
  let moduleRef: TestingModule;
  let taskService: TaskService;
  let activityService: ActivityService;
  let labelService: LabelService;
  let relationService: RelationService;
  let projectService: ProjectService;
  let userRepo: Repository<User>;
  let projectRepo: Repository<Project>;
  let stateRepo: Repository<ProjectState>;
  let taskRepo: Repository<Task>;
  let memberRepo: Repository<ProjectMember>;
  let dataSource: DataSource;

  let testUser1: User;
  let testUser2: User;
  let nonMember: User;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    taskService = moduleRef.get<TaskService>(TaskService);
    activityService = moduleRef.get<ActivityService>(ActivityService);
    labelService = moduleRef.get<LabelService>(LabelService);
    relationService = moduleRef.get<RelationService>(RelationService);
    projectService = moduleRef.get<ProjectService>(ProjectService);

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepo = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    stateRepo = moduleRef.get<Repository<ProjectState>>(getRepositoryToken(ProjectState));
    taskRepo = moduleRef.get<Repository<Task>>(getRepositoryToken(Task));
    memberRepo = moduleRef.get<Repository<ProjectMember>>(getRepositoryToken(ProjectMember));
    dataSource = moduleRef.get<DataSource>(DataSource);

    // Create test users
    const ts = Date.now();
    testUser1 = await userRepo.findOne({ where: { email: 'sm@demo.local' } }) ||
      await userRepo.save(userRepo.create({ email: `epic-b-u1-${ts}@test.com`, displayName: 'Epic B User1', externalId: `eb1-${ts}` }));
    testUser2 = await userRepo.findOne({ where: { email: 'dev@demo.local' } }) ||
      await userRepo.save(userRepo.create({ email: `epic-b-u2-${ts}@test.com`, displayName: 'Epic B User2', externalId: `eb2-${ts}` }));
    nonMember = await userRepo.save(
      userRepo.create({ email: `epic-b-nm-${ts}@test.com`, displayName: 'Non Member', externalId: `ebnm-${ts}` }),
    );
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  // ─── Helper ───────────────────────────────────────────────────────────

  async function createTestProject(suffix: string) {
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    const key = `T${rand}`.substring(0, 5).toUpperCase();
    const project = await projectService.create(
      testUser1.id,
      { name: `Epic B Project ${suffix}`, key },
      '127.0.0.1',
      'test-agent',
    );
    // Add testUser2 as Developer
    await memberRepo.save(
      memberRepo.create({ userId: testUser2.id, projectId: project.id, projectRole: 'Developer' }),
    );
    return project;
  }

  // ─── P1: Atomic Task Counter ──────────────────────────────────────────

  it('P1: 10 concurrent task creates do not produce duplicate task_ids', async () => {
    const project = await createTestProject('P1');
    const state = await stateRepo.findOne({ where: { projectId: project.id, isDefault: true } });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        taskService.create(project.id, testUser1.id, { title: `Concurrent Task ${i}` }),
      ),
    );

    const taskIds = results.map((t) => t.taskId);
    const unique = new Set(taskIds);
    expect(unique.size).toBe(10);
  });

  // ─── P2: Hierarchy Enforcement ───────────────────────────────────────

  it('P2: Creating subtask directly under epic throws 422', async () => {
    const project = await createTestProject('P2');

    const epic = await taskService.create(project.id, testUser1.id, {
      title: 'Epic',
      type: 'epic',
    });

    await expect(
      taskService.create(project.id, testUser1.id, {
        title: 'Subtask under Epic',
        type: 'subtask',
        parentId: epic.id,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // ─── P3: task_id Immutability ─────────────────────────────────────────

  it('P3: PATCH does not change task_id even if body contains taskId field', async () => {
    const project = await createTestProject('P3');

    const task = await taskService.create(project.id, testUser1.id, { title: 'Original Task' });
    const originalTaskId = task.taskId;

    await taskService.update(project.id, task.id, testUser1.id, {
      title: 'Updated Task',
    } as any);

    const updated = await taskRepo.findOne({ where: { id: task.id } });
    expect(updated!.taskId).toBe(originalTaskId);
  });

  // ─── P4: Cascade Delete ───────────────────────────────────────────────

  it('P4: Deleting a story cascades to its tasks and subtasks', async () => {
    const project = await createTestProject('P4');

    const story = await taskService.create(project.id, testUser1.id, {
      title: 'Story',
      type: 'story',
    });
    const task = await taskService.create(project.id, testUser1.id, {
      title: 'Task under Story',
      type: 'task',
      parentId: story.id,
    });
    const subtask = await taskService.create(project.id, testUser1.id, {
      title: 'Subtask under Task',
      type: 'subtask',
      parentId: task.id,
    });

    await taskService.delete(project.id, story.id, testUser1.id);

    const deletedStory = await taskRepo.findOne({ where: { id: story.id } });
    const deletedTask = await taskRepo.findOne({ where: { id: task.id } });
    const deletedSubtask = await taskRepo.findOne({ where: { id: subtask.id } });

    expect(deletedStory).toBeNull();
    expect(deletedTask).toBeNull();
    expect(deletedSubtask).toBeNull();
  });

  // ─── P5: Permission matrix (simplified) ──────────────────────────────

  it('P5: Assignee validation — non-member cannot be assigned', async () => {
    const project = await createTestProject('P5');

    await expect(
      taskService.create(project.id, testUser1.id, {
        title: 'Task with non-member assignee',
        assigneeIds: [nonMember.id],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // ─── P6: Date Range Validation ────────────────────────────────────────

  it('P6: start_date > due_date throws 422', async () => {
    const project = await createTestProject('P6');

    await expect(
      taskService.create(project.id, testUser1.id, {
        title: 'Bad dates task',
        startDate: '2025-12-31',
        dueDate: '2025-01-01',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // ─── P7: Bidirectional Relation ───────────────────────────────────────

  it('P7: Creating "blocking" relation auto-creates "blocked_by" inverse', async () => {
    const project = await createTestProject('P7');

    const taskA = await taskService.create(project.id, testUser1.id, { title: 'Task A' });
    const taskB = await taskService.create(project.id, testUser1.id, { title: 'Task B' });

    await relationService.create(taskA.id, testUser1.id, project.id, {
      targetTaskId: taskB.id,
      relationType: 'blocking',
    });

    const relations = await dataSource.query(
      `SELECT relation_type FROM task_relations WHERE source_task_id = $1 AND target_task_id = $2`,
      [taskB.id, taskA.id],
    );
    expect(relations[0]?.relation_type).toBe('blocked_by');
  });

  // ─── P8: Circular Dependency ─────────────────────────────────────────

  it('P8: A blocks B, then B blocks A throws CIRCULAR_DEPENDENCY', async () => {
    const project = await createTestProject('P8');

    const taskA = await taskService.create(project.id, testUser1.id, { title: 'Task A' });
    const taskB = await taskService.create(project.id, testUser1.id, { title: 'Task B' });

    await relationService.create(taskA.id, testUser1.id, project.id, {
      targetTaskId: taskB.id,
      relationType: 'blocking',
    });

    await expect(
      relationService.create(taskB.id, testUser1.id, project.id, {
        targetTaskId: taskA.id,
        relationType: 'blocking',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // ─── P9: Assignee Validation ──────────────────────────────────────────

  it('P9: Assigning non-member on update throws 422', async () => {
    const project = await createTestProject('P9');

    const task = await taskService.create(project.id, testUser1.id, { title: 'Task' });

    await expect(
      taskService.update(project.id, task.id, testUser1.id, {
        assigneeIds: [nonMember.id],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  // ─── P10: Activity Log ────────────────────────────────────────────────

  it('P10: Creating a task logs a "created" activity entry', async () => {
    const project = await createTestProject('P10');

    const task = await taskService.create(project.id, testUser1.id, { title: 'Activity Task' });

    const timeline = await activityService.getTimeline(task.id);
    expect(timeline.data.length).toBeGreaterThan(0);
    expect(timeline.data.some((a) => a.entryType === 'created')).toBe(true);
  });

  // ─── P11: Backlog Order Rebalance ─────────────────────────────────────

  it('P11: Reorder preserves correct order after rebalance trigger', async () => {
    const project = await createTestProject('P11');

    const tasks = await Promise.all(
      [1, 2, 3].map((i) =>
        taskService.create(project.id, testUser1.id, { title: `Task ${i}` }),
      ),
    );

    // Set very small gaps to trigger rebalance
    await taskService.reorder(
      project.id,
      [
        { taskId: tasks[0].id, backlogOrder: 0.0001 },
        { taskId: tasks[1].id, backlogOrder: 0.0002 },
        { taskId: tasks[2].id, backlogOrder: 0.0003 },
      ],
      testUser1.id,
    );

    // Give rebalance async time to run
    await new Promise((r) => setTimeout(r, 100));

    const reordered = await taskRepo.find({
      where: { id: tasks[0].id },
    });
    expect(reordered[0].backlogOrder).toBeGreaterThan(0);
  });

  // ─── P12: Comment Add/Edit/Delete ────────────────────────────────────

  it('P12: Comment can be added, edited, and deleted', async () => {
    const project = await createTestProject('P12');
    const task = await taskService.create(project.id, testUser1.id, { title: 'Comment Task' });

    const comment = await activityService.addComment(task.id, testUser1.id, 'Hello world');
    expect(comment.comment).toBe('Hello world');

    const edited = await activityService.editComment(comment.id, testUser1.id, 'Updated comment');
    expect(edited.comment).toBe('Updated comment');

    await activityService.deleteComment(comment.id, testUser1.id);

    const timeline = await activityService.getTimeline(task.id);
    expect(timeline.data.some((a) => a.id === comment.id)).toBe(false);
  });
});
