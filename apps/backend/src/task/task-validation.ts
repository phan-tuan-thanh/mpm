import { UnprocessableEntityException } from '@nestjs/common';
import { In, EntityManager } from 'typeorm';
import { TaskType } from './entities/task.entity';
import { ProjectMember } from '../auth/entities/project-member.entity';
import { Label } from './entities/label.entity';

import { Project } from '../project/entities/project.entity';

const VALID_PARENTS: Record<TaskType, TaskType[]> = {
  epic: [],
  story: ['epic'],
  task: ['epic', 'story'],
  subtask: ['task'],
};

export function validateHierarchy(childType: TaskType, parentType: TaskType): void {
  const allowed = VALID_PARENTS[childType];
  if (!allowed.includes(parentType)) {
    throw new UnprocessableEntityException(
      `A ${childType} cannot be a child of a ${parentType}`,
    );
  }
}

export function validateDates(startDate?: string | null, dueDate?: string | null): void {
  if (startDate && dueDate && startDate > dueDate) {
    throw new UnprocessableEntityException('start_date must be before or equal to due_date');
  }
}

export async function validateAssignees(em: EntityManager, projectId: string, assigneeIds?: string[]): Promise<void> {
  if (assigneeIds?.length) {
    const memberCount = await em.count(ProjectMember, {
      where: { projectId, userId: In(assigneeIds) },
    });
    if (memberCount !== assigneeIds.length) {
      throw new UnprocessableEntityException('One or more assignees are not project members');
    }
  }
}

export async function validateLabels(em: EntityManager, projectId: string, labelIds?: string[]): Promise<void> {
  if (labelIds?.length) {
    const project = await em.findOne(Project, { where: { id: projectId }, select: ['workspaceId'] });
    const workspaceId = project?.workspaceId;

    const whereClauses: any[] = [
      { id: In(labelIds), projectId }
    ];
    if (workspaceId) {
      whereClauses.push({ id: In(labelIds), scope: 'workspace', workspaceId });
    }

    const labels = await em.find(Label, { where: whereClauses });
    if (labels.length !== labelIds.length) {
      throw new UnprocessableEntityException('One or more labels not found in this project');
    }

    // Check for mutually exclusive scoped labels (format Key::Value, case-insensitive scope check)
    const scopes = new Set<string>();
    for (const label of labels) {
      if (label.name.includes('::') && label.isExclusive !== false) {
        const scope = label.name.split('::')[0].trim().toLowerCase();
        if (scopes.has(scope)) {
          throw new UnprocessableEntityException(`Task cannot have multiple labels in the scope "${scope}"`);
        }
        scopes.add(scope);
      }
    }
  }
}
