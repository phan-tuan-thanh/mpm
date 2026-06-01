import type { ProjectRole } from '@mpm/shared-types';
import type { InvitationStatus } from '../entities/invitation.entity';

/**
 * DTO response cho một invitation
 */
export interface InvitationResponseDto {
  id: string;
  projectId: string;
  email: string;
  projectRole: ProjectRole;
  status: InvitationStatus;
  invitedBy: string;
  acceptedBy: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO response cho danh sách invitations với pagination
 */
export interface InvitationListResponseDto {
  data: InvitationResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
