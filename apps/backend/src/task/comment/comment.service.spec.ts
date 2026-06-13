import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommentService } from './comment.service';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskCommentReaction } from '../entities/task-comment-reaction.entity';
import { ProjectMember } from '../../auth/entities/project-member.entity';
import { Task } from '../entities/task.entity';
import { ActivityService } from '../activity/activity.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('CommentService', () => {
  let service: CommentService;
  let commentRepo: any;
  let reactionRepo: any;
  let memberRepo: any;
  let taskRepo: any;
  let activityService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: getRepositoryToken(TaskComment),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TaskCommentReaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ActivityService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    commentRepo = module.get(getRepositoryToken(TaskComment));
    reactionRepo = module.get(getRepositoryToken(TaskCommentReaction));
    memberRepo = module.get(getRepositoryToken(ProjectMember));
    taskRepo = module.get(getRepositoryToken(Task));
    taskRepo.findOne.mockResolvedValue({ id: 't1', state: { group: 'active' } });
    activityService = module.get(ActivityService);
  });

  describe('create', () => {
    it('should throw NotFoundException if task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create('p1', 't1', 'u1', '<p>Hello</p>')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if parent comment does not exist', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 't1' });
      commentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('p1', 't1', 'u1', '<p>Hello</p>', 'parent1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if replying to a reply comment', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 't1' });
      commentRepo.findOne.mockResolvedValue({ id: 'parent1', parentId: 'grandparent1' });

      await expect(
        service.create('p1', 't1', 'u1', '<p>Hello</p>', 'parent1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if replying to a deleted comment', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 't1' });
      commentRepo.findOne.mockResolvedValue({ id: 'parent1', parentId: null, deletedAt: new Date() });

      await expect(
        service.create('p1', 't1', 'u1', '<p>Hello</p>', 'parent1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should sanitize HTML content and extract mentions of valid project members', async () => {
      const projectId = 'e89643df-51a8-47fb-9c88-e21b033dcd07';
      const taskId = 'd07469a4-2391-4c12-9c3f-c12df8b10bc4';
      const authorId = 'a1bc1d84-c81b-4f91-8ad2-222222222222';
      const validMentionId = 'b1bc1d84-c81b-4f91-8ad2-333333333333';
      const invalidMentionId = 'c1bc1d84-c81b-4f91-8ad2-444444444444';
      const attachmentId = 'd1bc1d84-c81b-4f91-8ad2-555555555555';

      taskRepo.findOne.mockResolvedValue({ id: taskId });
      memberRepo.find.mockResolvedValue([
        { userId: authorId },
        { userId: validMentionId },
      ]);
      
      const rawContent = `
        <p>Hello <span class="rte-mention" data-type="mention" data-id="${validMentionId}" data-label="User Two">@User Two</span></p>
        <span class="rte-mention" data-type="mention" data-id="${invalidMentionId}" data-label="Non Member">@Non Member</span>
        <script>alert("hack")</script>
        <img src="/api/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}" />
        <img src="https://attacker.com/evil.jpg" />
      `;

      commentRepo.create.mockImplementation((dto: any) => dto);
      commentRepo.save.mockImplementation((dto: any) => Promise.resolve({ id: 'c1', ...dto, createdAt: new Date() }));
      commentRepo.findOne.mockResolvedValue({
        id: 'c1',
        taskId: taskId,
        authorId: authorId,
        parentId: null,
        content: '<p>Sanitized content</p>',
        mentions: [validMentionId],
        author: { displayName: 'User One', avatarUrl: null },
      });

      const result = await service.create(projectId, taskId, authorId, rawContent);

      expect(result).toBeDefined();
      expect(commentRepo.create).toHaveBeenCalled();
      const createArgs = commentRepo.create.mock.calls[0][0];

      // Verify HTML elements
      expect(createArgs.content).toContain(validMentionId);
      expect(createArgs.content).not.toContain('<script>');
      expect(createArgs.content).toContain(`/api/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`);
      expect(createArgs.content).not.toContain('attacker.com');

      // Verify mentions are subset of valid members
      expect(createArgs.mentions).toEqual([validMentionId]);
      expect(activityService.log).toHaveBeenCalledWith(taskId, authorId, 'comment_added');
    });
  });

  describe('getComments', () => {
    it('should return aggregated and grouped comments', async () => {
      taskRepo.findOne.mockResolvedValue({ id: 't1' });

      const mockComments = [
        {
          id: 'c1',
          taskId: 't1',
          authorId: 'u1',
          parentId: null,
          content: '<p>Parent 1</p>',
          createdAt: new Date('2026-06-12T00:00:00Z'),
          deletedAt: null,
          author: { displayName: 'User One', avatarUrl: null },
          reactions: [
            { emoji: '👍', userId: 'u2' },
            { emoji: '👍', userId: 'u3' },
            { emoji: '❤️', userId: 'u1' },
          ],
        },
        {
          id: 'c2',
          taskId: 't1',
          authorId: 'u2',
          parentId: 'c1',
          content: '<p>Reply 1</p>',
          createdAt: new Date('2026-06-12T00:01:00Z'),
          deletedAt: null,
          author: { displayName: 'User Two', avatarUrl: null },
          reactions: [],
        },
      ];

      const queryBuilder: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockComments),
      };
      commentRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getComments('p1', 't1');

      expect(result).toHaveLength(1);
      const parent = result[0];
      expect(parent.id).toBe('c1');
      expect(parent.replies).toHaveLength(1);
      expect(parent.replies[0].id).toBe('c2');
      expect(parent.reactions).toEqual([
        { emoji: '👍', count: 2, userIds: ['u2', 'u3'] },
        { emoji: '❤️', count: 1, userIds: ['u1'] },
      ]);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if comment not found', async () => {
      commentRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('p1', 't1', 'c1', 'u1', 'New content')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if comment is deleted', async () => {
      commentRepo.findOne.mockResolvedValue({ id: 'c1', authorId: 'u1', deletedAt: new Date() });
      await expect(
        service.update('p1', 't1', 'c1', 'u1', 'New content')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if editor is not the author', async () => {
      commentRepo.findOne.mockResolvedValue({ id: 'c1', authorId: 'u1', deletedAt: null });
      await expect(
        service.update('p1', 't1', 'c1', 'u2', 'New content')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update successfully when caller is the author', async () => {
      const mockComment = {
        id: 'c1',
        taskId: 't1',
        authorId: 'u1',
        content: '<p>Old content</p>',
        deletedAt: null,
        save: jest.fn(),
      };
      commentRepo.findOne.mockResolvedValue(mockComment);
      memberRepo.find.mockResolvedValue([{ userId: 'u1' }]);
      commentRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.update('p1', 't1', 'c1', 'u1', '<p>Updated content</p>');
      expect(result.content).toBe('<p>Updated content</p>');
      expect(result.editedAt).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException if comment not found', async () => {
      commentRepo.findOne.mockResolvedValue(null);
      await expect(
        service.delete('p1', 't1', 'c1', 'u1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should run early and do nothing if already deleted', async () => {
      commentRepo.findOne.mockResolvedValue({ id: 'c1', deletedAt: new Date() });
      await expect(service.delete('p1', 't1', 'c1', 'u1')).resolves.not.toThrow();
      expect(commentRepo.save).not.toHaveBeenCalled();
    });

    it('should allow deletion if caller is author', async () => {
      const mockComment = { id: 'c1', authorId: 'u1', deletedAt: null };
      commentRepo.findOne.mockResolvedValue(mockComment);
      commentRepo.save.mockResolvedValue(mockComment);

      await service.delete('p1', 't1', 'c1', 'u1', 'Developer');
      expect(mockComment.deletedAt).toBeDefined();
      expect(activityService.log).toHaveBeenCalledWith('t1', 'u1', 'comment_deleted');
    });

    it('should allow deletion if caller is privileged role (Scrum Master, Admin, Product Owner)', async () => {
      const mockComment = { id: 'c1', authorId: 'u2', deletedAt: null };
      commentRepo.findOne.mockResolvedValue(mockComment);
      commentRepo.save.mockResolvedValue(mockComment);

      await service.delete('p1', 't1', 'c1', 'u1', 'Scrum_Master');
      expect(mockComment.deletedAt).toBeDefined();
    });

    it('should reject deletion if caller is a developer and not the author', async () => {
      const mockComment = { id: 'c1', authorId: 'u2', deletedAt: null };
      commentRepo.findOne.mockResolvedValue(mockComment);

      await expect(
        service.delete('p1', 't1', 'c1', 'u1', 'Developer')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reactions', () => {
    it('should throw BadRequestException if emoji is invalid', async () => {
      await expect(
        service.addReaction('p1', 't1', 'c1', 'u1', '🔥')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if comment not found', async () => {
      commentRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addReaction('p1', 't1', 'c1', 'u1', '👍')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if comment is deleted', async () => {
      commentRepo.findOne.mockResolvedValue({ id: 'c1', deletedAt: new Date() });
      await expect(
        service.addReaction('p1', 't1', 'c1', 'u1', '👍')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should upsert reaction successfully', async () => {
      commentRepo.findOne.mockResolvedValue({ id: 'c1', deletedAt: null });
      reactionRepo.create.mockImplementation((dto: any) => dto);
      reactionRepo.save.mockResolvedValue({});

      await service.addReaction('p1', 't1', 'c1', 'u1', '👍');
      expect(reactionRepo.create).toHaveBeenCalledWith({ commentId: 'c1', userId: 'u1', emoji: '👍' });
      expect(reactionRepo.save).toHaveBeenCalled();
    });

    it('should delete reaction successfully', async () => {
      commentRepo.findOne.mockResolvedValue({ id: 'c1' });
      reactionRepo.delete.mockResolvedValue({});

      await service.removeReaction('p1', 't1', 'c1', 'u1', '👍');
      expect(reactionRepo.delete).toHaveBeenCalledWith({ commentId: 'c1', userId: 'u1', emoji: '👍' });
    });
  });
});
