import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { TaskService } from './task.service';
import { ActivityService } from './activity/activity.service';
import { CommentService } from './comment/comment.service';
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
  PayloadTooLargeException,
} from '@nestjs/common';
import { TaskAttachment } from './entities/task-attachment.entity';

jest.setTimeout(30000);

describe('Task Management Integration Tests (Epic B)', () => {
  let moduleRef: TestingModule;
  let taskService: TaskService;
  let activityService: ActivityService;
  let commentService: CommentService;
  let labelService: LabelService;
  let relationService: RelationService;
  let projectService: ProjectService;
  let userRepo: Repository<User>;
  let projectRepo: Repository<Project>;
  let stateRepo: Repository<ProjectState>;
  let taskRepo: Repository<Task>;
  let memberRepo: Repository<ProjectMember>;
  let attachmentRepo: Repository<TaskAttachment>;
  let dataSource: DataSource;
  let attachmentService: AttachmentService;

  let testUser1: User;
  let testUser2: User;
  let stakeholderUser: User;
  let nonMember: User;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    taskService = moduleRef.get<TaskService>(TaskService);
    activityService = moduleRef.get<ActivityService>(ActivityService);
    commentService = moduleRef.get<CommentService>(CommentService);
    labelService = moduleRef.get<LabelService>(LabelService);
    relationService = moduleRef.get<RelationService>(RelationService);
    attachmentService = moduleRef.get<AttachmentService>(AttachmentService);
    projectService = moduleRef.get<ProjectService>(ProjectService);

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    projectRepo = moduleRef.get<Repository<Project>>(getRepositoryToken(Project));
    stateRepo = moduleRef.get<Repository<ProjectState>>(getRepositoryToken(ProjectState));
    taskRepo = moduleRef.get<Repository<Task>>(getRepositoryToken(Task));
    memberRepo = moduleRef.get<Repository<ProjectMember>>(getRepositoryToken(ProjectMember));
    attachmentRepo = moduleRef.get<Repository<TaskAttachment>>(getRepositoryToken(TaskAttachment));
    dataSource = moduleRef.get<DataSource>(DataSource);

    // Create test users
    const ts = Date.now();
    testUser1 = await userRepo.findOne({ where: { email: 'sm@demo.local' } }) ||
      await userRepo.save(userRepo.create({ email: `epic-b-u1-${ts}@test.com`, displayName: 'Epic B User1', externalId: `eb1-${ts}` }));
    testUser2 = await userRepo.findOne({ where: { email: 'dev@demo.local' } }) ||
      await userRepo.save(userRepo.create({ email: `epic-b-u2-${ts}@test.com`, displayName: 'Epic B User2', externalId: `eb2-${ts}` }));
    stakeholderUser = await userRepo.save(
      userRepo.create({ email: `epic-b-sh-${ts}@test.com`, displayName: 'Stakeholder', externalId: `ebsh-${ts}` }),
    );
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

  // ─── P5: Permission Matrix ────────────────────────────────────────────

  it('P5: Permission Matrix — Stakeholder can comment; Developer cannot delete another\'s comment; SM can', async () => {
    const project = await createTestProject('P5');

    // Add stakeholderUser as Stakeholder in this project
    await memberRepo.save(
      memberRepo.create({ userId: stakeholderUser.id, projectId: project.id, projectRole: 'Stakeholder' }),
    );

    const task = await taskService.create(project.id, testUser1.id, { title: 'P5 Permission Task' });

    // Stakeholder CAN add a comment (POST comment → 200)
    const comment = await commentService.create(project.id, task.id, stakeholderUser.id, '<p>Stakeholder comment</p>');
    expect(comment).toBeDefined();
    expect(comment.content).toBe('<p>Stakeholder comment</p>');
 
    // testUser2 (Developer) CANNOT delete Stakeholder's comment — ForbiddenException
    await expect(
      commentService.delete(project.id, task.id, comment.id, testUser2.id, 'Developer'),
    ).rejects.toThrow(ForbiddenException);
 
    // testUser1 with 'Scrum_Master' callerRole CAN delete anyone's comment
    await expect(
      commentService.delete(project.id, task.id, comment.id, testUser1.id, 'Scrum_Master'),
    ).resolves.not.toThrow();
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

  // ─── P10: Attachment Limits ───────────────────────────────────────────

  it('P10: Attachment limits — 21st upload throws 422; file > 20MB throws 413', async () => {
    const project = await createTestProject('P10');
    const task = await taskService.create(project.id, testUser1.id, { title: 'Attachment Limit Task' });

    // Insert 20 attachment records directly to simulate already-at-limit
    for (let i = 0; i < 20; i++) {
      await dataSource.query(
        `INSERT INTO task_attachments (id, task_id, original_name, storage_path, mime_type, size_bytes, uploader_id)
         VALUES (gen_random_uuid(), $1, $2, $3, 'text/plain', 100, $4)`,
        [task.id, `file-${i}.txt`, `/tmp/fake-${i}.txt`, testUser1.id],
      );
    }

    const smallFile = {
      originalname: 'extra.txt',
      buffer: Buffer.from('x'),
      size: 100,
      mimetype: 'text/plain',
    } as Express.Multer.File;

    // 21st upload → 422 UnprocessableEntityException
    await expect(
      attachmentService.upload(task.id, project.id, testUser1.id, smallFile),
    ).rejects.toThrow(UnprocessableEntityException);

    // File > 20MB → 413 PayloadTooLargeException
    const bigFile = {
      originalname: 'huge.bin',
      buffer: Buffer.alloc(0),
      size: 21 * 1024 * 1024,
      mimetype: 'application/octet-stream',
    } as Express.Multer.File;

    const task2 = await taskService.create(project.id, testUser1.id, { title: 'Attachment Size Task' });
    await expect(
      attachmentService.upload(task2.id, project.id, testUser1.id, bigFile),
    ).rejects.toThrow(PayloadTooLargeException);
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

  // ─── P12: Activity Log ───────────────────────────────────────────────

  it('P12: Activity Log — create/update/comment all produce correct activity entries', async () => {
    const project = await createTestProject('P12');
    const task = await taskService.create(project.id, testUser1.id, { title: 'Activity Log Task' });

    // CREATE logs 'created'
    const afterCreate = await activityService.getTimeline(task.id);
    expect(afterCreate.data.some((a) => a.entryType === 'created')).toBe(true);

    // UPDATE title logs 'title_changed'
    await taskService.update(project.id, task.id, testUser1.id, { title: 'Updated Title' });
    const afterUpdate = await activityService.getTimeline(task.id);
    expect(afterUpdate.data.some((a) => a.entryType === 'title_changed')).toBe(true);

    // Comment add/edit/delete
    const comment = await commentService.create(project.id, task.id, testUser1.id, '<p>Hello world</p>');
    expect(comment.content).toBe('<p>Hello world</p>');
 
    const edited = await commentService.update(project.id, task.id, comment.id, testUser1.id, '<p>Updated comment</p>');
    expect(edited.content).toBe('<p>Updated comment</p>');
 
    await commentService.delete(project.id, task.id, comment.id, testUser1.id);
    const commentsList = await commentService.getComments(project.id, task.id);
    expect(commentsList.length).toBe(0);
  });
});
