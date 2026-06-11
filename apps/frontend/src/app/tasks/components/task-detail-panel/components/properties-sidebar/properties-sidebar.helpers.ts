import type { PropertyFieldConfig } from '../inline-property-editor/inline-property-editor.component';
import type { Label, ProjectModule } from '@mpm/shared-types';
import type { MemberResponse, ProjectState } from '@mpm/shared-types';
import type { Task } from '@mpm/shared-types';

/**
 * Builds PropertyFieldConfig[] for the "Chi tiết" (Details) section.
 *
 * Fields: State, Priority, Assignees, Start Date, Due Date, Estimate (Req 3.2)
 */
export function buildDetailFields(
  states: ProjectState[],
  members: MemberResponse[],
): PropertyFieldConfig[] {
  return [
    {
      field: 'stateId',
      label: 'Trạng thái',
      type: 'dropdown',
      options: states.map((s) => ({
        label: s.name,
        value: s.id,
        color: s.color,
      })),
      placeholder: 'Chọn trạng thái...',
    },
    {
      field: 'priority',
      label: 'Độ ưu tiên',
      type: 'dropdown',
      options: [
        { label: 'Khẩn cấp', value: 'urgent', color: '#EF4444' },
        { label: 'Cao', value: 'high', color: '#F97316' },
        { label: 'Trung bình', value: 'medium', color: '#EAB308' },
        { label: 'Thấp', value: 'low', color: '#3B82F6' },
        { label: 'Không', value: 'none', color: '#6B7280' },
      ],
      placeholder: 'Chọn độ ưu tiên...',
    },
    {
      field: 'assigneeIds',
      label: 'Phân công',
      type: 'multi-select',
      options: members.map((m) => ({
        label: m.displayName,
        value: m.userId,
      })),
      placeholder: 'Chọn thành viên...',
    },
    {
      field: 'startDate',
      label: 'Ngày bắt đầu',
      type: 'date',
      placeholder: 'Chọn ngày...',
    },
    {
      field: 'dueDate',
      label: 'Hạn chót',
      type: 'date',
      placeholder: 'Chọn ngày...',
    },
    {
      field: 'estimateValue',
      label: 'Ước lượng',
      type: 'number',
      min: 0.5,
      max: 100,
      step: 0.5,
      placeholder: 'SP...',
    },
  ];
}

/** Tham chiếu sprint tối giản cho dropdown gán sprint */
export interface SprintRef {
  id: string;
  name: string;
  status: string;
}

/**
 * Builds PropertyFieldConfig[] for the "Cấu trúc" (Structure) section.
 *
 * Fields: Labels, Modules (Req 3.3), Sprint
 * Note: Parent task is handled separately by ParentNavigationComponent.
 */
export function buildStructureFields(
  labels: Label[],
  modules: ProjectModule[],
  sprints: SprintRef[] = [],
): PropertyFieldConfig[] {
  return [
    {
      field: 'labelIds',
      label: 'Nhãn',
      type: 'multi-select',
      options: labels.map((l) => ({
        label: l.name,
        value: l.id,
        color: l.color,
      })),
      placeholder: 'Chọn nhãn...',
    },
    {
      field: 'moduleIds',
      label: 'Module',
      type: 'multi-select',
      options: modules.map((m) => ({
        label: m.name,
        value: m.id,
      })),
      placeholder: 'Chọn module...',
    },
    {
      field: 'sprintId',
      label: 'Sprint',
      type: 'dropdown',
      options: sprints.map((s) => ({
        label: s.status === 'active' ? `${s.name} (đang chạy)` : s.name,
        value: s.id,
      })),
      placeholder: 'Chọn sprint...',
      showClear: true,
    },
  ];
}

/**
 * Extracts the current field value from a task object.
 *
 * Maps field names to their corresponding task property values.
 */
export function getTaskFieldValue(task: Task | null, field: string): unknown {
  if (!task) return null;

  switch (field) {
    case 'stateId':
      return task.stateId;
    case 'priority':
      return task.priority;
    case 'assigneeIds':
      return task.assignees?.map((a) => a.userId) ?? [];
    case 'startDate':
      return task.startDate;
    case 'dueDate':
      return task.dueDate;
    case 'estimateValue':
      return task.estimateValue;
    case 'labelIds':
      return task.labels?.map((l) => l.id) ?? [];
    case 'moduleIds':
      return task.modules?.map((m) => m.id) ?? [];
    case 'sprintId':
      return task.sprintId ?? null;
    default:
      return null;
  }
}
