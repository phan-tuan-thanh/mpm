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
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PopoverModule } from 'primeng/popover';
import { InputNumberModule } from 'primeng/inputnumber';

import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { ProjectStore } from '../../../../projects/state/project.store';
import { TaskStore } from '../../../state/task.store';
import { LabelStore } from '../../../state/label.store';
import { ModuleStore } from '../../../state/module.store';
import { AttachmentService } from '../../../services/attachment.service';
import { LinkService } from '../../../services/link.service';
import { TaskService } from '../../../services/task.service';
import { MessageService } from 'primeng/api';
import { TaskAttachmentsComponent } from '../../../components/task-detail-panel/components/task-attachments.component';
import { TaskLinksComponent } from '../../../components/task-detail-panel/components/task-links.component';
import { SubItemsSectionComponent } from '../../../components/task-detail-panel/components/sub-items-section/sub-items-section.component';
import type { TaskType, TaskPriority, CreateTaskDto, TiptapDoc, Task, TaskAttachment, TaskLink, SubItemTreeNode, CreateSubItemDto } from '@mpm/shared-types';
import { firstValueFrom } from 'rxjs';

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

import { DrawerModule } from 'primeng/drawer';

@Component({
  standalone: true,
  selector: 'app-quick-create',
  imports: [
    CommonModule, FormsModule,
    DialogModule, DrawerModule, ButtonModule, InputTextModule,
    SelectModule, MultiSelectModule,
    DatePickerModule, TooltipModule, ToggleSwitchModule, PopoverModule, InputNumberModule,
    RichTextEditorComponent,
    TaskAttachmentsComponent,
    TaskLinksComponent,
    SubItemsSectionComponent,
  ],
  providers: [MessageService],
  templateUrl: './quick-create.component.html',
  styleUrl: './quick-create.component.css',
})
export class QuickCreateComponent implements OnChanges {
  private readonly projectStore = inject(ProjectStore);
  private readonly taskStore = inject(TaskStore);
  private readonly labelStore = inject(LabelStore);
  private readonly moduleStore = inject(ModuleStore);
  protected readonly layoutService = inject(LayoutService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly linkService = inject(LinkService);
  private readonly taskService = inject(TaskService);
  private readonly messageService = inject(MessageService);

  @Input() visible = false;
  @Input() parentId?: string;
  @Input() parentType?: TaskType;
  @Input() stateId?: string;
  @Input() viewMode: 'right-pane' | 'full-page' | 'popup' = 'popup';
  @Input() draftTask?: Task;

  @Output() create = new EventEmitter<{
    dto: CreateTaskDto;
    files: File[];
    links: { url: string; title?: string }[];
    createMore: boolean;
  }>();
  @Output() cancel = new EventEmitter<void>();
  @Output() viewModeChange = new EventEmitter<'right-pane' | 'full-page' | 'popup'>();

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

  protected readonly parentSelectOptions = computed(() => [
    { id: null as string | null, label: 'Không có parent' },
    ...this.parentOptions().map(t => ({ id: t.id as string | null, label: `${t.taskId} — ${t.title}` })),
  ]);

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
  protected description: TiptapDoc | null = null;
  protected pendingFiles: File[] = [];
  protected pendingLinks: { url: string; title?: string }[] = [];
  protected newLinkUrl = '';
  protected newLinkTitle = '';
  protected selectedAssigneeIds: string[] = [];
  protected selectedLabelIds: string[] = [];
  protected selectedModuleIds: string[] = [];
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

  protected readonly moduleOptions = computed(() => this.moduleStore.modules());

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

  protected toggleModule(moduleId: string): void {
    this.selectedModuleIds = this.selectedModuleIds.includes(moduleId)
      ? this.selectedModuleIds.filter((id) => id !== moduleId)
      : [...this.selectedModuleIds, moduleId];
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

  protected onMultiLabelChange(newIds: string[]): void {
    const addedId = newIds.find(id => !this.selectedLabelIds.includes(id));
    if (addedId) {
      const addedLabel = this.labelOptions().find(l => l.id === addedId);
      if (addedLabel && addedLabel.name.includes('::') && addedLabel.isExclusive !== false) {
        const scope = addedLabel.name.split('::')[0].trim().toLowerCase();
        this.selectedLabelIds = newIds.filter(id => {
          if (id === addedId) return true;
          const label = this.labelOptions().find(l => l.id === id);
          if (label && label.name.includes('::') && label.isExclusive !== false) {
            return label.name.split('::')[0].trim().toLowerCase() !== scope;
          }
          return true;
        });
        return;
      }
    }
    this.selectedLabelIds = newIds;
  }

  // ─── Sub-items signals ──────────────────────────────────────────────────
  protected readonly subItemsTree = signal<SubItemTreeNode[]>([]);
  protected readonly subItemsTotalCount = signal(0);
  protected readonly subItemsDoneCount = signal(0);



  // ─── Attachments, Links & Sub-items handlers ─────────────────────────────
  protected onFileUpload(event: { files: FileList; title: string }): void {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;
    const title = event.title || undefined;
    Array.from(event.files).forEach(file => {
      this.attachmentService.upload(projectId, this.draftTask!.id, file, title).subscribe({
        next: (attachment) => {
          this.draftTask!.attachments = [...(this.draftTask!.attachments ?? []), attachment];
          this.draftTask!.attachmentCount = (this.draftTask!.attachmentCount ?? 0) + 1;
        },
        error: (err) =>
          this.messageService.add({
            severity: 'error',
            summary: err.error?.message ?? 'Upload thất bại',
          }),
      });
    });
  }

  protected deleteAttachment(att: TaskAttachment): void {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;
    this.attachmentService.delete(projectId, this.draftTask!.id, att.id).subscribe(() => {
      this.draftTask!.attachments = (this.draftTask!.attachments ?? []).filter(a => a.id !== att.id);
      this.draftTask!.attachmentCount = Math.max(0, (this.draftTask!.attachmentCount ?? 0) - 1);
    });
  }

  protected deleteAttachmentGroup(atts: TaskAttachment[]): void {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;
    atts.forEach(att => {
      this.attachmentService.delete(projectId, this.draftTask!.id, att.id).subscribe(() => {
        this.draftTask!.attachments = (this.draftTask!.attachments ?? []).filter(a => a.id !== att.id);
        this.draftTask!.attachmentCount = Math.max(0, (this.draftTask!.attachmentCount ?? 0) - 1);
      });
    });
  }

  protected onBatchUpdateAttachments(items: Array<{ id: string; title?: string | null; sortOrder?: number }>): void {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;
    this.attachmentService.batchUpdate(projectId, this.draftTask!.id, items).subscribe({
      next: () => {
        const map = new Map(items.map(i => [i.id, i]));
        this.draftTask!.attachments = (this.draftTask!.attachments ?? []).map(a => {
          const u = map.get(a.id);
          return u ? { ...a, ...u } : a;
        });
      }
    });
  }

  protected addLink(event: { url: string; title?: string }): void {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;
    this.linkService.addLink(projectId, this.draftTask!.id, event).subscribe({
      next: (link) => {
        this.draftTask!.links = [...(this.draftTask!.links ?? []), link];
        this.draftTask!.linkCount = (this.draftTask!.linkCount ?? 0) + 1;
      },
      error: (err) =>
        this.messageService.add({
          severity: 'error',
          summary: err.error?.message ?? 'Lỗi',
        }),
    });
  }

  protected deleteLink(link: TaskLink): void {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;
    this.linkService.deleteLink(projectId, this.draftTask!.id, link.id).subscribe(() => {
      this.draftTask!.links = (this.draftTask!.links ?? []).filter(l => l.id !== link.id);
      this.draftTask!.linkCount = Math.max(0, (this.draftTask!.linkCount ?? 0) - 1);
    });
  }

  protected onCreateSubItem(dto: CreateSubItemDto): void {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;
    this.taskStore.createTask(projectId, {
      title: dto.title,
      parentId: dto.parentId,
      type: this.draftTask.type === 'epic' ? 'story' : this.draftTask.type === 'story' ? 'task' : 'subtask',
      assigneeIds: dto.assigneeIds,
      priority: dto.priority,
      dueDate: dto.dueDate,
      isDraft: true,
    } as any).then(() => {
      this.loadSubItems();
    });
  }

  protected async onSubItemSaveRequested(payload: {
    moves: Array<{ taskId: string; newParentId: string | null; oldParentId: string | null }>;
    parentOrders: Array<{ parentId: string | null; childIds: string[] }>;
  }): Promise<void> {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;

    const reparentCalls = payload.moves
      .filter(m => m.newParentId !== m.oldParentId)
      .map(m =>
        firstValueFrom(
          this.taskService.updateTask(projectId, m.taskId, {
            parentId: m.newParentId ?? this.draftTask!.id,
          }),
        ),
      );
    await Promise.allSettled(reparentCalls);

    const reorderCalls = payload.parentOrders
      .filter(po => po.childIds.length > 0)
      .map(po =>
        firstValueFrom(
          this.taskService.reorderTasks(projectId, {
            items: po.childIds.map((id, idx) => ({
              taskId: id,
              backlogOrder: (idx + 1) * 1000,
            })),
          }),
        ),
      );
    await Promise.allSettled(reorderCalls);

    this.loadSubItems();
  }

  protected loadSubItems(): void {
    if (!this.draftTask) return;
    const projectId = this.projectStore.currentProject()?.id;
    if (!projectId) return;
    this.taskService.getSubItemsTree(projectId, this.draftTask.id).subscribe((res) => {
      if (res) {
        this.subItemsTree.set(res.items);
        this.subItemsTotalCount.set(res.totalCount);
        this.subItemsDoneCount.set(res.doneCount);
      }
    });
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
      this.selectedModuleIds = [];
      this.dueDate = null;
      this.startDate = null;
      this.estimateValue = null;
      this.title = '';
      this.description = null;

      const defaultState = this.stateId
        ?? this.stateOptions().find((s) => s.isDefault)?.id
        ?? this.stateOptions()[0]?.id
        ?? '';
      this.selectedStateId.set(defaultState);

      const projectId = this.projectStore.currentProject()?.id;
      if (projectId) {
        this.projectStore.loadMembers(projectId);
        this.moduleStore.loadModules(projectId);
        this.taskStore.loadLabels(projectId);
      }

      this.loadSubItems();
      setTimeout(() => this.titleInput?.nativeElement.focus(), 80);
    }

    if (changes['draftTask']?.currentValue) {
      this.loadSubItems();
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  protected onSubmit(): void {
    const t = this.title.trim();
    if (!t) return;

    this.create.emit({
      dto: {
        title: t,
        type: this.selectedType(),
        priority: this.selectedPriority() !== 'none' ? this.selectedPriority() : undefined,
        description: this.description ?? undefined,
        stateId: this.selectedStateId() || undefined,
        assigneeIds: this.selectedAssigneeIds.length ? this.selectedAssigneeIds : undefined,
        labelIds: this.selectedLabelIds.length ? this.selectedLabelIds : undefined,
        moduleIds: this.selectedModuleIds.length ? this.selectedModuleIds : undefined,
        estimateValue: this.estimateValue ?? undefined,
        startDate: this.startDate ? this.startDate.toISOString().split('T')[0] : undefined,
        dueDate: this.dueDate ? this.dueDate.toISOString().split('T')[0] : undefined,
        parentId: this.selectedParentId() || undefined,
      },
      files: this.pendingFiles,
      links: this.pendingLinks,
      createMore: this.createMore,
    });

    if (this.createMore) {
      this.title = '';
      this.description = null;
      this.pendingFiles = [];
      this.pendingLinks = [];
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

  protected addPendingLink(): void {
    const url = this.newLinkUrl.trim();
    if (!url) return;
    this.pendingLinks = [...this.pendingLinks, { url, title: this.newLinkTitle.trim() || undefined }];
    this.newLinkUrl = '';
    this.newLinkTitle = '';
  }

  protected removePendingLink(idx: number): void {
    this.pendingLinks = this.pendingLinks.filter((_, i) => i !== idx);
  }

  protected onFilesSelected(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      this.pendingFiles = [...this.pendingFiles, ...Array.from(files)];
    }
    (event.target as HTMLInputElement).value = '';
  }

  protected removePendingFile(idx: number): void {
    this.pendingFiles = this.pendingFiles.filter((_, i) => i !== idx);
  }

  private resetForm(): void {
    this.title = '';
    this.description = null;
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
    this.pendingFiles = [];
    this.pendingLinks = [];
    this.newLinkUrl = '';
    this.newLinkTitle = '';
    this.subItemsTree.set([]);
    this.subItemsTotalCount.set(0);
    this.subItemsDoneCount.set(0);
    this.selectedModuleIds = [];
  }
}
