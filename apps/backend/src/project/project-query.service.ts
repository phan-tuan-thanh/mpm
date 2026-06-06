import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectListItem, ProjectNetwork, StateGroup } from '@mpm/shared-types';
import { mapToProjectListItem, formatProjectDetail } from './project.mapper';

@Injectable()
export class ProjectQueryService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    userId: string,
    query: { name?: string; status?: string; network?: string },
    systemRole: string,
  ): Promise<ProjectListItem[]> {
    const qb = this.projectRepository.createQueryBuilder('project')
      .leftJoinAndSelect('project.members', 'member', 'member.userId = :userId', { userId })
      .leftJoinAndSelect('project.lead', 'lead');

    if (systemRole !== 'Admin') {
      qb.andWhere('(member.userId IS NOT NULL OR project.network = :publicNetwork)', {
        publicNetwork: ProjectNetwork.PUBLIC,
      });
    }
    if (query.name) qb.andWhere('project.name ILIKE :name', { name: `%${query.name}%` });
    if (query.status && query.status !== 'all') qb.andWhere('project.status = :status', { status: query.status });
    if (query.network && query.network !== 'all') qb.andWhere('project.network = :network', { network: query.network });

    qb.orderBy('project.createdAt', 'DESC');
    const projects = await qb.getMany();
    if (projects.length === 0) return [];

    const projectIds = projects.map((p) => p.id);
    const statsRaw = await this.dataSource.query(`
      SELECT ps.project_id as "projectId", ps.group as "group", COUNT(t.id) as "count"
      FROM project_states ps
      LEFT JOIN tasks t ON t.state_id = ps.id
      WHERE ps.project_id IN (${projectIds.map((id) => `'${id}'`).join(',')})
      GROUP BY ps.project_id, ps.group
    `);

    const statsMap: Record<string, Record<StateGroup, number>> = {};
    for (const p of projects) {
      statsMap[p.id] = {
        [StateGroup.BACKLOG]: 0, [StateGroup.UNSTARTED]: 0,
        [StateGroup.STARTED]: 0, [StateGroup.COMPLETED]: 0, [StateGroup.CANCELLED]: 0,
      };
    }
    for (const row of statsRaw) {
      if (statsMap[row.projectId]) {
        statsMap[row.projectId][row.group as StateGroup] = parseInt(row.count, 10);
      }
    }

    return projects.map((p) => mapToProjectListItem(p, userId, systemRole, statsMap[p.id]));
  }

  async findById(id: string, userId: string, systemRole: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'members', 'members.user', 'lead', 'estimateConfig'],
    });
    if (!project) throw new NotFoundException('Project not found');
    const stats = await this.queryStateStats(project.id);
    return formatProjectDetail(project, userId, systemRole, stats);
  }

  async findByKey(key: string, userId: string, systemRole: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { key: key.toUpperCase() },
      relations: ['owner', 'members', 'members.user', 'lead', 'estimateConfig'],
    });
    if (!project) throw new NotFoundException('Project not found');
    const stats = await this.queryStateStats(project.id);
    return formatProjectDetail(project, userId, systemRole, stats);
  }

  private async queryStateStats(projectId: string): Promise<Record<StateGroup, number>> {
    const raw = await this.dataSource.query(`
      SELECT ps.group as "group", COUNT(t.id) as "count"
      FROM project_states ps
      LEFT JOIN tasks t ON t.state_id = ps.id
      WHERE ps.project_id = $1
      GROUP BY ps.group
    `, [projectId]);

    const stats = {
      [StateGroup.BACKLOG]: 0, [StateGroup.UNSTARTED]: 0,
      [StateGroup.STARTED]: 0, [StateGroup.COMPLETED]: 0, [StateGroup.CANCELLED]: 0,
    };
    for (const row of raw) {
      stats[row.group as StateGroup] = parseInt(row.count, 10);
    }
    return stats;
  }
}
