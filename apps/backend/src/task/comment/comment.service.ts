import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import * as sanitizeHtml from 'sanitize-html';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskCommentReaction } from '../entities/task-comment-reaction.entity';
import { ProjectMember } from '../../auth/entities/project-member.entity';
import { Task } from '../entities/task.entity';
import { ActivityService } from '../activity/activity.service';

const ALLOWED_EMOJIS = ['👍', '❤️', '🎉', '👀', '✅', '😄'];

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(TaskComment)
    private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(TaskCommentReaction)
    private readonly reactionRepo: Repository<TaskCommentReaction>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Sanitizes comment HTML content server-side using sanitize-html
   */
  private sanitizeContent(content: string, projectId: string): string {
    const sanitize = (sanitizeHtml as any).default || sanitizeHtml;
    const cleanHtml = sanitize(content, {
      allowedTags: [
        'p', 'br', 'strong', 'em', 's', 'code', 'pre', 'ul', 'ol', 'li',
        'blockquote', 'a', 'img', 'span',
      ],
      allowedAttributes: {
        a: ['href', 'target', 'rel'],
        img: ['src', 'alt'],
        span: ['data-type', 'data-id', 'data-label'],
      },
      allowedClasses: {
        span: ['rte-mention'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      transformTags: {
        a: (tagName: string, attribs: Record<string, string>) => {
          if (attribs['target'] === '_blank') {
            attribs['rel'] = 'noopener noreferrer';
          }
          return { tagName, attribs };
        },
      },
    });

    // Whitelist src pattern for img: must match internal attachments route
    // /api/projects/:projectId/attachments/:id or similar pattern.
    // If not matching, we strip the tag or its src attribute.
    // Let's replace the src attribute with empty or strip the tag if invalid.
    // Let's use a regex or post-processing on the clean HTML.
    const projectAttachmentPattern = new RegExp(
      `^/api/projects/${projectId}/tasks/[a-fA-F0-9-]{36}/attachments/[a-fA-F0-9-]{36}`
    );

    // Let's also support matching general project attachments pattern to be safe:
    const generalPattern = /^\/api\/projects\/[a-fA-F0-9-]{36}\/tasks\/[a-fA-F0-9-]{36}\/attachments\/[a-fA-F0-9-]{36}/;

    // We can do a string replace or HTML parse post-process. Since it's clean HTML, we can replace
    // any <img src="invalid_url" ...> with nothing or strip it.
    const cleanWithValidImages = cleanHtml.replace(/<img\s+([^>]*src="([^"]*)"[^>]*)>/gi, (match: string, attrs: string, src: string) => {
      if (generalPattern.test(src) || src.startsWith('/uploads/')) {
        return match;
      }
      return ''; // Strip invalid images
    });

    return cleanWithValidImages;
  }

  /**
   * Extracts mentions from sanitized content and validates they are project members.
   */
  private async extractAndValidateMentions(
    content: string,
    projectId: string
  ): Promise<string[]> {
    const spanRegex = /<span\s+([^>]+)>/gi;
    const extractedIds: string[] = [];
    let match;

    while ((match = spanRegex.exec(content)) !== null) {
      const attrs = match[1];
      if (attrs.includes('data-type="mention"')) {
        const idMatch = attrs.match(/data-id="([a-fA-F0-9-]{36})"/i);
        if (idMatch) {
          extractedIds.push(idMatch[1]);
        }
      }
    }

    if (extractedIds.length === 0) {
      return [];
    }

    // Query project members to ensure mentions are valid
    const members = await this.memberRepo.find({
      where: { projectId },
      select: ['userId'],
    });
    const memberUserIds = new Set(members.map((m) => m.userId));

    // Return unique valid mentions
    return Array.from(new Set(extractedIds.filter((id) => memberUserIds.has(id))));
  }

  /**
   * Get all comments for a task grouped with replies and aggregated reactions.
   */
  async getComments(projectId: string, taskId: string): Promise<any[]> {
    // Verify task exists
    const task = await this.taskRepo.findOne({ where: { id: taskId, projectId } });
    if (!task) throw new NotFoundException('Task not found');

    // Fetch all active comments and parent comments with active replies
    const comments = await this.commentRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.author', 'author')
      .leftJoinAndSelect('c.reactions', 'r')
      .leftJoinAndSelect('r.user', 'ru')
      .where('c.taskId = :taskId', { taskId })
      .andWhere(new Brackets((qb) => {
        qb.where('c.deletedAt IS NULL')
          .orWhere(new Brackets((qb2) => {
            qb2.where('c.parentId IS NULL')
              .andWhere('c.deletedAt IS NOT NULL')
              .andWhere((qb3: any) => {
                const subQuery = qb3.subQuery()
                  .select('1')
                  .from(TaskComment, 'sub')
                  .where('sub.parentId = c.id')
                  .andWhere('sub.deletedAt IS NULL')
                  .getQuery();
                return 'EXISTS ' + subQuery;
              });
          }));
      }))
      .orderBy('c.createdAt', 'ASC')
      .getMany();

    // Group comments: Map replies to parent, aggregate reactions, clean content for deleted parents
    const parentMap = new Map<string, any>();
    const replies: TaskComment[] = [];

    for (const c of comments) {
      const isDeleted = c.deletedAt !== null;
      const commentDto = {
        id: c.id,
        taskId: c.taskId,
        authorId: c.authorId,
        authorName: isDeleted ? null : (c.author?.displayName ?? null),
        authorAvatar: isDeleted ? null : (c.author?.avatarUrl ?? null),
        parentId: c.parentId,
        content: isDeleted ? null : c.content,
        mentions: isDeleted ? [] : (c.mentions ?? []),
        editedAt: c.editedAt,
        deletedAt: c.deletedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        replies: [],
        reactions: this.aggregateReactions(c.reactions ?? []),
      };

      if (!c.parentId) {
        parentMap.set(c.id, commentDto);
      } else {
        replies.push(c as any); // To associate with parents afterwards
      }
    }

    // Associate replies with parents
    for (const reply of replies) {
      const parent = parentMap.get(reply.parentId!);
      if (parent) {
        const isDeleted = reply.deletedAt !== null;
        parent.replies.push({
          id: reply.id,
          taskId: reply.taskId,
          authorId: reply.authorId,
          authorName: isDeleted ? null : (reply.author?.displayName ?? null),
          authorAvatar: isDeleted ? null : (reply.author?.avatarUrl ?? null),
          parentId: reply.parentId,
          content: isDeleted ? null : reply.content,
          mentions: isDeleted ? [] : (reply.mentions ?? []),
          editedAt: reply.editedAt,
          deletedAt: reply.deletedAt,
          createdAt: reply.createdAt,
          updatedAt: reply.updatedAt,
          reactions: this.aggregateReactions(reply.reactions ?? []),
        });
      }
    }

    return Array.from(parentMap.values());
  }

  private aggregateReactions(reactions: TaskCommentReaction[]): any[] {
    const map = new Map<string, { emoji: string; userIds: string[] }>();
    for (const r of reactions) {
      let agg = map.get(r.emoji);
      if (!agg) {
        agg = { emoji: r.emoji, userIds: [] };
        map.set(r.emoji, agg);
      }
      agg.userIds.push(r.userId);
    }
    return Array.from(map.values()).map((agg) => ({
      emoji: agg.emoji,
      count: agg.userIds.length,
      userIds: agg.userIds,
    }));
  }

  /**
   * Create a new comment or reply.
   */
  async create(
    projectId: string,
    taskId: string,
    authorId: string,
    content: string,
    parentId?: string | null
  ): Promise<any> {
    // Verify task exists
    const task = await this.taskRepo.findOne({ where: { id: taskId, projectId } });
    if (!task) throw new NotFoundException('Task not found');

    let parentComment: TaskComment | null = null;
    if (parentId) {
      parentComment = await this.commentRepo.findOne({ where: { id: parentId, taskId } });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      // If the parent comment has a parentId, it is a reply itself -> Throw 400 (only 1-level nesting)
      if (parentComment.parentId) {
        throw new BadRequestException('Cannot reply to a reply comment');
      }
      // If parent is deleted, return 400
      if (parentComment.deletedAt) {
        throw new BadRequestException('Cannot reply to a deleted comment');
      }
    }

    // Sanitize HTML and extract mentions
    const sanitizedHtml = this.sanitizeContent(content, projectId);
    const mentions = await this.extractAndValidateMentions(sanitizedHtml, projectId);

    const comment = this.commentRepo.create({
      taskId,
      authorId,
      parentId: parentId || null,
      content: sanitizedHtml,
      mentions,
    });

    const saved = await this.commentRepo.save(comment);

    // Write activity log
    await this.activityService.log(taskId, authorId, 'comment_added');

    // Return comment details with author relations
    const withAuthor = await this.commentRepo.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });

    return {
      id: withAuthor!.id,
      taskId: withAuthor!.taskId,
      authorId: withAuthor!.authorId,
      authorName: withAuthor!.author?.displayName ?? null,
      authorAvatar: withAuthor!.author?.avatarUrl ?? null,
      parentId: withAuthor!.parentId,
      content: withAuthor!.content,
      mentions: withAuthor!.mentions,
      editedAt: withAuthor!.editedAt,
      deletedAt: withAuthor!.deletedAt,
      createdAt: withAuthor!.createdAt,
      updatedAt: withAuthor!.updatedAt,
      replies: [],
      reactions: [],
    };
  }

  /**
   * Edit a comment (author only).
   */
  async update(
    projectId: string,
    taskId: string,
    commentId: string,
    authorId: string,
    content: string
  ): Promise<any> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, taskId },
      relations: ['author', 'reactions'],
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.deletedAt) throw new ForbiddenException('Comment has been deleted');
    if (comment.authorId !== authorId) {
      throw new ForbiddenException('Cannot edit another user\'s comment');
    }

    const sanitizedHtml = this.sanitizeContent(content, projectId);
    const mentions = await this.extractAndValidateMentions(sanitizedHtml, projectId);

    comment.content = sanitizedHtml;
    comment.mentions = mentions;
    comment.editedAt = new Date();

    const saved = await this.commentRepo.save(comment);

    return {
      id: saved.id,
      taskId: saved.taskId,
      authorId: saved.authorId,
      authorName: saved.author?.displayName ?? null,
      authorAvatar: saved.author?.avatarUrl ?? null,
      parentId: saved.parentId,
      content: saved.content,
      mentions: saved.mentions,
      editedAt: saved.editedAt,
      deletedAt: saved.deletedAt,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      reactions: this.aggregateReactions(saved.reactions ?? []),
    };
  }

  /**
   * Delete a comment (Author, Scrum Master, Product Owner, or Admin).
   */
  async delete(
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
    callerRole?: string
  ): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, taskId },
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.deletedAt) return; // Idempotent

    const isOwn = comment.authorId === userId;
    const isPrivileged =
      callerRole === 'Scrum_Master' ||
      callerRole === 'Product_Owner' ||
      callerRole === 'Admin';

    if (!isOwn && !isPrivileged) {
      throw new ForbiddenException('Cannot delete another user\'s comment');
    }

    // Soft delete
    comment.deletedAt = new Date();
    await this.commentRepo.save(comment);

    // Clean up replies if parent is deleted and has no active replies?
    // Subquery in GET handles hiding parent comments with no active replies.
    // If a reply is deleted, we just soft-delete it.

    // Write activity log
    await this.activityService.log(taskId, userId, 'comment_deleted');
  }

  /**
   * React to a comment (idempotent).
   */
  async addReaction(
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      throw new BadRequestException('Invalid reaction emoji');
    }

    const comment = await this.commentRepo.findOne({ where: { id: commentId, taskId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.deletedAt) throw new ForbiddenException('Comment has been deleted');

    // Upsert reaction
    const reaction = this.reactionRepo.create({
      commentId,
      userId,
      emoji,
    });
    await this.reactionRepo.save(reaction);
  }

  /**
   * Remove reaction from comment (idempotent).
   */
  async removeReaction(
    projectId: string,
    taskId: string,
    commentId: string,
    userId: string,
    emoji: string
  ): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId, taskId } });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.reactionRepo.delete({
      commentId,
      userId,
      emoji,
    });
  }
}
