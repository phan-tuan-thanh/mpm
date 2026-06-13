import type { PropertyFieldConfig } from '../inline-property-editor/inline-property-editor.component';
import type { Label, ProjectModule } from '@mpm/shared-types';
import type { MemberResponse, ProjectState } from '@mpm/shared-types';
import type { Task } from '@mpm/shared-types';
import { CustomTranslationService } from '../../../../../shared/services/custom-translation.service';

/**
 * Builds PropertyFieldConfig[] for the "Chi tiết" (Details) section.
 *
 * Fields: State, Priority, Assignees, Start Date, Due Date, Estimate (Req 3.2)
 */
export function buildDetailFields(
  states: ProjectState[],
  members: MemberResponse[],
  isDarkMode = false,
  isEn = false,
  customTrans?: CustomTranslationService,
): PropertyFieldConfig[] {
  const tTrans = (key: string, defaultValue: string) => customTrans ? customTrans.t(key, defaultValue) : defaultValue;
  return [
    {
      field: 'stateId',
      label: tTrans('properties.state', isEn ? 'State' : 'Trạng thái'),
      type: 'dropdown',
      options: states.map((s) => ({
        label: s.name,
        value: s.id,
        color: isDarkMode ? s.colorDark : s.colorLight,
      })),
      placeholder: isEn ? 'Select state...' : 'Chọn trạng thái...',
    },
    {
      field: 'priority',
      label: tTrans('properties.priority', isEn ? 'Priority' : 'Độ ưu tiên'),
      type: 'dropdown',
      options: [
        { label: isEn ? 'Urgent' : 'Khẩn cấp', value: 'urgent', color: '#EF4444' },
        { label: isEn ? 'High' : 'Cao', value: 'high', color: '#F97316' },
        { label: isEn ? 'Medium' : 'Trung bình', value: 'medium', color: '#EAB308' },
        { label: isEn ? 'Low' : 'Thấp', value: 'low', color: '#3B82F6' },
        { label: isEn ? 'None' : 'Không', value: 'none', color: '#6B7280' },
      ],
      placeholder: isEn ? 'Select priority...' : 'Chọn độ ưu tiên...',
    },
    {
      field: 'assigneeIds',
      label: tTrans('properties.assignees', isEn ? 'Assignees' : 'Phân công'),
      type: 'multi-select',
      options: members.map((m) => ({
        label: m.displayName,
        value: m.userId,
      })),
      placeholder: isEn ? 'Select assignees...' : 'Chọn thành viên...',
    },
    {
      field: 'startDate',
      label: tTrans('properties.startDate', isEn ? 'Start date' : 'Ngày bắt đầu'),
      type: 'date',
      placeholder: isEn ? 'Select date...' : 'Chọn ngày...',
    },
    {
      field: 'dueDate',
      label: tTrans('properties.dueDate', isEn ? 'Due date' : 'Hạn chót'),
      type: 'date',
      placeholder: isEn ? 'Select date...' : 'Chọn ngày...',
    },
    {
      field: 'estimateValue',
      label: tTrans('properties.estimate', isEn ? 'Estimate' : 'Ước lượng'),
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
  isDarkMode = false,
  isEn = false,
  customTrans?: CustomTranslationService,
): PropertyFieldConfig[] {
  const tTrans = (key: string, defaultValue: string) => customTrans ? customTrans.t(key, defaultValue) : defaultValue;
  return [
    {
      field: 'labelIds',
      label: tTrans('properties.labels', isEn ? 'Labels' : 'Nhãn'),
      type: 'multi-select',
      options: labels.map((l) => ({
        label: l.name,
        value: l.id,
        color: isDarkMode ? l.colorDark : l.colorLight,
      })),
      placeholder: isEn ? 'Select labels...' : 'Chọn nhãn...',
    },
    {
      field: 'moduleIds',
      label: tTrans('properties.modules', isEn ? 'Modules' : 'Module'),
      type: 'multi-select',
      options: modules.map((m) => ({
        label: m.name,
        value: m.id,
      })),
      placeholder: isEn ? 'Select modules...' : 'Chọn module...',
    },
    {
      field: 'sprintId',
      label: tTrans('properties.sprint', isEn ? 'Sprint' : 'Sprint'),
      type: 'dropdown',
      options: sprints.map((s) => ({
        label: s.status === 'active' ? (isEn ? `${s.name} (active)` : `${s.name} (đang chạy)`) : s.name,
        value: s.id,
      })),
      placeholder: isEn ? 'Select sprint...' : 'Chọn sprint...',
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
