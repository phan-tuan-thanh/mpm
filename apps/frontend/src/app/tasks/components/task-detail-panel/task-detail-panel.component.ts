import {
  Component, OnInit, OnDestroy, inject, signal, computed, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';

import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { TaskService } from '../../services/task.service';
import { AttachmentService } from '../../services/attachment.service';
import { LinkService } from '../../services/link.service';
import { RelationService } from '../../services/relation.service';
import type { Task, TaskActivity, TaskAttachment, TaskLink } from '@mpm/shared-types';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-task-detail-panel',
  imports: [
    CommonModule, FormsModule,
    DrawerModule, ButtonModule, SelectModule, InputTextModule,
    TextareaModule, DatePickerModule, InputNumberModule, MultiSelectModule,
    TagModule, ToastModule, TabsModule,
  ],
  providers: [MessageService],
  template: `
    <p-drawer
      [(visible)]="isVisible"
      position="right"
      [style]="{ width: '680px' }"
      [modal]="false"
      (onHide)="onClose()"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2 w-full">
          @if (task()) {
            <span class="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
              (click)="copyTaskId(task()!.taskId)">
              {{ task()!.taskId }}
            </span>
            <!-- Saving indicator -->
            @switch (taskStore.saveStatus()) {
              @case ('saving') { <span class="text-xs text-indigo-500 animate-pulse">Đang lưu...</span> }
              @case ('saved') { <span class="text-xs text-green-500">✓ Đã lưu</span> }
              @case ('error') { <span class="text-xs text-red-500">✗ Lỗi lưu</span> }
            }
          }
          <div class="flex-1"></div>
          <button pButton icon="pi pi-external-link" size="small" text severity="secondary" pTooltip="Mở full page"></button>
        </div>
      </ng-template>

      @if (task()) {
        <div class="flex flex-col h-full overflow-hidden">
          <!-- Title -->
          <div class="px-4 pt-2 pb-4 border-b border-gray-100 dark:border-surface-700">
            <input
              pInputText
              class="w-full text-lg font-semibold border-none shadow-none focus:ring-0 bg-transparent"
              [(ngModel)]="editTitle"
              (blur)="saveTitle()"
              (keydown.enter)="saveTitle()"
            />
          </div>

          <!-- Tabs -->
          <p-tabs [value]="'overview'" class="flex-1 overflow-hidden flex flex-col">
            <p-tablist>
              <p-tab value="overview">Tổng quan</p-tab>
              <p-tab value="subitems">Sub-items {{ task()!.children?.length ? '('+task()!.children!.length+')' : '' }}</p-tab>
              <p-tab value="relations">Relations</p-tab>
              <p-tab value="activity">Activity</p-tab>
            </p-tablist>

            <p-tabpanels class="flex-1 overflow-y-auto">
              <!-- Overview tab -->
              <p-tabpanel value="overview">
                <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm p-2">
                  <!-- State -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">State</label>
                    <p-select
                      [options]="stateOptions()"
                      [(ngModel)]="editStateId"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Chọn state"
                      styleClass="w-full text-sm"
                      (ngModelChange)="saveField('stateId', $event)"
                    />
                  </div>

                  <!-- Priority -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Priority</label>
                    <p-select
                      [options]="priorityOptions"
                      [(ngModel)]="editPriority"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Chọn priority"
                      styleClass="w-full text-sm"
                      (ngModelChange)="saveField('priority', $event)"
                    />
                  </div>

                  <!-- Assignees -->
                  <div class="col-span-2">
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Assignees</label>
                    <p-multiselect
                      [options]="memberOptions()"
                      [(ngModel)]="editAssigneeIds"
                      optionLabel="displayName"
                      optionValue="userId"
                      placeholder="Thêm assignee"
                      styleClass="w-full text-sm"
                      (ngModelChange)="saveField('assigneeIds', $event)"
                    />
                  </div>

                  <!-- Estimate -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Estimate</label>
                    <p-inputnumber
                      [(ngModel)]="editEstimate"
                      [min]="0"
                      styleClass="w-full text-sm"
                      (onBlur)="saveField('estimateValue', editEstimate)"
                    />
                  </div>

                  <!-- Start date -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Bắt đầu</label>
                    <p-datepicker
                      [(ngModel)]="editStartDate"
                      dateFormat="dd/mm/yy"
                      styleClass="w-full text-sm"
                      (ngModelChange)="saveField('startDate', formatDateToISO($event))"
                    />
                  </div>

                  <!-- Due date -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Hết hạn</label>
                    <p-datepicker
                      [(ngModel)]="editDueDate"
                      dateFormat="dd/mm/yy"
                      styleClass="w-full text-sm"
                      [class.border-red-500]="isOverdue()"
                      (ngModelChange)="saveField('dueDate', formatDateToISO($event))"
                    />
                  </div>

                  <!-- Reporter -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Reporter</label>
                    <span class="text-gray-700 dark:text-surface-200">{{ task()!.reporter?.displayName }}</span>
                  </div>

                  <!-- Created -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Tạo lúc</label>
                    <span class="text-gray-500 text-xs">{{ task()!.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                </div>

                <!-- Description -->
                <div class="mt-4 px-2">
                  <label class="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Mô tả</label>
                  <textarea
                    pTextarea
                    class="w-full text-sm resize-none"
                    rows="6"
                    placeholder="Thêm mô tả..."
                    [(ngModel)]="editDescription"
                    (blur)="saveDescription()"
                  ></textarea>
                </div>

                <!-- Attachments -->
                <div class="mt-4 px-2">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs text-gray-500 uppercase tracking-wide">Attachments ({{ task()!.attachments?.length ?? 0 }})</label>
                    <label class="cursor-pointer">
                      <input type="file" class="hidden" (change)="onFileUpload($event)" multiple />
                      <span class="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer">+ Upload</span>
                    </label>
                  </div>
                  @for (att of task()!.attachments; track att.id) {
                    <div class="flex items-center gap-2 py-1 text-sm">
                      <span class="text-gray-500">📎</span>
                      <a [href]="attachmentService.getDownloadUrl(projectId(), task()!.id, att.id)" class="flex-1 text-indigo-600 hover:underline truncate">{{ att.originalName }}</a>
                      <span class="text-xs text-gray-400">{{ formatSize(att.sizeBytes) }}</span>
                      <button pButton icon="pi pi-times" severity="danger" size="small" text (click)="deleteAttachment(att)"></button>
                    </div>
                  }
                </div>

                <!-- Links -->
                <div class="mt-4 px-2">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs text-gray-500 uppercase tracking-wide">Links ({{ task()!.links?.length ?? 0 }})</label>
                  </div>
                  @for (link of task()!.links; track link.id) {
                    <div class="flex items-center gap-2 py-1 text-sm">
                      <span>🔗</span>
                      <a [href]="link.url" target="_blank" class="flex-1 text-indigo-600 hover:underline truncate">{{ link.title || link.url }}</a>
                      <button pButton icon="pi pi-times" severity="danger" size="small" text (click)="deleteLink(link)"></button>
                    </div>
                  }
                  <!-- Add link -->
                  <div class="flex gap-2 mt-1">
                    <input pInputText class="flex-1 text-xs" placeholder="URL..." [(ngModel)]="newLinkUrl" />
                    <input pInputText class="flex-1 text-xs" placeholder="Title (tùy chọn)" [(ngModel)]="newLinkTitle" />
                    <button pButton label="Thêm" size="small" (click)="addLink()" [disabled]="!newLinkUrl.trim()"></button>
                  </div>
                </div>
              </p-tabpanel>

              <!-- Sub-items tab -->
              <p-tabpanel value="subitems">
                <div class="space-y-1 p-2">
                  @for (child of task()!.children ?? []; track child.id) {
                    <div
                      class="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-surface-800 cursor-pointer text-sm"
                      (click)="openChildTask(child.taskId)"
                    >
                      <span class="font-mono text-xs text-gray-400">{{ child.taskId }}</span>
                      <span class="flex-1 text-gray-800 dark:text-surface-100">{{ child.title }}</span>
                      @if (child.state) {
                        <span class="text-xs px-1.5 py-0.5 rounded"
                          [style.background]="child.state.color + '22'"
                          [style.color]="child.state.color"
                        >{{ child.state.name }}</span>
                      }
                    </div>
                  }
                  <!-- Quick add child -->
                  <div class="flex gap-2 mt-2">
                    <input pInputText class="flex-1 text-sm" placeholder="Thêm sub-item..." [(ngModel)]="newChildTitle"
                      (keydown.enter)="addSubItem()" />
                    <button pButton label="Thêm" size="small" (click)="addSubItem()" [disabled]="!newChildTitle.trim()"></button>
                  </div>
                </div>
              </p-tabpanel>

              <!-- Relations tab -->
              <p-tabpanel value="relations">
                <div class="p-2 space-y-4 text-sm">
                  @for (group of relationGroups(); track group.type) {
                    @if (group.relations.length > 0) {
                      <div>
                        <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">{{ group.label }}</h4>
                        @for (rel of group.relations; track rel.id) {
                          <div class="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-surface-800">
                            <span class="font-mono text-xs text-gray-400">{{ rel.targetTask?.taskId }}</span>
                            <span class="flex-1">{{ rel.targetTask?.title }}</span>
                            <button pButton icon="pi pi-times" size="small" text severity="danger" (click)="deleteRelation(rel.id)"></button>
                          </div>
                        }
                      </div>
                    }
                  }
                  <!-- Add relation -->
                  <div class="border-t border-gray-100 pt-3">
                    <h4 class="text-xs text-gray-500 mb-2">Thêm relation</h4>
                    <div class="flex gap-2">
                      <input pInputText class="flex-1 text-sm" placeholder="Task ID..." [(ngModel)]="newRelationTaskId" />
                      <p-select [options]="relationTypeOptions" [(ngModel)]="newRelationType" optionLabel="label" optionValue="value" styleClass="text-sm" />
                      <button pButton label="Thêm" size="small" (click)="addRelation()" [disabled]="!newRelationTaskId.trim()"></button>
                    </div>
                  </div>
                </div>
              </p-tabpanel>

              <!-- Activity tab -->
              <p-tabpanel value="activity">
                <div class="p-2 space-y-3">
                  @for (entry of activity(); track entry.id) {
                    <div class="flex gap-3 text-sm">
                      <div class="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                        {{ (entry.actorName ?? '?')[0].toUpperCase() }}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-baseline gap-2">
                          <span class="font-medium text-gray-800 dark:text-surface-100">{{ entry.actorName ?? 'Unknown' }}</span>
                          <span class="text-xs text-gray-400">{{ formatRelativeTime(entry.createdAt) }}</span>
                        </div>
                        @if (entry.entryType === 'comment_added' || entry.entryType === 'comment_edited') {
                          <p class="text-gray-700 dark:text-surface-200 mt-0.5">{{ entry.comment }}</p>
                          @if (entry.actorId === currentUserId()) {
                            <div class="flex gap-2 mt-1">
                              <button pButton label="Sửa" size="small" text (click)="editComment(entry)"></button>
                              <button pButton label="Xóa" size="small" text severity="danger" (click)="deleteComment(entry.id)"></button>
                            </div>
                          }
                        } @else {
                          <p class="text-gray-500 mt-0.5 text-xs">
                            {{ formatActivity(entry) }}
                          </p>
                        }
                      </div>
                    </div>
                  }

                  <!-- Add comment -->
                  <div class="border-t border-gray-100 dark:border-surface-700 pt-3">
                    <textarea pTextarea class="w-full text-sm" rows="3" placeholder="Viết bình luận..."
                      [(ngModel)]="newComment"></textarea>
                    <div class="flex justify-end mt-2">
                      <button pButton label="Gửi" size="small" (click)="submitComment()" [disabled]="!newComment.trim()"></button>
                    </div>
                  </div>
                </div>
              </p-tabpanel>
            </p-tabpanels>
          </p-tabs>
        </div>
      }
    </p-drawer>

    <p-toast />
  `,
})
export class TaskDetailPanelComponent implements OnInit, OnDestroy {
  readonly taskStore = inject(TaskStore);
  readonly projectStore = inject(ProjectStore);
  readonly attachmentService = inject(AttachmentService);
  private readonly taskService = inject(TaskService);
  private readonly linkService = inject(LinkService);
  private readonly relationService = inject(RelationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  constructor() {
    effect(() => {
      if (this.task()) {
        this.syncFields();
        this.loadActivity();
      }
    });
  }

  readonly task = this.taskStore.currentTask;
  readonly isVisible = signal(false);

  // Edit fields
  protected editTitle = '';
  protected editStateId = '';
  protected editPriority = '';
  protected editAssigneeIds: string[] = [];
  protected editEstimate: number | null = null;
  protected editStartDate: Date | null = null;
  protected editDueDate: Date | null = null;
  protected editDescription = '';
  protected newLinkUrl = '';
  protected newLinkTitle = '';
  protected newChildTitle = '';
  protected newRelationTaskId = '';
  protected newRelationType = 'relates_to';
  protected newComment = '';
  protected activity = signal<TaskActivity[]>([]);

  protected readonly stateOptions = computed(() =>
    this.projectStore.currentProjectStates()
      ? Object.values(this.projectStore.currentProjectStates()!).flat()
      : [],
  );

  protected readonly memberOptions = computed(() => this.projectStore.members());

  protected readonly priorityOptions = [
    { label: '🔴 Urgent', value: 'urgent' },
    { label: '🟠 High', value: 'high' },
    { label: '🟡 Medium', value: 'medium' },
    { label: '🔵 Low', value: 'low' },
    { label: '⚪ None', value: 'none' },
  ];

  protected readonly relationTypeOptions = [
    { label: 'Blocking', value: 'blocking' },
    { label: 'Blocked by', value: 'blocked_by' },
    { label: 'Relates to', value: 'relates_to' },
    { label: 'Duplicate of', value: 'duplicate_of' },
  ];

  protected readonly relationGroups = computed(() => {
    const t = this.task();
    if (!t) return [];
    const grouped: Record<string, any[]> = { blocking: [], blocked_by: [], relates_to: [], duplicate_of: [] };
    for (const r of t.relations ?? []) grouped[r.relationType]?.push(r);
    return [
      { type: 'blocking', label: 'Blocking', relations: grouped['blocking'] },
      { type: 'blocked_by', label: 'Blocked by', relations: grouped['blocked_by'] },
      { type: 'relates_to', label: 'Relates to', relations: grouped['relates_to'] },
      { type: 'duplicate_of', label: 'Duplicate of', relations: grouped['duplicate_of'] },
    ];
  });

  protected projectId = computed(() => this.projectStore.currentProject()?.id ?? '');
  protected currentUserId = signal('');

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const taskId = params['taskId'];
      const projectId = this.projectId();
      if (taskId && projectId) {
        this.isVisible.set(true);
        this.taskStore.loadTask(projectId, taskId);
        if (!this.projectStore.members().length) {
          this.projectStore.loadMembers(projectId);
        }
      } else {
        this.isVisible.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected syncFields(): void {
    const t = this.task();
    if (!t) return;
    this.editTitle = t.title;
    this.editStateId = t.stateId;
    this.editPriority = t.priority;
    this.editAssigneeIds = t.assignees?.map((a) => a.userId) ?? [];
    this.editEstimate = t.estimateValue;
    this.editStartDate = t.startDate ? new Date(t.startDate) : null;
    this.editDueDate = t.dueDate ? new Date(t.dueDate) : null;
    this.editDescription = t.description ?? '';
  }

  protected onClose(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskId: null },
      queryParamsHandling: 'merge',
    });
  }

  protected copyTaskId(taskId: string): void {
    navigator.clipboard.writeText(taskId);
    this.messageService.add({ severity: 'success', summary: 'Đã sao chép', life: 1500 });
  }

  protected saveTitle(): void {
    const t = this.task();
    if (!t || this.editTitle === t.title) return;
    this.taskStore.updateTask(this.projectId(), t.id, { title: this.editTitle });
  }

  protected saveField(field: string, value: unknown): void {
    const t = this.task();
    if (!t) return;
    this.taskStore.updateTask(this.projectId(), t.id, { [field]: value } as any);
  }

  protected saveDescription(): void {
    const t = this.task();
    if (!t || this.editDescription === t.description) return;
    this.taskStore.updateTask(this.projectId(), t.id, { description: this.editDescription });
  }

  protected isOverdue(): boolean {
    const t = this.task();
    return !!t?.dueDate && new Date(t.dueDate) < new Date();
  }

  protected formatDateToISO(date: Date | null): string | null {
    if (!date) return null;
    return date.toISOString().split('T')[0];
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  protected formatRelativeTime(date: Date | string): string {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  }

  protected formatActivity(entry: TaskActivity): string {
    const typeMap: Record<string, string> = {
      title_changed: `đổi tiêu đề từ "${entry.oldValue}" → "${entry.newValue}"`,
      state_changed: `đổi state`,
      priority_changed: `đổi priority từ ${entry.oldValue} → ${entry.newValue}`,
      assignee_added: `thêm assignee`,
      assignee_removed: `bỏ assignee`,
      created: 'đã tạo task này',
    };
    return typeMap[entry.entryType] ?? entry.entryType.replace(/_/g, ' ');
  }

  protected onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const t = this.task();
    if (!input.files || !t) return;

    for (const file of Array.from(input.files)) {
      this.attachmentService.upload(this.projectId(), t.id, file).subscribe({
        next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
        error: (err) => this.messageService.add({ severity: 'error', summary: err.error?.message ?? 'Upload thất bại' }),
      });
    }
  }

  protected deleteAttachment(att: TaskAttachment): void {
    const t = this.task();
    if (!t) return;
    this.attachmentService.delete(this.projectId(), t.id, att.id).subscribe({
      next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
    });
  }

  protected addLink(): void {
    const t = this.task();
    if (!t || !this.newLinkUrl.trim()) return;
    this.linkService.addLink(this.projectId(), t.id, { url: this.newLinkUrl, title: this.newLinkTitle || undefined }).subscribe({
      next: () => {
        this.newLinkUrl = '';
        this.newLinkTitle = '';
        this.taskStore.loadTask(this.projectId(), t.taskId);
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: err.error?.message ?? 'Lỗi' }),
    });
  }

  protected deleteLink(link: TaskLink): void {
    const t = this.task();
    if (!t) return;
    this.linkService.deleteLink(this.projectId(), t.id, link.id).subscribe({
      next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
    });
  }

  protected addSubItem(): void {
    const t = this.task();
    if (!t || !this.newChildTitle.trim()) return;
    this.taskStore.createTask(this.projectId(), {
      title: this.newChildTitle,
      parentId: t.id,
      type: t.type === 'epic' ? 'story' : t.type === 'story' ? 'task' : 'subtask',
    }).then(() => {
      this.newChildTitle = '';
      this.taskStore.loadTask(this.projectId(), t.taskId);
    });
  }

  protected openChildTask(taskId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskId },
      queryParamsHandling: 'merge',
    });
  }

  protected addRelation(): void {
    const t = this.task();
    if (!t || !this.newRelationTaskId.trim()) return;
    this.relationService.addRelation(this.projectId(), t.id, {
      targetTaskId: this.newRelationTaskId,
      relationType: this.newRelationType as any,
    }).subscribe({
      next: () => {
        this.newRelationTaskId = '';
        this.taskStore.loadTask(this.projectId(), t.taskId);
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: err.error?.message ?? 'Lỗi' }),
    });
  }

  protected deleteRelation(relationId: string): void {
    const t = this.task();
    if (!t) return;
    this.relationService.deleteRelation(this.projectId(), t.id, relationId).subscribe({
      next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
    });
  }

  protected submitComment(): void {
    const t = this.task();
    if (!t || !this.newComment.trim()) return;
    this.taskService.addComment(this.projectId(), t.id, { content: this.newComment }).subscribe({
      next: () => {
        this.newComment = '';
        this.loadActivity();
      },
    });
  }

  protected editComment(entry: TaskActivity): void {
    const content = prompt('Sửa comment:', entry.comment ?? '');
    if (content === null) return;
    const t = this.task();
    if (!t) return;
    this.taskService.editComment(this.projectId(), t.id, entry.id, { content }).subscribe({
      next: () => this.loadActivity(),
    });
  }

  protected deleteComment(commentId: string): void {
    const t = this.task();
    if (!t) return;
    this.taskService.deleteComment(this.projectId(), t.id, commentId).subscribe({
      next: () => this.loadActivity(),
    });
  }

  private loadActivity(): void {
    const t = this.task();
    if (!t) return;
    this.taskService.getActivity(this.projectId(), t.id).subscribe((res) => {
      this.activity.set(res.data);
    });
  }
}
