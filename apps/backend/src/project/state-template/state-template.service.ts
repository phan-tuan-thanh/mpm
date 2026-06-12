import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceStateTemplate } from '../entities/workspace-state-template.entity';
import { ProjectState } from '../entities/project-state.entity';
import { CreateStateDto, UpdateStateDto, StateGroup } from '@mpm/shared-types';

@Injectable()
export class StateTemplateService {
  constructor(
    @InjectRepository(WorkspaceStateTemplate)
    private readonly templateRepository: Repository<WorkspaceStateTemplate>,
    @InjectRepository(ProjectState)
    private readonly stateRepository: Repository<ProjectState>,
  ) {}

  /**
   * Lấy tất cả state templates của workspace, sắp xếp theo order
   */
  async findAll(workspaceId: string): Promise<WorkspaceStateTemplate[]> {
    return this.templateRepository.find({
      where: { workspaceId },
      order: { order: 'ASC' },
    });
  }

  /**
   * Tạo state template mới
   * - Validate unique name trong workspace
   * - Max 20 templates per workspace
   */
  async create(
    workspaceId: string,
    userId: string,
    dto: CreateStateDto,
  ): Promise<WorkspaceStateTemplate> {
    // Validate unique name trong workspace
    const existing = await this.templateRepository.findOne({
      where: { workspaceId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `Template name "${dto.name}" already exists in this workspace`,
        errorCode: 'TEMPLATE_NAME_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate max 20 templates
    const count = await this.templateRepository.count({
      where: { workspaceId },
    });
    if (count >= 20) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'A workspace can have at most 20 state templates',
        errorCode: 'MAX_TEMPLATES_REACHED',
        timestamp: new Date().toISOString(),
      });
    }

    // Xác định order tiếp theo
    const maxOrderTemplate = await this.templateRepository.findOne({
      where: { workspaceId },
      order: { order: 'DESC' },
    });
    const nextOrder = maxOrderTemplate ? maxOrderTemplate.order + 1 : 0;

    const template = this.templateRepository.create({
      workspaceId,
      name: dto.name,
      colorLight: dto.colorLight,
      colorDark: dto.colorDark,
      group: dto.group,
      isDefault: false,
      order: nextOrder,
    });

    return this.templateRepository.save(template);
  }

  /**
   * Cập nhật state template
   * - Validate name uniqueness nếu name thay đổi
   */
  async update(
    templateId: string,
    workspaceId: string,
    dto: UpdateStateDto,
  ): Promise<WorkspaceStateTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'State template not found',
        errorCode: 'TEMPLATE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate name uniqueness nếu name thay đổi
    if (dto.name && dto.name !== template.name) {
      const existing = await this.templateRepository.findOne({
        where: { workspaceId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: `Template name "${dto.name}" already exists in this workspace`,
          errorCode: 'TEMPLATE_NAME_EXISTS',
          timestamp: new Date().toISOString(),
        });
      }
      template.name = dto.name;
    }

    if (dto.colorLight !== undefined) template.colorLight = dto.colorLight;
    if (dto.colorDark !== undefined) template.colorDark = dto.colorDark;
    if (dto.group !== undefined) template.group = dto.group;
    if (dto.order !== undefined) template.order = dto.order;
    if (dto.isDefault !== undefined) template.isDefault = dto.isDefault;

    return this.templateRepository.save(template);
  }

  /**
   * Xóa state template
   * ON DELETE SET NULL sẽ tự động set project_states.template_id = NULL
   */
  async delete(templateId: string, workspaceId: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'State template not found',
        errorCode: 'TEMPLATE_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    await this.templateRepository.remove(template);
  }

  /**
   * Apply (merge) workspace templates vào project đang tồn tại
   * - Skip templates đã có trong project (cùng template_id)
   * - Insert chỉ templates chưa có
   * - Handle name conflict bằng suffix "(template)"
   */
  async applyToProject(
    workspaceId: string,
    projectId: string,
  ): Promise<{ addedCount: number; skippedCount: number }> {
    const templates = await this.templateRepository.find({
      where: { workspaceId },
    });

    // Lấy danh sách template_id đã tồn tại trong project
    const existingStates = await this.stateRepository.find({
      where: { projectId },
      select: ['templateId'],
    });
    const existingTemplateIds = new Set(
      existingStates.map((s) => s.templateId).filter(Boolean),
    );

    let addedCount = 0;
    let skippedCount = 0;

    for (const tpl of templates) {
      // Skip nếu template đã được áp dụng trước đó
      if (existingTemplateIds.has(tpl.id)) {
        skippedCount++;
        continue;
      }

      // Kiểm tra name conflict trong project
      const nameExists = await this.stateRepository.findOne({
        where: { projectId, name: tpl.name },
      });
      const name = nameExists ? `${tpl.name} (template)` : tpl.name;

      // Tạo project state từ template
      const newState = this.stateRepository.create({
        projectId,
        name,
        colorLight: tpl.colorLight,
        colorDark: tpl.colorDark,
        group: tpl.group,
        isDefault: false,
        order: tpl.order,
        templateId: tpl.id,
      });
      await this.stateRepository.save(newState);
      addedCount++;
    }

    return { addedCount, skippedCount };
  }
}
