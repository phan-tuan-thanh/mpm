import { Repository } from 'typeorm';
import { Project } from '../../project/entities/project.entity';

export async function resolveWorkspaceId(
  projectRepo: Repository<Project>,
  projectId: string,
): Promise<string | null> {
  const project = await projectRepo.findOne({
    where: { id: projectId },
    select: ['id', 'workspaceId'],
  });
  return project?.workspaceId ?? null;
}
