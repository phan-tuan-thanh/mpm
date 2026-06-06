import { Project } from './entities/project.entity';
import { ProjectListItem, ProjectRole, StateGroup, MemberResponse, ProjectNetwork } from '@mpm/shared-types';
import { NotFoundException } from '@nestjs/common';

export function mapToProjectListItem(
  p: Project,
  userId: string,
  systemRole: string,
  stats: Record<StateGroup, number>,
): ProjectListItem {
  const member = p.members && p.members[0];
  const myRole = member ? member.projectRole : (systemRole === 'Admin' ? 'Scrum_Master' : null);
  const leadUser: MemberResponse | null = p.lead ? {
    userId: p.lead.id,
    displayName: p.lead.displayName,
    email: p.lead.email,
    avatarUrl: p.lead.avatarUrl,
    projectRole: null as any,
    joinedAt: null as any,
  } : null;

  return {
    id: p.id,
    name: p.name,
    key: p.key,
    status: p.status,
    myRole: myRole as ProjectRole,
    createdAt: p.createdAt,
    emoji: p.emoji,
    network: p.network,
    lead: leadUser,
    features: {
      cycles: p.featureCycles,
      modules: p.featureModules,
      views: p.featureViews,
      pages: p.featurePages,
      intake: p.featureIntake,
      timeTracking: p.featureTimeTracking,
    },
    stateStats: stats,
  } as any;
}

export function formatProjectDetail(
  project: Project,
  userId: string,
  systemRole: string,
  stateStats: Record<StateGroup, number>,
): Project {
  const isMember = project.members.some((m) => m.userId === userId);
  const isPublic = project.network === ProjectNetwork.PUBLIC;
  if (!isMember && !isPublic && systemRole !== 'Admin') {
    throw new NotFoundException('Project not found');
  }

  project.stateStats = stateStats;
  project.features = {
    cycles: project.featureCycles,
    modules: project.featureModules,
    views: project.featureViews,
    pages: project.featurePages,
    intake: project.featureIntake,
    timeTracking: project.featureTimeTracking,
  } as any;

  if (project.members) {
    const member = project.members.find((m) => m.userId === userId);
    const myRole = member ? member.projectRole : (systemRole === 'Admin' ? 'Scrum_Master' : null);
    (project as any).myRole = myRole;
  }
  return project;
}
