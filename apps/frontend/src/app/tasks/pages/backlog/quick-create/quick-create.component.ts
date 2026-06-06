import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  OnChanges, SimpleChanges, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutService } from '../../../../layout/services/layout.service';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PopoverModule } from 'primeng/popover';
import { InputNumberModule } from 'primeng/inputnumber';

import { ProjectStore } from '../../../../projects/state/project.store';
import { TaskStore } from '../../../state/task.store';
import { LabelStore } from '../../../state/label.store';
import type { TaskType, TaskPriority, CreateTaskDto } from '@mpm/shared-types';

// ─── Static option sets ──────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { label: string; value: TaskPriority; icon: string; color: string }[] = [
  { label: 'Urgent', value: 'urgent', icon: 'pi pi-angle-double-up', color: '#EF4444' },
  { label: 'High',   value: 'high',   icon: 'pi pi-angle-up',        color: '#F97316' },
  { label: 'Medium', value: 'medium', icon: 'pi pi-minus',           color: '#EAB308' },
  { label: 'Low',    value: 'low',    icon: 'pi pi-angle-down',      color: '#3B82F6' },
  { label: 'None',   value: 'none',   icon: 'pi pi-circle',          color: '#9CA3AF' },
];

const TYPE_OPTIONS: { label: string; value: TaskType; icon: string; color: string }[] = [
  { label: 'Epic',    value: 'epic',    icon: 'pi pi-bolt',         color: '#8B5CF6' },
  { label: 'Story',   value: 'story',   icon: 'pi pi-book',         color: '#3B82F6' },
  { label: 'Task',    value: 'task',    icon: 'pi pi-check-circle', color: '#10B981' },
  { label: 'Subtask', value: 'subtask', icon: 'pi pi-minus-circle', color: '#6B7280' },
];

const VALID_CHILDREN: Partial<Record<TaskType, TaskType[]>> = {
  epic:  ['story', 'task'],
  story: ['task'],
  task:  ['subtask'],
};

@Component({
  standalone: true,
  selector: 'app-quick-create',
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, InputTextModule, TextareaModule,
    DatePickerModule, TooltipModule, ToggleSwitchModule, PopoverModule, InputNumberModule,
  ],
  templateUrl: './quick-create.component.html',
  styleUrl: './quick-create.component.css',
})
export class QuickCreateComponent implements OnChanges {
  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);
  private readonly labelStore = inject(LabelStore);
  protected readonly layoutService = inject(LayoutService);

  @Input() visible = false;
  @Input() parentId?: string;
  @Input() parentType?: TaskType;
  @Input() stateId?: string;

  @Output() create = new EventEmitter<CreateTaskDto>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('titleInput') titleInput?: ElementRef<HTMLInputElement>;
  @ViewChild('labelSearchInput') labelSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('parentSearchInput') parentSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('assigneeSearchInput') assigneeSearchInput?: ElementRef<HTMLInputElement>;

  // ─── Assignee Filter signals & computed ──────────────────────────────────
  protected readonly assigneeSearch = signal('');

  protected readonly filteredMembers = computed(() => {
    const query = this.assigneeSearch().trim().toLowerCase();
    const list = this.memberOptions();
    if (!query) return list;
    return list.filter(m => m.displayName.toLowerCase().includes(query));
  });

  protected focusAssigneeSearch(): void {
    setTimeout(() => this.assigneeSearchInput?.nativeElement.focus(), 50);
  }

  // ─── Parent Task signals & computed ──────────────────────────────────────
  protected readonly selectedParentId = signal<string | null>(null);
  protected readonly parentSearch = signal('');

  protected readonly parentOptions = computed(() =>
    this.taskStore.tasks().filter((t) => !t.parentId)
  );

  protected readonly filteredParents = computed(() => {
    const query = this.parentSearch().trim().toLowerCase();
    const list = this.parentOptions();
    if (!query) return list;
    return list.filter(t => t.taskId.toLowerCase().includes(query) || t.title.toLowerCase().includes(query));
  });

  protected readonly selectedParentTitle = computed(() => {
    const id = this.selectedParentId();
    if (!id) return 'Parent';
    const match = this.parentOptions().find(t => t.id === id);
    return match ? `${match.taskId} ${match.title}` : 'Parent';
  });

  protected focusParentSearch(): void {
    setTimeout(() => this.parentSearchInput?.nativeElement.focus(), 50);
  }

  protected onParentSelected(parentId: string | null): void {
    this.selectedParentId.set(parentId);
    const parent = parentId ? this.parentOptions().find(t => t.id === parentId) : null;
    if (parent) {
      const valid = VALID_CHILDREN[parent.type] ?? [];
      if (!valid.includes(this.selectedType())) {
        this.selectedType.set(valid[0] ?? 'task');
      }
    } else {
      if (this.selectedType() === 'subtask') {
        this.selectedType.set('task');
      }
    }
  }

  // ─── Plain form fields ───────────────────────────────────────────────────
  protected title = '';
  protected description = '';
  protected selectedAssigneeIds: string[] = [];
  protected selectedLabelIds: string[] = [];
  protected dueDate: Date | null = null;
  protected startDate: Date | null = null;
  protected estimateValue: number | null = null;
  protected createMore = false;

  // ─── Signals ─────────────────────────────────────────────────────────────
  protected readonly selectedType = signal<TaskType>('task');
  protected readonly selectedPriority = signal<TaskPriority>('none');
  protected readonly selectedStateId = signal('');

  // ─── Option lists ────────────────────────────────────────────────────────
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly availableTypes = computed(() => {
    const activeParentId = this.selectedParentId();
    const parent = activeParentId
      ? this.parentOptions().find((t) => t.id === activeParentId)
      : null;
    if (parent) {
      const valid = VALID_CHILDREN[parent.type] ?? [];
      return TYPE_OPTIONS.filter((t) => valid.includes(t.value));
    }
    return TYPE_OPTIONS.filter((t) => t.value !== 'subtask');
  });

  // ─── Data sources ────────────────────────────────────────────────────────
  protected readonly stateOptions = computed(() => {
    const grouped = this.projectStore.currentProjectStates();
    return grouped ? Object.values(grouped).flat() : [];
  });

  protected readonly memberOptions = computed(() => this.projectStore.members());

  protected readonly labelOptions = computed(() =>
    this.taskStore.labels().map((l) => ({ id: l.id, name: l.name, color: l.color, isExclusive: l.isExclusive, description: l.description })),
  );

  // ─── Computed display values ─────────────────────────────────────────────
  protected readonly selectedStateColor = computed(() =>
    this.stateOptions().find((s) => s.id === this.selectedStateId())?.color ?? '#9CA3AF',
  );

  protected readonly selectedStateName = computed(() =>
    this.stateOptions().find((s) => s.id === this.selectedStateId())?.name ?? 'State',
  );

  protected readonly selectedPriorityConfig = computed(() =>
    PRIORITY_OPTIONS.find((p) => p.value === this.selectedPriority()) ?? PRIORITY_OPTIONS[4],
  );

  protected readonly selectedTypeConfig = computed(() =>
    TYPE_OPTIONS.find((t) => t.value === this.selectedType()) ?? TYPE_OPTIONS[2],
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────
  protected readonly labelSearch = signal('');

  protected readonly filteredLabels = computed(() => {
    const query = this.labelSearch().trim().toLowerCase();
    const allLabels = this.labelOptions();
    if (!query) return allLabels;
    return allLabels.filter(l => l.name.toLowerCase().includes(query));
  });

  protected isScoped(name: string): boolean {
    return name.includes('::');
  }

  protected getScope(name: string): string {
    return name.split('::')[0].trim();
  }

  protected getValue(name: string): string {
    return name.split('::').slice(1).join('::').trim();
  }

  protected getTextColor(bgColor: string): string {
    if (!bgColor) return '#ffffff';
    const color = bgColor.replace('#', '');
    if (color.length !== 6) return '#ffffff';
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#1f2937' : '#ffffff';
  }

  protected getMemberInitial(userId: string): string {
    return this.memberOptions().find((m) => m.userId === userId)?.displayName[0]?.toUpperCase() ?? '?';
  }

  protected getMemberName(userId: string): string {
    return this.memberOptions().find((m) => m.userId === userId)?.displayName ?? userId;
  }

  protected getLabelColor(id: string): string {
    return this.labelOptions().find((l) => l.id === id)?.color ?? '#9CA3AF';
  }

  protected getLabelName(id: string): string {
    return this.labelOptions().find((l) => l.id === id)?.name ?? id;
  }

  protected getLabelDescription(id: string): string | undefined {
    return this.labelOptions().find((l) => l.id === id)?.description || undefined;
  }

  protected toggleAssignee(userId: string): void {
    this.selectedAssigneeIds = this.selectedAssigneeIds.includes(userId)
      ? this.selectedAssigneeIds.filter((id) => id !== userId)
      : [...this.selectedAssigneeIds, userId];
  }

  protected toggleLabel(labelId: string): void {
    const label = this.labelOptions().find(l => l.id === labelId);
    if (!label) return;

    const isScoped = label.name.includes('::');
    if (isScoped && label.isExclusive !== false) {
      const scope = label.name.split('::')[0].trim().toLowerCase();
      const isCurrentlySelected = this.selectedLabelIds.includes(labelId);

      if (isCurrentlySelected) {
        this.selectedLabelIds = this.selectedLabelIds.filter(id => id !== labelId);
      } else {
        // Deselect other labels of the same scope ONLY if they/it is exclusive!
        const otherSameScopeIds = this.labelOptions()
          .filter(l => l.id !== labelId && l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope && l.isExclusive !== false)
          .map(l => l.id);
        this.selectedLabelIds = this.selectedLabelIds.filter(id => !otherSameScopeIds.includes(id));
        this.selectedLabelIds = [...this.selectedLabelIds, labelId];
      }
    } else {
      this.selectedLabelIds = this.selectedLabelIds.includes(labelId)
        ? this.selectedLabelIds.filter((id) => id !== labelId)
        : [...this.selectedLabelIds, labelId];
    }
  }

  protected getScopeColor(name: string, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    const allLabels = this.labelOptions();
    const match = allLabels.find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    return match ? match.color : fallbackColor;
  }

  protected isOverdue(): boolean {
    return !!this.dueDate && this.dueDate < new Date();
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true && !changes['visible'].previousValue) {
      const activeParentId = this.parentId ?? null;
      this.selectedParentId.set(activeParentId);
      this.parentSearch.set('');
      this.assigneeSearch.set('');

      const activeParent = activeParentId
        ? this.parentOptions().find((t) => t.id === activeParentId)
        : null;
      const defaultType = activeParent
        ? (VALID_CHILDREN[activeParent.type]?.[0] ?? 'task')
        : 'task';

      this.selectedType.set(defaultType);
      this.selectedPriority.set('none');
      this.selectedAssigneeIds = [];
      this.selectedLabelIds = [];
      this.dueDate = null;
      this.startDate = null;
      this.estimateValue = null;
      this.title = '';
      this.description = '';

      const defaultState = this.stateId
        ?? this.stateOptions().find((s) => s.isDefault)?.id
        ?? this.stateOptions()[0]?.id
        ?? '';
      this.selectedStateId.set(defaultState);

      setTimeout(() => this.titleInput?.nativeElement.focus(), 80);
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  protected onSubmit(): void {
    const t = this.title.trim();
    if (!t) return;

    this.create.emit({
      title: t,
      type: this.selectedType(),
      priority: this.selectedPriority() !== 'none' ? this.selectedPriority() : undefined,
      description: this.description.trim() || undefined,
      stateId: this.selectedStateId() || undefined,
      assigneeIds: this.selectedAssigneeIds.length ? this.selectedAssigneeIds : undefined,
      labelIds: this.selectedLabelIds.length ? this.selectedLabelIds : undefined,
      estimateValue: this.estimateValue ?? undefined,
      startDate: this.startDate ? this.startDate.toISOString().split('T')[0] : undefined,
      dueDate: this.dueDate ? this.dueDate.toISOString().split('T')[0] : undefined,
      parentId: this.selectedParentId() || undefined,
    });

    if (this.createMore) {
      this.title = '';
      this.description = '';
      setTimeout(() => this.titleInput?.nativeElement.focus(), 50);
    } else {
      this.resetForm();
    }
  }

  protected onCancel(): void {
    this.resetForm();
    this.cancel.emit();
  }

  protected focusLabelSearch(): void {
    setTimeout(() => this.labelSearchInput?.nativeElement.focus(), 50);
  }

  protected onLabelSearchEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const query = this.labelSearch().trim();
    if (!query) return;

    const filtered = this.filteredLabels();
    if (filtered.length === 1) {
      this.toggleLabel(filtered[0].id);
      this.labelSearch.set('');
    } else if (filtered.length === 0 && !this.hasExactMatch()) {
      this.quickCreateLabel();
    }
  }

  protected hasExactMatch(): boolean {
    const query = this.labelSearch().trim().toLowerCase();
    if (!query) return false;
    return this.labelOptions().some(l => l.name.toLowerCase() === query);
  }

  protected quickCreateLabel(): void {
    const query = this.labelSearch().trim();
    if (!query) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;

    let chosenColor = '';
    if (query.includes('::')) {
      const scope = query.split('::')[0].trim().toLowerCase();
      const match = this.labelOptions().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
      if (match) {
        chosenColor = match.color;
      }
    }

    if (!chosenColor) {
      const colorPresets = [
        '#EF4444', '#F97316', '#F59E0B', '#10B981', '#0D9488',
        '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#6B7280',
      ];
      const idx = Math.floor(Math.random() * colorPresets.length);
      chosenColor = colorPresets[idx];
    }

    this.labelStore.createLabel(projectId, {
      name: query,
      color: chosenColor,
      isExclusive: true,
    }).then((created) => {
      if (created) {
        this.toggleLabel(created.id);
        this.labelSearch.set('');
      }
    });
  }

  private resetForm(): void {
    this.title = '';
    this.description = '';
    this.selectedType.set('task');
    this.selectedPriority.set('none');
    this.selectedAssigneeIds = [];
    this.selectedLabelIds = [];
    this.dueDate = null;
    this.startDate = null;
    this.estimateValue = null;
    this.createMore = false;
    this.labelSearch.set('');
    this.selectedParentId.set(null);
    this.parentSearch.set('');
    this.assigneeSearch.set('');
  }
}
