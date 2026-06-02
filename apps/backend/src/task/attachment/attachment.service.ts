import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { TaskAttachment } from '../entities/task-attachment.entity';
import { ActivityService } from '../activity/activity.service';

const MAX_ATTACHMENTS = 20;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_TOTAL_BYTES = 100 * 1024 * 1024; // 100MB

@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(TaskAttachment)
    private readonly attachmentRepo: Repository<TaskAttachment>,
    private readonly activityService: ActivityService,
  ) {}

  async upload(
    taskId: string,
    projectId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<TaskAttachment> {
    if (file.size > MAX_FILE_BYTES) {
      throw new PayloadTooLargeException('File size exceeds 20MB limit');
    }

    // Validate magic bytes using file-type
    let detectedType: { mime: string } | undefined;
    try {
      const { fileTypeFromBuffer } = await import('file-type');
      detectedType = await fileTypeFromBuffer(file.buffer ?? fs.readFileSync(file.path));
    } catch {
      // file-type not available or unrecognized — allow through (mime from multer is fallback)
    }

    const mimeType = detectedType?.mime ?? file.mimetype;

    // Check attachment count
    const count = await this.attachmentRepo.count({ where: { taskId } });
    if (count >= MAX_ATTACHMENTS) {
      throw new UnprocessableEntityException(`Task already has ${MAX_ATTACHMENTS} attachments (maximum reached)`);
    }

    // Check total size
    const totalResult = await this.attachmentRepo
      .createQueryBuilder('a')
      .select('SUM(a.sizeBytes)', 'total')
      .where('a.taskId = :taskId', { taskId })
      .getRawOne<{ total: string | null }>();
    const totalBytes = parseInt(totalResult?.total ?? '0', 10);
    if (totalBytes + file.size > MAX_TOTAL_BYTES) {
      throw new UnprocessableEntityException('Total attachment size would exceed 100MB limit');
    }

    // Save file to disk
    const ext = path.extname(file.originalname);
    const uuid = crypto.randomUUID();
    const storagDir = path.join('uploads', 'projects', projectId, 'tasks', taskId);
    fs.mkdirSync(storagDir, { recursive: true });
    const storagePath = path.join(storagDir, `${uuid}${ext}`);

    if (file.path) {
      fs.renameSync(file.path, storagePath);
    } else if (file.buffer) {
      fs.writeFileSync(storagePath, file.buffer);
    }

    const attachment = this.attachmentRepo.create({
      taskId,
      originalName: file.originalname,
      storagePath,
      mimeType,
      sizeBytes: file.size,
      uploaderId: userId,
    });
    const saved = await this.attachmentRepo.save(attachment);

    await this.activityService.log(taskId, userId, 'attachment_added', {
      field: 'attachment',
      newValue: file.originalname,
    });

    return saved;
  }

  async getFile(attachmentId: string): Promise<TaskAttachment> {
    const attachment = await this.attachmentRepo.findOne({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async delete(
    attachmentId: string,
    userId: string,
    callerRole?: string,
  ): Promise<void> {
    const attachment = await this.attachmentRepo.findOne({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const isOwn = attachment.uploaderId === userId;
    const isPrivileged = callerRole === 'Scrum_Master' || callerRole === 'Admin';
    if (!isOwn && !isPrivileged) {
      throw new ForbiddenException('Cannot delete another user\'s attachment');
    }

    // Remove from filesystem
    try { fs.unlinkSync(attachment.storagePath); } catch { /* ignore if already gone */ }

    await this.attachmentRepo.delete(attachmentId);

    await this.activityService.log(attachment.taskId, userId, 'attachment_removed', {
      field: 'attachment',
      oldValue: attachment.originalName,
    });
  }
}
