import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { AuditService } from '../../audit/audit.service';
import { AuthEvent } from '../../auth/constants/auth-events';

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepo: Repository<Label>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(projectId: string): Promise<Array<Label & { taskCount: number }>> {
    const rows = await this.labelRepo
      .createQueryBuilder('l')
      .leftJoin('task_labels', 'tl', 'tl.label_id = l.id')
      .select('l.*')
      .addSelect('COUNT(tl.task_id)', 'taskCount')
      .where('l.projectId = :projectId', { projectId })
      .groupBy('l.id')
      .orderBy('l.name', 'ASC')
      .getRawMany<Label & { taskCount: string }>();

    return rows.map((r) => ({ ...r, taskCount: parseInt(r.taskCount as unknown as string, 10) }));
  }

  async create(
    projectId: string,
    userId: string,
    dto: { name: string; color: string },
  ): Promise<Label> {
    if (!/^#[0-9A-Fa-f]{6}$/.test(dto.color)) {
      throw new ConflictException('Color must be a valid hex code (e.g. #FF0000)');
    }

    const existing = await this.labelRepo.findOne({ where: { projectId, name: dto.name } });
    if (existing) throw new ConflictException('A label with this name already exists in the project');

    const label = this.labelRepo.create({ projectId, name: dto.name, color: dto.color });
    const saved = await this.labelRepo.save(label);

    this.auditService.log(AuthEvent.LABEL_CREATED, userId, 'internal', 'system', { projectId, name: dto.name });

    return saved;
  }

  async update(
    labelId: string,
    projectId: string,
    dto: { name?: string; color?: string },
  ): Promise<Label> {
    const label = await this.labelRepo.findOne({ where: { id: labelId, projectId } });
    if (!label) throw new NotFoundException('Label not found');

    if (dto.color && !/^#[0-9A-Fa-f]{6}$/.test(dto.color)) {
      throw new ConflictException('Color must be a valid hex code');
    }

    if (dto.name && dto.name !== label.name) {
      const existing = await this.labelRepo.findOne({ where: { projectId, name: dto.name } });
      if (existing) throw new ConflictException('A label with this name already exists');
    }

    if (dto.name !== undefined) label.name = dto.name;
    if (dto.color !== undefined) label.color = dto.color;

    return this.labelRepo.save(label);
  }

  async delete(labelId: string, projectId: string, userId: string): Promise<void> {
    const label = await this.labelRepo.findOne({ where: { id: labelId, projectId } });
    if (!label) throw new NotFoundException('Label not found');

    await this.labelRepo.delete(labelId);

    this.auditService.log(AuthEvent.LABEL_DELETED, userId, 'internal', 'system', { projectId, name: label.name });
  }
}
