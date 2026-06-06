import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from '../entities/label.entity';
import { AuditService } from '../../audit/audit.service';
import { queryAllForProject, queryAllForWorkspace, queryAll } from './label-query.utils';
import { createLabel } from './label-create.utils';
import { updateLabel } from './label-update.utils';
import { deleteLabel } from './label-delete.utils';

@Injectable()
export class LabelService {
  constructor(
    @InjectRepository(Label)
    private readonly labelRepo: Repository<Label>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Trả về merged list: workspace labels + project labels
   * Sorted: scope ASC (workspace trước), sau đó name ASC
   * Includes taskCount từ task_labels join
   */
  async findAllForProject(
    projectId: string,
    workspaceId: string,
  ): Promise<Array<Label & { taskCount: number }>> {
    return queryAllForProject(this.labelRepo, projectId, workspaceId);
  }

  /**
   * Tạo label với scope parameter
   * - scope='workspace': tạo workspace-level label (workspace_id required, project_id = null)
   * - scope='project': tạo project-level label (project_id required)
   */
  async create(
    dto: { name: string; color: string; isExclusive?: boolean; description?: string | null },
    opts: {
      scope: 'workspace' | 'project';
      workspaceId: string | null;
      projectId?: string | null;
      userId: string;
    },
  ): Promise<Label> {
    return createLabel(this.labelRepo, this.auditService, dto, opts);
  }

  /**
   * Cập nhật label — validate scope:
   * - Workspace label: chỉ Workspace Admin (systemRole='Admin') mới được sửa
   * - Project label: SM/PO được sửa
   */
  async update(
    labelId: string,
    dto: { name?: string; color?: string; isExclusive?: boolean; description?: string | null },
    opts: {
      workspaceId?: string;
      projectId?: string;
      userSystemRole: string;
    },
  ): Promise<Label> {
    return updateLabel(this.labelRepo, labelId, dto, opts);
  }

  /**
   * Xóa label — tính affectedTaskCount trước khi xóa
   * - Workspace label: cascade xóa task_labels cross-project, chỉ Admin mới xóa
   * - Project label: xóa task_labels trong project đó
   * Trả về { deletedLabelId, affectedTaskCount }
   */
  async delete(
    labelId: string,
    opts: {
      workspaceId?: string;
      projectId?: string;
      userId: string;
      userSystemRole: string;
    },
  ): Promise<{ deletedLabelId: string; affectedTaskCount: number }> {
    return deleteLabel(this.labelRepo, this.auditService, labelId, opts);
  }

  /**
   * Trả về chỉ workspace-scoped labels (cho workspace admin management)
   * Sorted theo name ASC, includes taskCount
   */
  async findAllForWorkspace(workspaceId: string): Promise<Array<Label & { taskCount: number }>> {
    return queryAllForWorkspace(this.labelRepo, workspaceId);
  }

  /**
   * Backward-compatible findAll — delegates to findAllForProject
   * Dùng cho trường hợp chỉ có projectId (legacy)
   */
  async findAll(projectId: string): Promise<Array<Label & { taskCount: number }>> {
    return queryAll(this.labelRepo, projectId);
  }
}
