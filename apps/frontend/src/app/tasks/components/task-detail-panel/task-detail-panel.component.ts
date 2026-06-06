import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { ModuleStore } from '../../state/module.store';
import { TaskService } from '../../services/task.service';
import { AttachmentService } from '../../services/attachment.service';
import { LinkService } from '../../services/link.service';
import { RelationService } from '../../services/relation.service';
import type { TaskActivity, TaskAttachment, TaskLink } from '@mpm/shared-types';
import { Subject, takeUntil } from 'rxjs';
import { TaskOverviewTabComponent, TaskSubitemsTabComponent, TaskRelationsTabComponent, TaskActivityTabComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-task-detail-panel',
  imports: [
    CommonModule, FormsModule, DrawerModule, ButtonModule, InputTextModule, ToastModule, TabsModule,
    TaskOverviewTabComponent, TaskSubitemsTabComponent, TaskRelationsTabComponent, TaskActivityTabComponent,
  ],
  providers: [MessageService],
  template: `
    <p-drawer [(visible)]="isVisible" position="right" [style]="{ width: '680px' }" [modal]="false" (onHide)="onClose()">
      <ng-template pTemplate="header"><div class="flex items-center gap-2 w-full">
        @if (task()) {
          <span class="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200" (click)="copyTaskId(task()!.taskId)">{{ task()!.taskId }}</span>
          @switch (taskStore.saveStatus()) {
            @case ('saving') { <span class="text-xs text-indigo-500 animate-pulse">Đang lưu...</span> }
            @case ('saved') { <span class="text-xs text-green-500">✓ Đã lưu</span> }
            @case ('error') { <span class="text-xs text-red-500">✗ Lỗi lưu</span> }
          }
        }
        <div class="flex-1"></div>
        <button pButton icon="pi pi-external-link" size="small" text severity="secondary" pTooltip="Mở full page"></button>
      </div></ng-template>
      @if (task()) {
        <div class="flex flex-col h-full overflow-hidden">
          <div class="px-4 pt-2 pb-4 border-b border-gray-100 dark:border-surface-700">
            <input pInputText class="w-full text-lg font-semibold border-none shadow-none focus:ring-0 bg-transparent" [(ngModel)]="editTitle" (blur)="saveTitle()" (keydown.enter)="saveTitle()" />
          </div>
          <p-tabs [value]="'overview'" class="flex-1 overflow-hidden flex flex-col">
            <p-tablist>
              <p-tab value="overview">Tổng quan</p-tab>
              <p-tab value="subitems">Sub-items {{ task()!.children?.length ? '('+task()!.children!.length+')' : '' }}</p-tab>
              <p-tab value="relations">Relations</p-tab>
              <p-tab value="activity">Activity</p-tab>
            </p-tablist>
            <p-tabpanels class="flex-1 overflow-y-auto">
              <p-tabpanel value="overview"><app-task-overview-tab [projectId]="projectId()" [task]="task()" [stateOptions]="stateOptions()" [memberOptions]="memberOptions()" [moduleGroupOptions]="moduleGroupOptions()" (changeModules)="onModulesChange($event)" (saveField)="saveField($event.field, $event.value)" (saveDescription)="saveDescription($event)" (uploadAttachment)="onFileUpload($event)" (deleteAttachment)="deleteAttachment($event)" (addLink)="addLink($event)" (deleteLink)="deleteLink($event)" /></p-tabpanel>
              <p-tabpanel value="subitems"><app-task-subitems-tab [task]="task()" (openChild)="openChildTask($event)" (addSubItem)="addSubItem($event)" /></p-tabpanel>
              <p-tabpanel value="relations"><app-task-relations-tab [task]="task()" (addRelation)="addRelation($event)" (deleteRelation)="deleteRelation($event)" /></p-tabpanel>
              <p-tabpanel value="activity"><app-task-activity-tab [activity]="activity()" [currentUserId]="currentUserId()" (submitComment)="submitComment($event)" (editComment)="editComment($event)" (deleteComment)="deleteComment($event)" /></p-tabpanel>
            </p-tabpanels>
          </p-tabs>
        </div>
      }
    </p-drawer><p-toast />
  `,
})
export class TaskDetailPanelComponent implements OnInit, OnDestroy {
  readonly taskStore = inject(TaskStore);
  readonly projectStore = inject(ProjectStore);
  readonly moduleStore = inject(ModuleStore);
  private readonly attachmentService = inject(AttachmentService);
  private readonly taskService = inject(TaskService);
  private readonly linkService = inject(LinkService);
  private readonly relationService = inject(RelationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly task = this.taskStore.currentTask;
  readonly isVisible = signal(false);
  protected editTitle = '';
  protected activity = signal<TaskActivity[]>([]);
  protected currentUserId = signal('');

  protected readonly stateOptions = computed(() => this.projectStore.currentProjectStates() ? Object.values(this.projectStore.currentProjectStates()!).flat() : []);
  protected readonly memberOptions = computed(() => this.projectStore.members());
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
    effect(() => { if (this.task()) { this.editTitle = this.task()!.title; this.loadActivity(); } });
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const taskId = params['taskId'], projectId = this.projectId();
      if (taskId && projectId) {
        this.isVisible.set(true);
        this.taskStore.loadTask(projectId, taskId);
        if (!this.projectStore.members().length) this.projectStore.loadMembers(projectId);
        if (!this.moduleStore.modules().length) this.moduleStore.loadModules(projectId);
      } else this.isVisible.set(false);
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  protected onClose(): void { this.router.navigate([], { relativeTo: this.route, queryParams: { taskId: null }, queryParamsHandling: 'merge' }); }
  protected copyTaskId(taskId: string): void { navigator.clipboard.writeText(taskId); this.messageService.add({ severity: 'success', summary: 'Đã sao chép', life: 1500 }); }
  protected saveTitle(): void { const t = this.task(); if (t && this.editTitle !== t.title) this.taskStore.updateTask(this.projectId(), t.id, { title: this.editTitle }); }
  protected saveField(field: string, value: unknown): void { const t = this.task(); if (t) this.taskStore.updateTask(this.projectId(), t.id, { [field]: value } as any); }
  protected saveDescription(desc: string): void { const t = this.task(); if (t) this.taskStore.updateTask(this.projectId(), t.id, { description: desc }); }
  protected openChildTask(taskId: string): void { this.router.navigate([], { relativeTo: this.route, queryParams: { taskId }, queryParamsHandling: 'merge' }); }
  protected deleteAttachment(att: TaskAttachment): void { const t = this.task(); if (t) this.attachmentService.delete(this.projectId(), t.id, att.id).subscribe(() => this.taskStore.loadTask(this.projectId(), t.taskId)); }
  protected deleteLink(link: TaskLink): void { const t = this.task(); if (t) this.linkService.deleteLink(this.projectId(), t.id, link.id).subscribe(() => this.taskStore.loadTask(this.projectId(), t.taskId)); }
  protected deleteRelation(relationId: string): void { const t = this.task(); if (t) this.relationService.deleteRelation(this.projectId(), t.id, relationId).subscribe(() => this.taskStore.loadTask(this.projectId(), t.taskId)); }
  protected submitComment(content: string): void { const t = this.task(); if (t) this.taskService.addComment(this.projectId(), t.id, { content }).subscribe(() => this.loadActivity()); }
  protected deleteComment(commentId: string): void { const t = this.task(); if (t) this.taskService.deleteComment(this.projectId(), t.id, commentId).subscribe(() => this.loadActivity()); }

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

  protected editComment(entry: TaskActivity): void {
    const content = prompt('Sửa comment:', entry.comment ?? '');
    if (content !== null && this.task()) this.taskService.editComment(this.projectId(), this.task()!.id, entry.id, { content }).subscribe(() => this.loadActivity());
  }

  private loadActivity(): void {
    const t = this.task(); if (t) this.taskService.getActivity(this.projectId(), t.id).subscribe((res) => this.activity.set(res.data));
  }
}
