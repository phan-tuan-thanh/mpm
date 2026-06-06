import { Component, OnInit, OnDestroy, inject, signal, computed, effect, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';

import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { ModuleStore } from '../../state/module.store';
import { AuthStore } from '../../../auth/state/auth.store';
import { TaskService } from '../../services/task.service';
import { AttachmentService } from '../../services/attachment.service';
import { LinkService } from '../../services/link.service';
import { RelationService } from '../../services/relation.service';
import { LayoutService } from '../../../layout/services/layout.service';
import type { Task, TaskActivity, TaskAttachment, TaskLink, TiptapDoc } from '@mpm/shared-types';
import { Subject, takeUntil } from 'rxjs';
import { TaskOverviewTabComponent, TaskSubitemsTabComponent, TaskRelationsTabComponent, TaskActivityTabComponent, TaskAttachmentsComponent, TaskLinksComponent } from './components';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';

const PRIORITY_OPTIONS = [
  { label: '🔴 Urgent', value: 'urgent' }, { label: '🟠 High', value: 'high' },
  { label: '🟡 Medium', value: 'medium' }, { label: '🔵 Low', value: 'low' },
  { label: '⚪ None', value: 'none' },
];

@Component({
  standalone: true,
  selector: 'app-task-detail-panel',
  imports: [
    CommonModule, FormsModule, DrawerModule, DialogModule, ButtonModule, InputTextModule, ToastModule, TabsModule,
    SelectModule, MultiSelectModule, DatePickerModule, InputNumberModule, TooltipModule,
    TaskOverviewTabComponent, TaskSubitemsTabComponent, TaskRelationsTabComponent, TaskActivityTabComponent,
    TaskAttachmentsComponent, TaskLinksComponent, RichTextEditorComponent,
  ],
  providers: [MessageService],
  template: `
    @if (viewMode === 'popup') {
      <p-dialog
        [(visible)]="isVisible"
        [modal]="true"
        [closable]="false"
        [showHeader]="false"
        styleClass="qc-dialog"
        [style]="{ width: '750px', height: '90vh', padding: '0' }"
        [contentStyle]="{ padding: '0', borderRadius: '14px', overflow: 'hidden' }"
        [dismissableMask]="true"
        (onHide)="onClose()"
      >
        <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
      </p-dialog>
    } @else if (viewMode === 'right-pane') {
      <p-drawer
        [(visible)]="isVisible"
        position="right"
        [modal]="false"
        [style]="{ width: '680px', padding: '0' }"
        [dismissableMask]="true"
        [showHeader]="false"
        (onClose)="onClose()"
      >
        <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
      </p-drawer>
    } @else if (viewMode === 'full-page') {
      <div class="w-full h-full bg-white dark:bg-surface-900 overflow-hidden flex flex-col border border-gray-100 dark:border-surface-700 rounded-xl shadow-sm">
        <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
      </div>
    }

    <ng-template #detailTpl>
      <div class="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100">
        <!-- ══ Header ══ -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-850/50 flex-shrink-0">
          <div class="flex items-center gap-3">
            @if (task()) {
              <span class="font-mono text-xs font-semibold text-gray-500 dark:text-surface-400 bg-gray-100 dark:bg-surface-800 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-surface-700" (click)="copyTaskId(task()!.taskId)">
                {{ task()!.taskId }}
              </span>
              @switch (taskStore.saveStatus()) {
                @case ('saving') { <span class="text-xs text-indigo-500 animate-pulse font-medium">Đang lưu...</span> }
                @case ('saved') { <span class="text-xs text-green-500 font-medium">✓ Đã lưu</span> }
                @case ('error') { <span class="text-xs text-red-500 font-medium">✗ Lỗi lưu</span> }
              }
            }
          </div>

          <!-- Header Layout & Toggle Controls -->
          <div class="flex items-center gap-2">
            <!-- Sidebar Toggle (Only visible in full-page mode) -->
            @if (viewMode === 'full-page') {
              <button pButton icon="pi pi-bars" class="p-button-rounded p-button-text p-button-sm"
                [severity]="showSidebar() ? 'primary' : 'secondary'"
                pTooltip="Bật/Tắt thuộc tính sidebar" (click)="showSidebar.set(!showSidebar())"></button>
              <div class="w-px h-4 bg-gray-200 dark:bg-surface-750 mx-1"></div>
            }

            <!-- Slide-in (Drawer) Mode -->
            <button pButton icon="pi pi-align-right" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'right-pane' ? 'primary' : 'secondary'"
              pTooltip="Slide-in Drawer" (click)="viewModeChange.emit('right-pane')"></button>

            <!-- Popup (Dialog) Mode -->
            <button pButton icon="pi pi-clone" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'popup' ? 'primary' : 'secondary'"
              pTooltip="Dialog Popup" (click)="viewModeChange.emit('popup')"></button>

            <!-- Full Page Mode -->
            <button pButton icon="pi pi-desktop" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'full-page' ? 'primary' : 'secondary'"
              pTooltip="Full Page" (click)="viewModeChange.emit('full-page')"></button>

            <div class="w-px h-4 bg-gray-200 dark:bg-surface-750 mx-1"></div>

            <!-- Close button -->
            <button pButton [icon]="viewMode === 'full-page' ? 'pi pi-arrow-left' : 'pi pi-times'" 
              class="p-button-rounded p-button-text p-button-sm" severity="secondary"
              [pTooltip]="viewMode === 'full-page' ? 'Quay lại danh sách' : 'Đóng'" (click)="onClose()"></button>
          </div>
        </div>

        <!-- ══ Body ══ -->
        @if (task()) {
          <!-- Single Column scrollable view for right-pane / popup modes -->
          @if (viewMode !== 'full-page') {
            <div class="flex-1 flex flex-col overflow-hidden">
              <div class="px-4 py-3 border-b border-gray-150 dark:border-surface-750 flex-shrink-0">
                <input pInputText class="w-full text-lg font-semibold border-none shadow-none focus:ring-0 bg-transparent p-0" [(ngModel)]="editTitle" (blur)="saveTitle()" (keydown.enter)="saveTitle()" />
              </div>
              <p-tabs [value]="'overview'" class="flex-1 overflow-hidden flex flex-col">
                <p-tablist>
                  <p-tab value="overview">Tổng quan</p-tab>
                  <p-tab value="subitems">Sub-items {{ task()!.children?.length ? '('+task()!.children!.length+')' : '' }}</p-tab>
                  <p-tab value="relations">Relations</p-tab>
                  <p-tab value="activity">Activity</p-tab>
                </p-tablist>
                <p-tabpanels class="flex-1 overflow-y-auto">
                  <p-tabpanel value="overview"><app-task-overview-tab [projectId]="projectId()" [task]="task()" [stateOptions]="stateOptions()" [memberOptions]="memberOptions()" [moduleGroupOptions]="moduleGroupOptions()" [labelOptions]="labelOptions()" (changeModules)="onModulesChange($event)" (saveField)="saveField($event.field, $event.value)" (saveDescription)="saveDescription($event)" (uploadAttachment)="onFileUpload($event)" (deleteAttachment)="deleteAttachment($event)" (addLink)="addLink($event)" (deleteLink)="deleteLink($event)" /></p-tabpanel>
                  <p-tabpanel value="subitems"><app-task-subitems-tab [task]="task()" (openChild)="openChildTask($event)" (addSubItem)="addSubItem($event)" /></p-tabpanel>
                  <p-tabpanel value="relations"><app-task-relations-tab [task]="task()" (addRelation)="addRelation($event)" (deleteRelation)="deleteRelation($event)" /></p-tabpanel>
                  <p-tabpanel value="activity"><app-task-activity-tab [activity]="activity()" [currentUserId]="currentUserId()" (submitComment)="submitComment($event)" (editComment)="editComment($event)" (deleteComment)="deleteComment($event)" /></p-tabpanel>
                </p-tabpanels>
              </p-tabs>
            </div>
          } @else {
            <!-- Two Column View for full-page mode -->
            <div class="flex-1 flex overflow-hidden">
              <!-- Left Column: Main Editor content -->
              <div class="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
                <!-- Title -->
                <div>
                  <input pInputText class="w-full text-2xl font-bold border-none shadow-none focus:ring-0 bg-transparent p-0" [(ngModel)]="editTitle" (blur)="saveTitle()" (keydown.enter)="saveTitle()" />
                </div>

                <!-- Description -->
                <div>
                  <label class="text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wide mb-2 block">Mô tả</label>
                  <app-rich-text-editor [ngModel]="task()?.description" (ngModelChange)="saveDescription($event)" placeholder="Thêm mô tả..." (blurEditor)="saveDescription(task()?.description)"></app-rich-text-editor>
                </div>

                <!-- Attachments & Links -->
                <div class="border-t border-gray-100 dark:border-surface-800 pt-4 flex flex-col gap-4">
                  <app-task-attachments [projectId]="projectId()" [taskId]="task()!.id" [attachments]="task()!.attachments ?? []"
                    (upload)="onFileUpload($event)" (delete)="deleteAttachment($event)" />
                  <app-task-links [links]="task()!.links ?? []" (add)="addLink($event)" (delete)="deleteLink($event)" />
                </div>

                <!-- Tabs area for children, relations, comments -->
                <div class="border-t border-gray-100 dark:border-surface-800 pt-6">
                  <p-tabs [value]="'subitems'" class="w-full">
                    <p-tablist>
                      <p-tab value="subitems">Sub-items {{ task()!.children?.length ? '('+task()!.children!.length+')' : '' }}</p-tab>
                      <p-tab value="relations">Relations</p-tab>
                      <p-tab value="activity">Activity</p-tab>
                    </p-tablist>
                    <p-tabpanels class="pt-4">
                      <p-tabpanel value="subitems"><app-task-subitems-tab [task]="task()" (openChild)="openChildTask($event)" (addSubItem)="addSubItem($event)" /></p-tabpanel>
                      <p-tabpanel value="relations"><app-task-relations-tab [task]="task()" (addRelation)="addRelation($event)" (deleteRelation)="deleteRelation($event)" /></p-tabpanel>
                      <p-tabpanel value="activity"><app-task-activity-tab [activity]="activity()" [currentUserId]="currentUserId()" (submitComment)="submitComment($event)" (editComment)="editComment($event)" (deleteComment)="deleteComment($event)" /></p-tabpanel>
                    </p-tabpanels>
                  </p-tabs>
                </div>
              </div>

              <!-- Right Column: Properties Sidebar -->
              @if (showSidebar()) {
                <div class="w-80 border-l border-gray-100 dark:border-surface-700 bg-gray-50/30 dark:bg-surface-900/30 overflow-y-auto p-5 flex flex-col gap-4 flex-shrink-0">
                  <h3 class="text-sm font-semibold text-gray-700 dark:text-surface-200 uppercase tracking-wide">Thuộc tính (Properties)</h3>

                  <!-- State -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">State</label>
                    <p-select [options]="stateOptions()" [ngModel]="editStateId()" optionLabel="name" optionValue="id"
                      placeholder="Chọn state" styleClass="w-full text-sm" (ngModelChange)="saveField('stateId', $event)" />
                  </div>

                  <!-- Priority -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Priority</label>
                    <p-select [options]="priorityOptions" [ngModel]="editPriority()" optionLabel="label" optionValue="value"
                      placeholder="Chọn priority" styleClass="w-full text-sm" (ngModelChange)="saveField('priority', $event)" />
                  </div>

                  <!-- Assignees -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Assignees</label>
                    <p-multiselect [options]="memberOptions()" [ngModel]="editAssigneeIds()" optionLabel="displayName" optionValue="userId"
                      placeholder="Thêm assignee" styleClass="w-full text-sm" (ngModelChange)="saveField('assigneeIds', $event)" />
                  </div>

                  <!-- Labels -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Nhãn (Labels)</label>
                    <p-multiselect
                      [options]="labelOptions()"
                      [ngModel]="editLabelIds()"
                      optionLabel="name"
                      optionValue="id"
                      placeholder="Chọn nhãn..."
                      styleClass="w-full text-sm"
                      (ngModelChange)="onLabelsChange($event)"
                    >
                      <ng-template let-label pTemplate="item">
                        <div class="flex items-center gap-2" [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                          @if (isScoped(label.name)) {
                            <span class="inline-flex items-center text-xs rounded-full overflow-hidden border border-gray-200 dark:border-surface-700 font-medium bg-white dark:bg-surface-800">
                              <span class="px-1.5 py-px text-white" 
                                    [style.background]="layoutService.getAdaptiveColor(getScopeColor(label.name, label.color))" 
                                    [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(label.name, label.color)))">{{ getScope(label.name) }}</span>
                              <span class="px-1.5 py-px" 
                                    [style.background]="layoutService.getAdaptiveColor(label.color) + '18'" 
                                    [style.color]="layoutService.getAdaptiveColor(label.color)">{{ getValue(label.name) }}</span>
                            </span>
                          } @else {
                            <span class="text-xs px-2 py-0.5 rounded-full font-medium" 
                                  [style.background]="layoutService.getAdaptiveColor(label.color) + '22'" 
                                  [style.color]="layoutService.getAdaptiveColor(label.color)">
                              {{ label.name }}
                            </span>
                          }
                        </div>
                      </ng-template>

                      <ng-template pTemplate="selectedItems">
                        <div class="flex flex-wrap gap-1">
                          @for (valId of editLabelIds(); track valId) {
                            @let label = getLabelById(valId);
                            @if (label) {
                              @if (isScoped(label.name)) {
                                <span class="inline-flex items-center text-[10px] rounded-full overflow-hidden border border-gray-200 dark:border-surface-700 font-medium bg-white dark:bg-surface-800" [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                                  <span class="px-1.5 py-px text-white" 
                                        [style.background]="layoutService.getAdaptiveColor(getScopeColor(label.name, label.color))" 
                                        [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(label.name, label.color)))">{{ getScope(label.name) }}</span>
                                  <span class="px-1.5 py-px" 
                                        [style.background]="layoutService.getAdaptiveColor(label.color) + '18'" 
                                        [style.color]="layoutService.getAdaptiveColor(label.color)">{{ getValue(label.name) }}</span>
                                </span>
                              } @else {
                                <span class="text-[10px] px-2 py-px rounded-full font-medium bg-white dark:bg-surface-800 border" 
                                      [style.border-color]="layoutService.getAdaptiveColor(label.color)" 
                                      [style.color]="layoutService.getAdaptiveColor(label.color)"
                                      [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                                  {{ label.name }}
                                </span>
                              }
                            }
                          }
                          @if (!editLabelIds() || editLabelIds().length === 0) {
                            <span class="text-gray-400 text-xs">Chọn nhãn...</span>
                          }
                        </div>
                      </ng-template>
                    </p-multiselect>
                  </div>

                  <!-- Estimate -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Estimate</label>
                    <p-inputnumber [ngModel]="editEstimate()" (ngModelChange)="saveField('estimateValue', $event)" [min]="0" styleClass="w-full text-sm" />
                  </div>

                  <!-- Start Date -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Bắt đầu</label>
                    <p-datepicker [ngModel]="editStartDate()" (ngModelChange)="saveField('startDate', formatDateToISO($event))" dateFormat="dd/mm/yy" styleClass="w-full text-sm" />
                  </div>

                  <!-- Due Date -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Hết hạn</label>
                    <p-datepicker [ngModel]="editDueDate()" (ngModelChange)="saveField('dueDate', formatDateToISO($event))" dateFormat="dd/mm/yy" styleClass="w-full text-sm" />
                  </div>

                  <!-- Modules -->
                  <div>
                    <label class="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Modules</label>
                    <p-multiselect
                      [options]="moduleGroupOptions()"
                      [ngModel]="editModuleIds()"
                      [group]="true"
                      optionLabel="name"
                      optionValue="id"
                      optionGroupLabel="label"
                      optionGroupChildren="items"
                      placeholder="Chọn modules..."
                      styleClass="w-full text-sm"
                      display="chip"
                      (ngModelChange)="onModulesChange($event)"
                    >
                      <ng-template let-group pTemplate="group">
                        <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          <i [class]="group.icon" class="text-xs"></i>
                          <span>{{ group.label }}</span>
                        </div>
                      </ng-template>
                    </p-multiselect>
                  </div>

                  <!-- Reporter and metadata -->
                  <div class="border-t border-gray-100 dark:border-surface-800 pt-4 flex flex-col gap-2 text-xs text-gray-500">
                    <div>
                      <span class="font-medium text-gray-400">Người tạo:</span> {{ task()?.reporter?.displayName }}
                    </div>
                    <div>
                      <span class="font-medium text-gray-400">Tạo lúc:</span> {{ task()?.createdAt | date:'dd/MM/yyyy HH:mm' }}
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </ng-template>
    <p-toast />
  `,
})
export class TaskDetailPanelComponent implements OnInit, OnDestroy {
  readonly taskStore = inject(TaskStore);
  readonly projectStore = inject(ProjectStore);
  readonly moduleStore = inject(ModuleStore);
  private readonly authStore = inject(AuthStore);
  private readonly attachmentService = inject(AttachmentService);
  private readonly taskService = inject(TaskService);
  private readonly linkService = inject(LinkService);
  private readonly relationService = inject(RelationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly layoutService = inject(LayoutService);
  private readonly destroy$ = new Subject<void>();

  @Input() viewMode: 'right-pane' | 'full-page' | 'popup' = 'right-pane';
  @Output() viewModeChange = new EventEmitter<'right-pane' | 'full-page' | 'popup'>();

  readonly task = this.taskStore.currentTask;
  readonly isVisible = signal(false);
  protected editTitle = '';
  protected activity = signal<TaskActivity[]>([]);
  protected readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? '');

  protected showSidebar = signal(true);
  protected editStateId = signal('');
  protected editPriority = signal('');
  protected editAssigneeIds = signal<string[]>([]);
  protected editLabelIds = signal<string[]>([]);
  protected editEstimate = signal<number | null>(null);
  protected editStartDate = signal<Date | null>(null);
  protected editDueDate = signal<Date | null>(null);
  protected editModuleIds = signal<string[]>([]);
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly stateOptions = computed(() => this.projectStore.currentProjectStates() ? Object.values(this.projectStore.currentProjectStates()!).flat() : []);
  protected readonly memberOptions = computed(() => this.projectStore.members());
  protected readonly labelOptions = computed(() => this.taskStore.labels());
  protected projectId = computed(() => this.projectStore.currentProject()?.id ?? '');

  protected readonly moduleGroupOptions = computed(() => {
    const modules = this.moduleStore.modules();
    const workspaceModules = modules.filter(m => m.scope === 'workspace');
    const projectModules = modules.filter(m => m.scope === 'project');
    return [
      {
        label: 'Workspace Modules',
        icon: 'pi pi-globe text-indigo-500',
        items: workspaceModules.map(m => ({ id: m.id, name: m.name, scope: m.scope })),
      },
      {
        label: 'Project Modules',
        icon: 'pi pi-folder text-teal-500',
        items: projectModules.map(m => ({ id: m.id, name: m.name, scope: m.scope })),
      },
    ];
  });

  constructor() {
    effect(() => {
      const t = this.task();
      if (t) {
        this.editTitle = t.title;
        this.editStateId.set(t.stateId);
        this.editPriority.set(t.priority);
        this.editAssigneeIds.set(t.assignees?.map((a: any) => a.userId ?? a.id) ?? []);
        this.editLabelIds.set(t.labels?.map((l: any) => l.id) ?? []);
        this.editEstimate.set(t.estimateValue);
        this.editStartDate.set(t.startDate ? new Date(t.startDate) : null);
        this.editDueDate.set(t.dueDate ? new Date(t.dueDate) : null);
        this.editModuleIds.set(t.modules?.map((m: any) => m.id) ?? []);
        this.loadActivity();
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const taskId = params['taskId'], projectId = this.projectId();
      if (taskId && projectId) {
        this.isVisible.set(true);
        this.taskStore.loadTask(projectId, taskId);
        if (!this.projectStore.members().length) this.projectStore.loadMembers(projectId);
        if (!this.moduleStore.modules().length) this.moduleStore.loadModules(projectId);
        this.taskStore.loadLabels(projectId);
      } else this.isVisible.set(false);
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  protected onClose(): void { this.router.navigate([], { relativeTo: this.route, queryParams: { taskId: null }, queryParamsHandling: 'merge' }); }
  protected copyTaskId(taskId: string): void { navigator.clipboard.writeText(taskId); this.messageService.add({ severity: 'success', summary: 'Đã sao chép', life: 1500 }); }
  protected saveTitle(): void { const t = this.task(); if (t && this.editTitle !== t.title) this.taskStore.updateTask(this.projectId(), t.id, { title: this.editTitle }); }
  protected saveField(field: string, value: unknown): void { const t = this.task(); if (t) this.taskStore.updateTask(this.projectId(), t.id, { [field]: value } as any); }
  protected saveDescription(desc: TiptapDoc | null): void { const t = this.task(); if (t) this.taskStore.updateTask(this.projectId(), t.id, { description: desc }); }
  protected openChildTask(taskId: string): void { this.router.navigate([], { relativeTo: this.route, queryParams: { taskId }, queryParamsHandling: 'merge' }); }
  protected deleteAttachment(att: TaskAttachment): void { const t = this.task(); if (t) this.attachmentService.delete(this.projectId(), t.id, att.id).subscribe(() => this.taskStore.loadTask(this.projectId(), t.taskId)); }
  protected deleteLink(link: TaskLink): void { const t = this.task(); if (t) this.linkService.deleteLink(this.projectId(), t.id, link.id).subscribe(() => this.taskStore.loadTask(this.projectId(), t.taskId)); }
  protected deleteRelation(relationId: string): void { const t = this.task(); if (t) this.relationService.deleteRelation(this.projectId(), t.id, relationId).subscribe(() => this.taskStore.loadTask(this.projectId(), t.taskId)); }
  protected submitComment(content: string): void { const t = this.task(); if (t) this.taskService.addComment(this.projectId(), t.id, { content }).subscribe(() => this.loadActivity()); }
  protected deleteComment(commentId: string): void { const t = this.task(); if (t) this.taskService.deleteComment(this.projectId(), t.id, commentId).subscribe(() => this.loadActivity()); }

  protected isScoped(name: string): boolean { return name.includes('::'); }
  protected getScope(name: string): string { return name.split('::')[0].trim(); }
  protected getValue(name: string): string { return name.split('::').slice(1).join('::').trim(); }

  protected getScopeColor(name: string, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    const match = this.labelOptions().find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    return match ? match.color : fallbackColor;
  }

  protected getLabelById(id: string): any {
    return this.labelOptions().find(l => l.id === id);
  }

  protected onLabelsChange(newLabelIds: string[]): void {
    let filteredIds: string[] = [];
    const previousIds = this.editLabelIds();
    const addedId = newLabelIds.find(id => !previousIds.includes(id));

    if (addedId) {
      const addedLabel = this.labelOptions().find(l => l.id === addedId);
      if (addedLabel && addedLabel.name.includes('::') && addedLabel.isExclusive !== false) {
        const scope = addedLabel.name.split('::')[0].trim().toLowerCase();
        filteredIds = newLabelIds.filter(id => {
          if (id === addedId) return true;
          const label = this.labelOptions().find(l => l.id === id);
          if (label && label.name.includes('::') && label.isExclusive !== false) {
            return label.name.split('::')[0].trim().toLowerCase() !== scope;
          }
          return true;
        });
      } else {
        filteredIds = newLabelIds;
      }
    } else {
      filteredIds = newLabelIds;
    }

    this.editLabelIds.set(filteredIds);
    this.saveField('labelIds', filteredIds);
  }

  protected formatDateToISO(date: Date | null): string | null {
    return date ? date.toISOString().split('T')[0] : null;
  }

  protected onModulesChange(newModuleIds: string[]): void {
    const t = this.task();
    if (!t) return;
    const projectId = this.projectId();
    const previousIds = t.modules?.map(m => m.id) ?? [];

    const added = newModuleIds.filter(id => !previousIds.includes(id));
    const removed = previousIds.filter(id => !newModuleIds.includes(id));

    for (const moduleId of added) {
      this.moduleStore.addTasksToModule(projectId, moduleId, [t.id]).then(() => {
        this.taskStore.loadTask(projectId, t.taskId);
      });
    }

    for (const moduleId of removed) {
      this.moduleStore.removeTaskFromModule(projectId, moduleId, t.id).then(() => {
        this.taskStore.loadTask(projectId, t.taskId);
      });
    }
  }

  protected onFileUpload(files: FileList): void {
    const t = this.task(); if (!t) return;
    for (const file of Array.from(files)) {
      this.attachmentService.upload(this.projectId(), t.id, file).subscribe({
        next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
        error: (err) => this.messageService.add({ severity: 'error', summary: err.error?.message ?? 'Upload thất bại' }),
      });
    }
  }

  protected addLink(event: { url: string; title?: string }): void {
    const t = this.task(); if (!t) return;
    this.linkService.addLink(this.projectId(), t.id, event).subscribe({
      next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
      error: (err) => this.messageService.add({ severity: 'error', summary: err.error?.message ?? 'Lỗi' }),
    });
  }

  protected addSubItem(title: string): void {
    const t = this.task(); if (!t) return;
    this.taskStore.createTask(this.projectId(), {
      title, parentId: t.id,
      type: t.type === 'epic' ? 'story' : t.type === 'story' ? 'task' : 'subtask',
    }).then(() => this.taskStore.loadTask(this.projectId(), t.taskId));
  }

  protected addRelation(event: { targetTaskId: string; relationType: string }): void {
    const t = this.task(); if (!t) return;
    this.relationService.addRelation(this.projectId(), t.id, event as any).subscribe({
      next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
      error: (err) => this.messageService.add({ severity: 'error', summary: err.error?.message ?? 'Lỗi' }),
    });
  }

  protected editComment(event: { id: string; content: string }): void {
    const t = this.task();
    if (t) this.taskService.editComment(this.projectId(), t.id, event.id, { content: event.content }).subscribe(() => this.loadActivity());
  }

  private loadActivity(): void {
    const t = this.task(); if (t) this.taskService.getActivity(this.projectId(), t.id).subscribe((res) => this.activity.set(res.data));
  }
}
