import type {
  Task,
  Label,
  ProjectModule,
  MemberResponse,
  ProjectState,
  ProjectRole,
} from '@mpm/shared-types';
import { StateGroup } from '@mpm/shared-types';
import { buildDetailFields, buildStructureFields, getTaskFieldValue } from './properties-sidebar.helpers';

/**
 * Unit tests for PropertiesSidebarComponent helper functions
 *
 * Tests the component's business logic (field config building, value extraction)
 * without TestBed since Angular JIT compilation is not available in jest CJS mode.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 6.5, 9.1, 10.1
 */
describe('PropertiesSidebarComponent — Helpers', () => {
  const mockStates: ProjectState[] = [
    { id: 's1', projectId: 'p1', name: 'Backlog', colorLight: '#6B7280', colorDark: '#6B7280', group: StateGroup.BACKLOG, isDefault: true, order: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 's2', projectId: 'p1', name: 'Todo', colorLight: '#3B82F6', colorDark: '#3B82F6', group: StateGroup.UNSTARTED, isDefault: false, order: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const mockMembers: MemberResponse[] = [
    { userId: 'u1', displayName: 'Nguyễn Văn A', email: 'a@test.com', avatarUrl: null, projectRole: 'Scrum_Master' as ProjectRole, joinedAt: new Date() },
    { userId: 'u2', displayName: 'Trần Thị B', email: 'b@test.com', avatarUrl: null, projectRole: 'Developer' as ProjectRole, joinedAt: new Date() },
  ];

  const mockLabels: Label[] = [
    { id: 'l1', projectId: 'p1', name: 'Bug', colorLight: '#EF4444', colorDark: '#EF4444', createdAt: new Date(), updatedAt: new Date() },
    { id: 'l2', projectId: 'p1', name: 'Feature', colorLight: '#22C55E', colorDark: '#22C55E', createdAt: new Date(), updatedAt: new Date() },
  ];

  const mockModules: ProjectModule[] = [
    { id: 'm1', scope: 'project', workspaceId: 'w1', projectId: 'p1', name: 'Sprint 1', description: null, status: 'active', startDate: null, endDate: null, version: 1, taskCount: 5, completedCount: 2, progress: 40, allowedTransitions: [], createdBy: 'u1', createdAt: new Date(), updatedAt: new Date() },
  ];

  const mockTask: Task = {
    id: 't1',
    taskId: 'PROJ-1',
    projectId: 'p1',
    type: 'task',
    title: 'Test Task',
    priority: 'medium',
    stateId: 's1',
    state: { id: 's1', name: 'Backlog', colorLight: '#6B7280', colorDark: '#6B7280', group: 'backlog' },
    assignees: [{ userId: 'u1', displayName: 'Nguyễn Văn A', email: 'a@test.com', avatarUrl: null, assignedAt: new Date() }],
    labels: [{ id: 'l1', projectId: 'p1', name: 'Bug', colorLight: '#EF4444', colorDark: '#EF4444', createdAt: new Date(), updatedAt: new Date() }],
    modules: [{ id: 'm1', name: 'Sprint 1', scope: 'project', status: 'active' }],
    estimateValue: 3,
    startDate: '2026-06-01',
    dueDate: '2026-06-15',
    completedAt: null,
    backlogOrder: 0,
    isDraft: false,
    parentId: null,
    parent: null,
    reporterId: 'u1',
    reporter: { userId: 'u1', displayName: 'Nguyễn Văn A', avatarUrl: null },
    cycleId: null,
    subItemCount: 2,
    attachmentCount: 0,
    linkCount: 0,
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-05T14:30:00Z'),
    description: null,
    children: [],
    attachments: [],
    links: [],
    relations: [],
  };

  describe('buildDetailFields (Req 3.2)', () => {
    it('should return 6 fields: stateId, priority, assigneeIds, startDate, dueDate, estimateValue', () => {
      const fields = buildDetailFields(mockStates, mockMembers);
      expect(fields.length).toBe(6);
      expect(fields.map(f => f.field)).toEqual([
        'stateId',
        'priority',
        'assigneeIds',
        'startDate',
        'dueDate',
        'estimateValue',
      ]);
    });

    it('should map states to stateId dropdown options', () => {
      const fields = buildDetailFields(mockStates, mockMembers);
      const stateField = fields.find(f => f.field === 'stateId');
      expect(stateField?.type).toBe('dropdown');
      expect(stateField?.options?.length).toBe(2);
      expect(stateField?.options?.[0]).toEqual({ label: 'Backlog', value: 's1', color: '#6B7280' });
      expect(stateField?.options?.[1]).toEqual({ label: 'Todo', value: 's2', color: '#3B82F6' });
    });

    it('should have exactly 5 priority options', () => {
      const fields = buildDetailFields(mockStates, mockMembers);
      const priorityField = fields.find(f => f.field === 'priority');
      expect(priorityField?.type).toBe('dropdown');
      expect(priorityField?.options?.length).toBe(5);
      expect(priorityField?.options?.map(o => o.value)).toEqual([
        'urgent', 'high', 'medium', 'low', 'none',
      ]);
    });

    it('should map members to assigneeIds multi-select options', () => {
      const fields = buildDetailFields(mockStates, mockMembers);
      const assigneeField = fields.find(f => f.field === 'assigneeIds');
      expect(assigneeField?.type).toBe('multi-select');
      expect(assigneeField?.options?.length).toBe(2);
      expect(assigneeField?.options?.[0]).toEqual({ label: 'Nguyễn Văn A', value: 'u1' });
      expect(assigneeField?.options?.[1]).toEqual({ label: 'Trần Thị B', value: 'u2' });
    });

    it('should configure estimate with min 0.5, max 100, step 0.5', () => {
      const fields = buildDetailFields(mockStates, mockMembers);
      const estimateField = fields.find(f => f.field === 'estimateValue');
      expect(estimateField?.type).toBe('number');
      expect(estimateField?.min).toBe(0.5);
      expect(estimateField?.max).toBe(100);
      expect(estimateField?.step).toBe(0.5);
    });

    it('should configure date fields for startDate and dueDate', () => {
      const fields = buildDetailFields(mockStates, mockMembers);
      const startDate = fields.find(f => f.field === 'startDate');
      const dueDate = fields.find(f => f.field === 'dueDate');
      expect(startDate?.type).toBe('date');
      expect(dueDate?.type).toBe('date');
    });

    it('should handle empty states and members', () => {
      const fields = buildDetailFields([], []);
      const stateField = fields.find(f => f.field === 'stateId');
      const assigneeField = fields.find(f => f.field === 'assigneeIds');
      expect(stateField?.options?.length).toBe(0);
      expect(assigneeField?.options?.length).toBe(0);
    });
  });

  describe('buildStructureFields (Req 3.3)', () => {
    it('should return labelIds, moduleIds and sprintId fields', () => {
      const fields = buildStructureFields(mockLabels, mockModules);
      expect(fields.map(f => f.field)).toEqual(['labelIds', 'moduleIds', 'sprintId']);
    });

    it('should map labels to labelIds multi-select options', () => {
      const fields = buildStructureFields(mockLabels, mockModules);
      const labelField = fields.find(f => f.field === 'labelIds');
      expect(labelField?.type).toBe('multi-select');
      expect(labelField?.options?.length).toBe(2);
      expect(labelField?.options?.[0]).toEqual({ label: 'Bug', value: 'l1', color: '#EF4444' });
    });

    it('should map modules to moduleIds multi-select options', () => {
      const fields = buildStructureFields(mockLabels, mockModules);
      const moduleField = fields.find(f => f.field === 'moduleIds');
      expect(moduleField?.type).toBe('multi-select');
      expect(moduleField?.options?.length).toBe(1);
      expect(moduleField?.options?.[0]).toEqual({ label: 'Sprint 1', value: 'm1' });
    });

    it('should handle empty labels and modules', () => {
      const fields = buildStructureFields([], []);
      const labelField = fields.find(f => f.field === 'labelIds');
      const moduleField = fields.find(f => f.field === 'moduleIds');
      expect(labelField?.options?.length).toBe(0);
      expect(moduleField?.options?.length).toBe(0);
    });
  });

  describe('getTaskFieldValue', () => {
    it('should return stateId from task', () => {
      expect(getTaskFieldValue(mockTask, 'stateId')).toBe('s1');
    });

    it('should return priority from task', () => {
      expect(getTaskFieldValue(mockTask, 'priority')).toBe('medium');
    });

    it('should return assignee user IDs array', () => {
      expect(getTaskFieldValue(mockTask, 'assigneeIds')).toEqual(['u1']);
    });

    it('should return startDate from task', () => {
      expect(getTaskFieldValue(mockTask, 'startDate')).toBe('2026-06-01');
    });

    it('should return dueDate from task', () => {
      expect(getTaskFieldValue(mockTask, 'dueDate')).toBe('2026-06-15');
    });

    it('should return estimateValue from task', () => {
      expect(getTaskFieldValue(mockTask, 'estimateValue')).toBe(3);
    });

    it('should return label IDs array', () => {
      expect(getTaskFieldValue(mockTask, 'labelIds')).toEqual(['l1']);
    });

    it('should return module IDs array', () => {
      expect(getTaskFieldValue(mockTask, 'moduleIds')).toEqual(['m1']);
    });

    it('should return null for unknown field', () => {
      expect(getTaskFieldValue(mockTask, 'unknown')).toBeNull();
    });

    it('should return null when task is null', () => {
      expect(getTaskFieldValue(null, 'stateId')).toBeNull();
      expect(getTaskFieldValue(null, 'priority')).toBeNull();
      expect(getTaskFieldValue(null, 'assigneeIds')).toBeNull();
    });

    it('should return empty array when task has no assignees', () => {
      const taskNoAssignees = { ...mockTask, assignees: [] };
      expect(getTaskFieldValue(taskNoAssignees, 'assigneeIds')).toEqual([]);
    });

    it('should return empty array when task has no labels', () => {
      const taskNoLabels = { ...mockTask, labels: [] };
      expect(getTaskFieldValue(taskNoLabels, 'labelIds')).toEqual([]);
    });

    it('should return empty array when task has no modules', () => {
      const taskNoModules = { ...mockTask, modules: [] };
      expect(getTaskFieldValue(taskNoModules, 'moduleIds')).toEqual([]);
    });

    it('should return null when estimateValue is null', () => {
      const taskNoEstimate = { ...mockTask, estimateValue: null };
      expect(getTaskFieldValue(taskNoEstimate, 'estimateValue')).toBeNull();
    });

    it('should return null when startDate is null', () => {
      const taskNoStart = { ...mockTask, startDate: null };
      expect(getTaskFieldValue(taskNoStart, 'startDate')).toBeNull();
    });

    it('should return null when dueDate is null', () => {
      const taskNoDue = { ...mockTask, dueDate: null };
      expect(getTaskFieldValue(taskNoDue, 'dueDate')).toBeNull();
    });
  });
});
