import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class CoverService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  private getUploadDir(projectId: string): string {
    // Save in workspace under apps/backend/uploads/projects/{projectId}
    const dir = path.resolve(__dirname, '../../../../uploads/projects', projectId);
    return dir;
  }

  /**
   * Upload cover image
   */
  async upload(
    projectId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException({
        statusCode: 413,
        error: 'Payload Too Large',
        message: 'File size must not exceed 5MB',
        errorCode: 'FILE_TOO_LARGE',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate magic bytes
    const buffer = file.buffer;
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException('Invalid file buffer');
    }
    const hex = buffer.toString('hex', 0, 4).toUpperCase();
    const isJpeg = hex.startsWith('FFD8FF');
    const isPng = hex.startsWith('89504E47');
    const isWebp = hex.startsWith('52494646'); // RIFF

    if (!isJpeg && !isPng && !isWebp) {
      throw new UnprocessableEntityException({
        statusCode: 415,
        error: 'Unsupported Media Type',
        message: 'Only JPG, PNG and WEBP cover images are allowed',
        errorCode: 'UNSUPPORTED_IMAGE_FORMAT',
        timestamp: new Date().toISOString(),
      });
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
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

    const uploadDir = this.getUploadDir(projectId);
    fs.mkdirSync(uploadDir, { recursive: true });

    // Clear old cover files
    try {
      const files = fs.readdirSync(uploadDir);
      for (const f of files) {
        if (f.startsWith('cover.')) {
          fs.unlinkSync(path.join(uploadDir, f));
        }
      }
    } catch (err) {
      // Ignore directory read errors
    }

    const ext = isJpeg ? 'jpg' : (isPng ? 'png' : 'webp');
    const fileName = `cover.${ext}`;
    const destPath = path.join(uploadDir, fileName);

    // Resize via sharp
    await sharp(file.buffer)
      .resize(1920, 384)
      .toFile(destPath);

    const coverUrl = `/api/projects/${projectId}/cover`;
    project.coverImageUrl = coverUrl;
    await this.projectRepository.save(project);

    return coverUrl;
  }

  /**
   * Delete cover image
   */
  async delete(projectId: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
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

    const uploadDir = this.getUploadDir(projectId);
    try {
      const files = fs.readdirSync(uploadDir);
      for (const f of files) {
        if (f.startsWith('cover.')) {
          fs.unlinkSync(path.join(uploadDir, f));
        }
      }
    } catch (err) {
      // Ignore if dir doesn't exist
    }

    project.coverImageUrl = null;
    await this.projectRepository.save(project);
  }

  /**
   * Get local cover image path
   */
  async getCoverPath(projectId: string): Promise<string> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project || !project.coverImageUrl) {
      throw new NotFoundException('Cover image not found');
    }

    const uploadDir = this.getUploadDir(projectId);
    if (!fs.existsSync(uploadDir)) {
      throw new NotFoundException('Cover image file not found on disk');
    }

    const files = fs.readdirSync(uploadDir);
    const coverFile = files.find((f) => f.startsWith('cover.'));
    if (!coverFile) {
      throw new NotFoundException('Cover image file not found on disk');
    }

    return path.join(uploadDir, coverFile);
  }
}
