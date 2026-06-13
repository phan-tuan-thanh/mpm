import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  signal,
  computed,
  effect,
  untracked,
  Input,
  Output,
  EventEmitter,
  Injector,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { SliderModule } from 'primeng/slider';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';

import { TaskStore } from '../../state/task.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { ModuleStore } from '../../state/module.store';
import { AuthStore } from '../../../auth/state/auth.store';
import { TaskService } from '../../services/task.service';
import { AttachmentService } from '../../services/attachment.service';
import { LinkService } from '../../services/link.service';
import { RelationService } from '../../services/relation.service';
import { LayoutService } from '../../../layout/services/layout.service';
import { TaskDetailStateService } from './services/task-detail-state.service';
import { PriorityConfigService } from '../../services/priority-config.service';
import type {
  Task,
  TaskActivity,
  TaskAttachment,
  TaskLink,
  TiptapDoc,
  CreateSubItemDto,
  ActivityFilterType,
  ProjectPriority,
  SubItemTreeNode,
} from '@mpm/shared-types';
import { Subject, takeUntil, combineLatest, distinctUntilChanged, filter, firstValueFrom, debounceTime } from 'rxjs';

import { TaskHeaderComponent } from './components/task-header/task-header.component';
import { TaskTitleInlineComponent } from './components/task-title-inline/task-title-inline.component';
import { SubItemsSectionComponent } from './components/sub-items-section/sub-items-section.component';
import { ActivityPanelComponent } from './components/activity-panel/activity-panel.component';
import { TaskCommentsComponent } from './components/task-comments/task-comments.component';
import { PropertiesSidebarComponent } from './components/properties-sidebar/properties-sidebar.component';
import { TaskAttachmentsComponent } from './components/task-attachments.component';
import { TaskLinksComponent } from './components/task-links.component';
import { TaskDescriptionSectionComponent } from './components/task-description-section/task-description-section.component';
import { SprintService } from '../../../projects/sprints/services/sprint.service';
import { CustomTranslationService } from '../../../shared/services/custom-translation.service';

import { IconDisplayComponent } from '../../../shared/components/icon-display/icon-display.component';
import { StateDotComponent } from '../../../shared/components/state-dot/state-dot.component';

@Component({
  standalone: true,
  selector: 'app-task-detail-panel',
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    DialogModule,
    ButtonModule,
    ToastModule,
    TooltipModule,
    PopoverModule,
    DatePickerModule,
    InputNumberModule,
    SliderModule,
    CheckboxModule,
    TaskHeaderComponent,
    TaskTitleInlineComponent,
    SubItemsSectionComponent,
    ActivityPanelComponent,
    TaskCommentsComponent,
    TaskAttachmentsComponent,
    TaskLinksComponent,
    TaskDescriptionSectionComponent,
    IconDisplayComponent,
    StateDotComponent,
  ],
  providers: [MessageService, TaskDetailStateService],
  styles: [`
    /* ── Pill buttons ── */
    .meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      border: 1px solid var(--surface-200, #e5e7eb);
      border-radius: 6px;
      padding: 4px 9px;
      cursor: pointer;
      user-select: none;
      background: transparent;
      color: var(--text-color-secondary, #6b7280);
      transition: background 0.12s, border-color 0.12s, color 0.12s;
      white-space: nowrap;
    }
    .meta-pill:hover {
      background: var(--surface-50, #f9fafb);
      border-color: var(--surface-300, #d1d5db);
      color: var(--text-color, #374151);
    }
    .meta-pill.active {
      background: var(--surface-50, #f9fafb);
      border-color: var(--surface-300, #d1d5db);
      color: var(--text-color, #374151);
    }
    :host-context(.dark) .meta-pill {
      border-color: var(--surface-700, #334155);
    }
    :host-context(.dark) .meta-pill:hover,
    :host-context(.dark) .meta-pill.active {
      background: var(--surface-800, #1e293b);
      border-color: var(--surface-600, #475569);
      color: var(--text-color, #f3f4f6);
    }

    /* ── Assignee avatar ── */
    .avatar-xs {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--p-primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #fff;
      font-weight: 700;
      flex-shrink: 0;
      border: 1.5px solid var(--surface-0, #fff);
    }

    /* ── Popover items ── */
    .pop-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 12px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      color: var(--text-color);
      transition: background 0.12s;
      text-align: left;
    }
    /* Dùng PrimeNG design tokens — tự đổi theo light/dark kể cả khi popover bị portal ra ngoài host
       (KHÔNG dùng :host-context(.dark): fail khi overlay appendTo body) */
    .pop-item:hover { background: var(--p-content-hover-background, #f9fafb); }
    .pop-item.selected { background: var(--p-highlight-background, #eef2ff); color: var(--p-highlight-color, var(--p-primary-600)); }

    /* ── Metadata separator ── */
    .meta-divider {
      width: 1px;
      height: 14px;
      background: var(--surface-200, #e5e7eb);
      flex-shrink: 0;
    }
    :host-context(.dark) .meta-divider {
      background: var(--surface-700, #334155);
    }
  `],
  template: `
    <!-- Always rendered — avoids abrupt @if teardown that calls disableModality()→detectChanges() during ngOnDestroy -->
    <p-dialog
      [visible]="isVisible() && viewMode === 'popup'"
      (visibleChange)="onDialogVisibleChange($event)"
      [transitionOptions]="'0ms'"
      [modal]="true"
      [closable]="false"
      [showHeader]="false"
      styleClass="qc-dialog"
      [style]="{ width: '750px', height: '90vh', padding: '0' }"
      [contentStyle]="{ padding: '0', borderRadius: '14px', overflow: 'hidden' }"
      [closeOnEscape]="stateService.editingSection() === null"
      [dismissableMask]="stateService.editingSection() === null"
      (onHide)="onDialogHide()"
    >
      @if (viewMode === 'popup') {
        <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
      }
    </p-dialog>

    <p-drawer
      [visible]="isVisible() && viewMode === 'right-pane'"
      (visibleChange)="onDrawerVisibleChange($event)"
      position="right"
      [modal]="false"
      [style]="{ width: '680px', padding: '0' }"
      [closeOnEscape]="stateService.editingSection() === null"
      [dismissible]="stateService.editingSection() === null"
      [showCloseIcon]="false"
      (onHide)="onDrawerClose()"
    >
      @if (viewMode === 'right-pane') {
        <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
      }
    </p-drawer>

    @if (viewMode === 'full-page' && isVisible()) {
      <div class="absolute inset-0 z-10 bg-white dark:bg-surface-900 overflow-hidden flex flex-col border border-gray-100 dark:border-surface-700 rounded-xl shadow-sm">
        <div class="w-full h-full flex flex-col">
          <ng-container *ngTemplateOutlet="detailTpl"></ng-container>
        </div>
      </div>
    }

    <ng-template #detailTpl>
      <div class="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100">
        <!-- ══ Header Bar ══ -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800 flex-shrink-0">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            @if (task()) {
              <app-task-header
                [task]="task"
                [saveStatus]="saveStatusSignal"
              />
            }
          </div>

          <!-- Header Controls -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- View Mode Controls -->
            <button pButton icon="pi pi-align-right" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'right-pane' ? 'primary' : 'secondary'"
              pTooltip="Slide-in Drawer" (click)="viewModeChange.emit('right-pane')"></button>
            <button pButton icon="pi pi-clone" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'popup' ? 'primary' : 'secondary'"
              pTooltip="Dialog Popup" (click)="viewModeChange.emit('popup')"></button>
            <button pButton icon="pi pi-desktop" class="p-button-rounded p-button-text p-button-sm"
              [severity]="viewMode === 'full-page' ? 'primary' : 'secondary'"
              pTooltip="Full Page" (click)="viewModeChange.emit('full-page')"></button>

            <div class="w-px h-4 bg-gray-200 dark:bg-surface-600 mx-1"></div>

            <!-- Close -->
            <button pButton [icon]="viewMode === 'full-page' ? 'pi pi-arrow-left' : 'pi pi-times'"
              class="p-button-rounded p-button-text p-button-sm" severity="secondary"
              [pTooltip]="viewMode === 'full-page' ? t().backToList : t().close"
              (click)="onClose()"></button>
          </div>
        </div>

        <!-- ══ Body ══ -->
        @if (task()) {
          <!-- Single scrollable column — title + all content + activity in one scroll -->
          <div class="flex-1 overflow-y-auto min-h-0">
            <!-- Title -->
            <div class="px-4 py-3 border-b border-gray-100 dark:border-surface-700">
              <app-task-title-inline
                [title]="task()!.title"
                [disabled]="isTaskClosed()"
                [viewMode]="viewMode === 'right-pane' ? 'drawer' : viewMode === 'full-page' ? 'full-page' : 'popup'"
                (titleSaved)="onTitleSaved($event)"
              />
            </div>

            <!-- Metadata row (unified two-row layout!) -->
            <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px 16px; border-bottom: 1px solid var(--surface-100, #f3f4f6)" class="dark:border-surface-700/50 bg-gray-50/20 dark:bg-surface-800/10">
              <!-- Row 1: Core properties -->
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap">
                <!-- State -->
                <button class="meta-pill" [class.active]="false" (click)="statePopover.toggle($event)">
                  @if (selectedStateRef(); as st) {
                    <app-state-dot [state]="st" [size]="10" />
                  } @else {
                    <span style="width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; display: inline-block; background: #9CA3AF"></span>
                  }
                  <span>{{ selectedStateName() }}</span>
                </button>

                <div class="meta-divider"></div>

                <!-- Priority -->
                <button class="meta-pill" [class.active]="false" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && priorityPopover.toggle($event)">
                  <app-icon-display [icon]="selectedPriorityConfig().icon" [style.color]="selectedPriorityConfig().colorLight" [size]="layoutService.appIconSize() - 3" class="leading-none" />
                  <span>{{ selectedPriorityConfig().name }}</span>
                </button>

                <div class="meta-divider"></div>

                <!-- Assignees -->
                <button class="meta-pill" [class.active]="selectedAssigneeIds().length > 0" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && assigneePopover.toggle($event)">
                  @if (selectedAssigneeIds().length) {
                    <div style="display: flex; align-items: center; gap: -2px">
                      @for (id of selectedAssigneeIds().slice(0, 3); track id) {
                        <div class="avatar-xs" style="margin-right: -4px">{{ getMemberInitial(id) }}</div>
                      }
                    </div>
                    <span style="margin-left: 6px">
                      {{ selectedAssigneeIds().length === 1 ? getMemberName(selectedAssigneeIds()[0]) : t().assigneeLabel(selectedAssigneeIds().length) }}
                    </span>
                  } @else {
                    <i class="pi pi-user" style="font-size: 11px"></i>
                    <span>{{ t().assigneePlaceholder }}</span>
                  }
                </button>

                <div style="flex-grow: 1"></div>

                <!-- Close/Reopen task shortcuts -->
                @if (task()) {
                  @if (!isTaskClosed()) {
                    <button pButton [label]="t().closeTaskBtn" icon="pi pi-check-circle" severity="primary" [outlined]="true" size="small"
                            class="!py-1 !px-2.5 !h-7 text-xs font-semibold"
                            (click)="closeTask()"></button>
                  } @else {
                    <button pButton [label]="t().reopenTaskBtn" icon="pi pi-refresh" severity="secondary" [outlined]="true" size="small"
                            class="!py-1 !px-2.5 !h-7 text-xs font-semibold"
                            (click)="reopenTask()"></button>
                  }
                }
              </div>

              <!-- Row 2: Supporting properties -->
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap">
                <!-- Labels -->
                <button class="meta-pill" [class.active]="selectedLabelIds().length > 0" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && labelPopover.toggle($event)">
                  <i class="pi pi-tag" style="font-size: 11px"></i>
                  @if (selectedLabelIds().length) {
                    <div class="flex items-center gap-1">
                      @for (id of selectedLabelIds().slice(0, 2); track id) {
                        @if (isScoped(getLabelName(id))) {
                          <span class="inline-flex items-center text-[10px] rounded-full overflow-hidden border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-800 font-medium">
                            <span class="px-1.5 py-px text-white" 
                                  [style.background]="getScopeColor(getLabelName(id), getLabelColor(id, layoutService.isDarkMode()))" 
                                  [style.color]="layoutService.getTextColor(getScopeColor(getLabelName(id), getLabelColor(id, layoutService.isDarkMode())))">{{ getScope(getLabelName(id)) }}</span>
                            <span class="px-1.5 py-px" 
                                  [style.background]="getLabelColor(id, layoutService.isDarkMode()) + '18'" 
                                  [style.color]="getLabelColor(id, layoutService.isDarkMode())">{{ getValue(getLabelName(id)) }}</span>
                          </span>
                        } @else {
                          <span class="text-[10px] px-1 py-px rounded-full font-medium bg-white dark:bg-surface-800 border"
                                [style.border-color]="getLabelColor(id, layoutService.isDarkMode())"
                                [style.color]="getLabelColor(id, layoutService.isDarkMode())"
                                [pTooltip]="getLabelDescription(id) ? getLabelName(id) + ': ' + getLabelDescription(id) : getLabelName(id)">
                            {{ getLabelName(id) }}
                          </span>
                        }
                      }
                      @if (selectedLabelIds().length > 2) {
                        <span class="text-[10px] font-medium text-gray-400">+{{ selectedLabelIds().length - 2 }}</span>
                      }
                    </div>
                  } @else {
                    <span>Labels</span>
                  }
                </button>

                <div class="meta-divider"></div>

                <!-- Parent Task -->
                <button class="meta-pill" [class.active]="(task()?.parentId) !== null" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && parentPopover.toggle($event)">
                  <i class="pi pi-sitemap" style="font-size: 11px" [style.color]="(task()?.parentId) !== null ? 'var(--p-primary-color)' : undefined"></i>
                  <span [style.color]="(task()?.parentId) !== null ? 'var(--p-primary-color)' : undefined">{{ (task()?.parentId) ? selectedParentTitle : t().parentPlaceholder }}</span>
                </button>

                <!-- Start date -->
                <button class="meta-pill" [class.active]="!!(task()?.startDate)" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && startDatePopover.toggle($event)">
                  <i class="pi pi-calendar" style="font-size: 11px" [style.color]="(task()?.startDate) ? 'var(--p-primary-color)' : undefined"></i>
                  <span [style.color]="(task()?.startDate) ? 'var(--p-primary-color)' : undefined">
                    {{ (task()?.startDate) ? (task()?.startDate | date:'dd/MM/yy') : t().startDatePlaceholder }}
                  </span>
                </button>

                <!-- Due date -->
                <button class="meta-pill" [class.active]="!!(task()?.dueDate)" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && dueDatePopover.toggle($event)">
                  <i class="pi pi-calendar" style="font-size: 11px"
                    [style.color]="isOverdue() ? '#ef4444' : (task()?.dueDate) ? 'var(--p-primary-color)' : undefined"></i>
                  <span [style.color]="isOverdue() ? '#ef4444' : (task()?.dueDate) ? 'var(--p-primary-color)' : undefined">
                    {{ (task()?.dueDate) ? (task()?.dueDate | date:'dd/MM/yy') : t().dueDatePlaceholder }}
                  </span>
                </button>

                <!-- Estimate -->
                <button class="meta-pill" [class.active]="(task()?.estimateValue) !== null" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && estimatePopover.toggle($event)">
                  <i class="pi pi-stopwatch" style="font-size: 11px" [style.color]="(task()?.estimateValue) !== null ? 'var(--p-primary-color)' : undefined"></i>
                  <span [style.color]="(task()?.estimateValue) !== null ? 'var(--p-primary-color)' : undefined">
                    {{ (task()?.estimateValue) !== null ? (task()?.estimateValue) + ' pts' : t().estimateLabel }}
                  </span>
                </button>

                <div class="meta-divider"></div>

                <!-- Modules -->
                <button class="meta-pill" [class.active]="selectedModuleIds().length > 0" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && modulePopover.toggle($event)">
                  <i class="pi pi-box" style="font-size: 11px" [style.color]="selectedModuleIds().length > 0 ? 'var(--p-primary-color)' : undefined"></i>
                  @if (selectedModuleIds().length) {
                    <div class="flex items-center gap-1">
                      @for (id of selectedModuleIds().slice(0, 2); track id) {
                        <span class="text-[10px] px-1.5 py-px rounded-full font-medium bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-700"
                              [style.color]="'var(--p-primary-color)'">
                          {{ moduleOptions().find(m => m.id === id)?.name || id }}
                        </span>
                      }
                      @if (selectedModuleIds().length > 2) {
                        <span class="text-[10px] font-medium text-gray-400">+{{ selectedModuleIds().length - 2 }}</span>
                      }
                    </div>
                  } @else {
                    <span>{{ t().modules }}</span>
                  }
                </button>

                <div class="meta-divider"></div>

                <!-- Sprint -->
                <button class="meta-pill" [class.active]="!!(task()?.sprintId)" 
                        [class.cursor-not-allowed]="isTaskClosed()"
                        [class.opacity-60]="isTaskClosed()"
                        (click)="!isTaskClosed() && sprintPopover.toggle($event)">
                  <app-icon-display [icon]="sprintIconClass()" [size]="layoutService.appIconSize() - 3" class="flex-shrink-0" [style.color]="(task()?.sprintId) ? 'var(--p-primary-color)' : undefined"></app-icon-display>
                  <span [style.color]="(task()?.sprintId) ? 'var(--p-primary-color)' : undefined">{{ currentSprintName() }}</span>
                </button>
              </div>
            </div>

            <!-- Description: đọc mặc định, click để sửa (read-mode design) -->
            <div class="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-surface-700">
              <label class="text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wide mb-2 block">{{ t().descriptionLabel }}</label>
              @if (showRte()) {
                <app-task-description-section
                  [doc]="task()?.description ?? null"
                  [disabled]="isTaskClosed()"
                  [saveStatus]="stateService.saveStatus()"
                  (saveRequested)="onDescriptionSave($event)"
                  (checkboxToggled)="onDescriptionSave($event)"
                  (editingChange)="stateService.editingSection.set($event ? 'description' : null)"
                />
              } @else {
                <div class="min-h-[4rem] rounded-lg border border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-800"></div>
              }
            </div>

            <!-- Attachments & Links -->
            <div class="px-4 py-3 border-b border-gray-100 dark:border-surface-700 flex flex-col gap-3">
              <app-task-attachments
                [projectId]="projectId()"
                [taskId]="task()!.id"
                [attachments]="task()!.attachments ?? []"
                [disabled]="isTaskClosed()"
                (upload)="onFileUpload($event)"
                (delete)="deleteAttachment($event)"
                (deleteGroup)="deleteAttachmentGroup($event)"
                (batchUpdate)="onBatchUpdateAttachments($event)"
              />
              <app-task-links
                [links]="task()!.links ?? []"
                [disabled]="isTaskClosed()"
                (add)="addLink($event)"
                (delete)="deleteLink($event)"
              />
            </div>

            <!-- Sub-Items -->
            <div class="px-4 py-3 border-b border-gray-100 dark:border-surface-700">
              <app-sub-items-section
                [items]="stateService.subItemsTree()"
                [totalCount]="stateService.subItemsTotalCount()"
                [doneCount]="stateService.subItemsDoneCount()"
                [members]="memberOptions()"
                [projectId]="projectId()"
                [taskId]="task()!.id"
                [disabled]="isTaskClosed()"
                (createSubItem)="onCreateSubItem($event)"
                (subItemClicked)="openChildTask($event)"
                (saveRequested)="onSubItemSaveRequested($event)"
              />
            </div>

            <!-- Comments -->
            <div class="px-4 py-3 border-b border-gray-100 dark:border-surface-700">
              <label class="text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wide mb-3 block">{{ t().commentsHeader }}</label>
              <app-task-comments
                [projectId]="projectId()"
                [taskId]="task()!.id"
                [disabled]="isTaskClosed()"
                [membersList]="memberOptions()"
              />
            </div>

            <!-- Activity + Properties tab (compact, no internal scroll — parent div scrolls) -->
            <div class="px-4 pt-3 pb-6">
              <app-activity-panel
                [entries]="stateService.activityEntries()"
                [loading]="stateService.activityLoading()"
                [hasMore]="stateService.activityHasMore()"
                [activeFilter]="activeActivityTab()"
                [viewMode]="viewMode === 'right-pane' ? 'drawer' : viewMode === 'full-page' ? 'full-page' : 'popup'"
                [showPropertiesTab]="false"
                [compact]="true"
                [projectId]="projectId()"
                [taskId]="task()!.id"
                [membersList]="memberOptions()"
                (filterChanged)="onActivityFilterChanged($event)"
                (loadMore)="onActivityLoadMore()"
                (loadAll)="onActivityLoadAll()"
              />
            </div>
          </div>
        }
        <!-- Popovers (unified with quick-create style!) -->

        <!-- State Popover -->
        <p-popover #statePopover>
          <div style="min-width: 140px; padding: 2px; display: flex; flex-direction: column; gap: 2px">
            @for (s of stateOptions(); track s.id) {
              <button class="pop-item" [class.selected]="task()?.stateId === s.id"
                style="padding: 5px 10px; font-size: 12px; border-radius: 4px"
                (click)="selectState(s.id); statePopover.hide()">
                <app-state-dot [state]="s" [size]="10" />
                <span style="flex: 1; text-align: left; font-size: 12px">{{ s.name }}</span>
                @if (task()?.stateId === s.id) {
                  <i class="pi pi-check" style="font-size: 10px; color: var(--p-primary-color); flex-shrink: 0"></i>
                }
              </button>
            }
          </div>
        </p-popover>

        <!-- Priority Popover -->
        <p-popover #priorityPopover>
          <div [style.min-width]="'140px'" style="padding: 2px; display: flex; flex-direction: column; gap: 2px">
            @for (p of priorityOptions(); track p.value) {
              <button class="pop-item" [class.selected]="(task()?.priority ?? 'none') === p.value"
                style="padding: 5px 10px; font-size: 12px; border-radius: 4px"
                (click)="selectPriority(p.value); priorityPopover.hide()">
                <app-icon-display [icon]="p.icon" [style.color]="p.colorLight" [size]="layoutService.appIconSize() - 3" class="leading-none" />
                <span style="flex: 1; text-align: left; font-size: 12px">{{ p.name }}</span>
                @if ((task()?.priority ?? 'none') === p.value) {
                  <i class="pi pi-check" style="font-size: 10px; color: var(--p-primary-color); flex-shrink: 0"></i>
                }
              </button>
            }
          </div>
        </p-popover>

        <!-- Assignees Popover -->
        <p-popover #assigneePopover (onShow)="focusAssigneeSearch()">
          <div style="width: 220px; padding: 4px; display: flex; flex-direction: column; gap: 4px">
            <input #assigneeSearchInput type="text" pInputText [placeholder]="t().searchAssigneePlaceholder"
              style="padding: 4px 8px; font-size: 11px; width: 100%"
              [ngModel]="assigneeSearch()" (ngModelChange)="assigneeSearch.set($event)" />
            <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px">
              @if (!filteredMembers().length) {
                <p style="padding: 6px; font-size: 11px; color: var(--text-color-secondary); text-align: center">
                  {{ t().noMemberFound }}
                </p>
              }
              @for (m of filteredMembers(); track m.userId) {
                <button class="pop-item" [class.selected]="selectedAssigneeIds().includes(m.userId)"
                  style="padding: 5px 10px; font-size: 12px; border-radius: 4px"
                  (click)="toggleAssignee(m.userId)">
                  <div class="avatar-xs">{{ getMemberInitial(m.userId) }}</div>
                  <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px">{{ m.displayName }}</span>
                  @if (selectedAssigneeIds().includes(m.userId)) {
                    <i class="pi pi-check" style="font-size: 10px; color: var(--p-primary-color); flex-shrink: 0"></i>
                  }
                </button>
              }
            </div>
          </div>
        </p-popover>

        <!-- Labels Popover -->
        <p-popover #labelPopover (onShow)="focusLabelSearch()">
          <div style="width: 240px; padding: 4px; display: flex; flex-direction: column; gap: 4px">
            <input #labelSearchInput type="text" pInputText [placeholder]="t().labelsPlaceholder"
              style="padding: 4px 8px; font-size: 11px; width: 100%"
              [ngModel]="labelSearch()" (ngModelChange)="labelSearch.set($event)" />
            <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px">
              @if (!filteredLabels().length) {
                <p style="padding: 6px; font-size: 11px; color: var(--text-color-secondary); text-align: center">
                  {{ t().noLabelFound }}
                </p>
              }
              @for (l of filteredLabels(); track l.id) {
                <button class="pop-item" [class.selected]="selectedLabelIds().includes(l.id)"
                  style="padding: 5px 10px; font-size: 12px; border-radius: 4px"
                  (click)="toggleLabel(l.id)">
                  <span style="width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0"
                    [style.background]="layoutService.isDarkMode() ? l.colorDark : l.colorLight"></span>
                  <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px">{{ l.name }}</span>
                  @if (selectedLabelIds().includes(l.id)) {
                    <i class="pi pi-check" style="font-size: 10px; color: var(--p-primary-color); flex-shrink: 0"></i>
                  }
                </button>
              }
            </div>
          </div>
        </p-popover>

        <!-- Parent Popover -->
        <p-popover #parentPopover (onShow)="focusParentSearch()">
          <div style="width: 260px; padding: 4px; display: flex; flex-direction: column; gap: 4px">
            <input #parentSearchInput type="text" pInputText [placeholder]="t().parentPlaceholder"
              style="padding: 4px 8px; font-size: 11px; width: 100%"
              [ngModel]="parentSearch()" (ngModelChange)="parentSearch.set($event)" />
            <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px">
              <button class="pop-item" [class.selected]="task()?.parentId === null"
                style="padding: 5px 10px; font-size: 12px; border-radius: 4px"
                (click)="selectParent(null); parentPopover.hide()">
                <i class="pi pi-times text-gray-400" style="font-size: 11px"></i>
                <span style="flex: 1; font-size: 12px; color: var(--text-color-secondary)">{{ t().noParent }}</span>
                @if (task()?.parentId === null) {
                  <i class="pi pi-check" style="font-size: 10px; color: var(--p-primary-color); flex-shrink: 0"></i>
                }
              </button>
              @if (!filteredParents().length && parentSearch()) {
                <p style="padding: 6px; font-size: 11px; color: var(--text-color-secondary); text-align: center">
                  {{ t().noParentFound }}
                </p>
              }
              @for (p of filteredParents(); track p.id) {
                <button class="pop-item" [class.selected]="task()?.parentId === p.id"
                  style="padding: 5px 10px; font-size: 12px; border-radius: 4px"
                  (click)="selectParent(p.id); parentPopover.hide()">
                  <i class="pi pi-sitemap text-gray-400" style="font-size: 11px"></i>
                  <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px">
                    {{ p.taskId }} {{ p.title }}
                  </span>
                  @if (task()?.parentId === p.id) {
                    <i class="pi pi-check" style="font-size: 10px; color: var(--p-primary-color); flex-shrink: 0"></i>
                  }
                </button>
              }
            </div>
          </div>
        </p-popover>

        <!-- Start Date Popover -->
        <p-popover #startDatePopover>
          <div style="padding: 8px; display: flex; flex-direction: column; gap: 6px">
            <p-datepicker [ngModel]="startDateValue()" (ngModelChange)="onStartDateChange($event); startDatePopover.hide()"
              [inline]="true" styleClass="border-0 text-xs" />
            @if (task()?.startDate) {
              <button pButton [label]="t().clearDate" severity="secondary" size="small" [text]="true"
                (click)="onStartDateChange(null); startDatePopover.hide()"></button>
            }
          </div>
        </p-popover>

        <!-- Due Date Popover -->
        <p-popover #dueDatePopover>
          <div style="padding: 8px; display: flex; flex-direction: column; gap: 6px">
            <p-datepicker [ngModel]="dueDateValue()" (ngModelChange)="onDueDateChange($event); dueDatePopover.hide()"
              [inline]="true" styleClass="border-0 text-xs" />
            @if (task()?.dueDate) {
              <button pButton [label]="t().clearDate" severity="secondary" size="small" [text]="true"
                (click)="onDueDateChange(null); dueDatePopover.hide()"></button>
            }
          </div>
        </p-popover>

        <!-- Estimate Popover -->
        <p-popover #estimatePopover>
          <div style="padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; width: 180px">
            <div class="flex items-center justify-between text-xs font-semibold text-gray-500 mb-1">
              <span>{{ t().estimateLabel }}</span>
              <span class="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                {{ localEstimate() !== null ? localEstimate() : 0 }} pts
              </span>
            </div>
            <div class="flex items-center gap-3 py-1">
              <p-slider 
                [ngModel]="localEstimate() || 0" 
                (ngModelChange)="onEstimateChange($event)"
                [min]="0" 
                [max]="20" 
                [step]="0.5" 
                class="w-full flex-1"
              ></p-slider>
              @if (localEstimate() !== null) {
                <button pButton icon="pi pi-times" severity="secondary" [text]="true" size="small"
                  [pTooltip]="t().deleteBtn" (click)="onEstimateChange(null); estimatePopover.hide()" style="flex-shrink: 0; width: 20px; height: 20px; padding: 0"></button>
              }
            </div>
          </div>
        </p-popover>

        <!-- Modules Popover -->
        <p-popover #modulePopover>
          <div style="min-width: 180px; max-width: 240px; padding: 2px; display: flex; flex-direction: column; gap: 2px">
            <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px">
              @if (!moduleOptions().length) {
                <p style="padding: 6px; font-size: 11px; color: var(--text-color-secondary); text-align: center">
                  {{ t().noModule }}
                </p>
              }
              @for (m of moduleOptions(); track m.id) {
                <button class="pop-item" [class.selected]="selectedModuleIds().includes(m.id)"
                  style="padding: 5px 10px; font-size: 12px; border-radius: 4px"
                  (click)="toggleModule(m.id)">
                  <i class="pi pi-box text-gray-400" style="font-size: 11px"></i>
                  <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px">{{ m.name }}</span>
                  @if (selectedModuleIds().includes(m.id)) {
                    <i class="pi pi-check" style="font-size: 10px; color: var(--p-primary-color); flex-shrink: 0"></i>
                  }
                </button>
              }
            </div>
          </div>
        </p-popover>

        <!-- Sprint Popover -->
        <p-popover #sprintPopover>
          <div style="min-width: 180px; max-width: 240px; padding: 2px; display: flex; flex-direction: column; gap: 2px">
            <div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px">
              @if (!availableSprints().length) {
                <p style="padding: 6px; font-size: 11px; color: var(--text-color-secondary); text-align: center">
                  {{ t().noSprintPlanningOrActive }}
                </p>
              }
              @for (s of availableSprints(); track s.id) {
                <button class="pop-item" [class.selected]="task()?.sprintId === s.id"
                  style="padding: 5px 10px; font-size: 12px; border-radius: 4px"
                  (click)="setSprint(s.id); sprintPopover.hide()">
                  <span style="width: 8px; height: 8px; border-radius: 9999px; flex-shrink: 0"
                    [style.background]="s.status === 'active' ? '#22c55e' : '#facc15'"></span>
                  <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px">{{ s.name }}</span>
                  @if (task()?.sprintId === s.id) {
                    <i class="pi pi-check" style="font-size: 10px; color: var(--p-primary-color); flex-shrink: 0"></i>
                  }
                </button>
              }
              @if (task()?.sprintId) {
                <button class="pop-item" style="padding: 5px 10px; font-size: 12px; border-radius: 4px; color: #ef4444"
                  (click)="setSprint(null); sprintPopover.hide()">
                  <i class="pi pi-times" style="font-size: 10px; flex-shrink: 0"></i>
                  <span style="font-size: 12px">{{ t().removeFromSprint }}</span>
                </button>
              }
            </div>
          </div>
        </p-popover>

        <!-- Close warning confirmation dialog -->
        <p-dialog
          [visible]="showCloseConfirm()"
          (visibleChange)="showCloseConfirm.set($event)"
          [modal]="true"
          [header]="t().closeWarningHeader"
          [style]="{ width: '450px' }"
          [closable]="true"
        >
          <div class="flex flex-col gap-4">
            <div class="text-sm text-gray-600 dark:text-surface-300">
              {{ t().closeWarningMsg }}
            </div>
            
            <div class="max-h-48 overflow-y-auto border border-gray-200 dark:border-surface-700 rounded p-2 bg-gray-50 dark:bg-surface-800 flex flex-col gap-1">
              @for (child of incompleteSubTasks(); track child.id) {
                <div class="text-xs flex items-center gap-1.5 py-0.5 text-gray-700 dark:text-surface-200" [style.padding-left.px]="child.depth * 16">
                  <i class="pi pi-sitemap text-gray-400"></i>
                  <span class="font-semibold text-gray-500">{{ child.taskId }}:</span>
                  <span class="truncate">{{ child.title }}</span>
                </div>
              }
            </div>

            <div class="flex items-center gap-2 mt-2">
              <p-checkbox [binary]="true" [ngModel]="autoCloseChildren()" (ngModelChange)="autoCloseChildren.set($event)" id="autoCloseChildrenDetail" />
              <label for="autoCloseChildrenDetail" class="text-sm font-medium text-gray-700 dark:text-surface-300 cursor-pointer">
                {{ t().autoCloseSubtasksLabel }}
              </label>
            </div>
          </div>

          <ng-template #footer>
            <div class="flex justify-end gap-2 mt-4">
              <button pButton [label]="t().cancelBtn" severity="secondary" (click)="showCloseConfirm.set(false); targetStateId.set(null)"></button>
              <button pButton [label]="t().confirmBtn" severity="primary" (click)="confirmCloseTask()"></button>
            </div>
          </ng-template>
        </p-dialog>
      </div>
    </ng-template>
    <p-toast />
  `,
})
export class TaskDetailPanelComponent implements OnInit, OnChanges, OnDestroy {
  // ─── Injected Services ──────────────────────────────────────────────────
  readonly taskStore = inject(TaskStore);
  readonly projectStore = inject(ProjectStore);
  private readonly customTrans = inject(CustomTranslationService);
  readonly moduleStore = inject(ModuleStore);
  readonly stateService = inject(TaskDetailStateService);
  private readonly authStore = inject(AuthStore);
  private readonly attachmentService = inject(AttachmentService);
  private readonly taskService = inject(TaskService);
  private readonly sprintService = inject(SprintService);
  private readonly linkService = inject(LinkService);
  private readonly relationService = inject(RelationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly layoutService = inject(LayoutService);
  private readonly priorityConfigService = inject(PriorityConfigService);
  private readonly destroy$ = new Subject<void>();
  private readonly injector = inject(Injector);

  // ─── Inputs / Outputs ──────────────────────────────────────────────────
  @Input() viewMode: 'right-pane' | 'full-page' | 'popup' = 'right-pane';
  @Output() viewModeChange = new EventEmitter<'right-pane' | 'full-page' | 'popup'>();

  // ─── Component State ────────────────────────────────────────────────────
  readonly task = this.taskStore.currentTask;
  readonly isVisible = signal(false);
  readonly isTaskClosed = computed(() => this.task()?.state?.group === 'completed');
  protected readonly showCloseConfirm = signal(false);
  protected readonly targetStateId = signal<string | null>(null);
  protected readonly autoCloseChildren = signal(false);

  private getIncompleteDescendants(nodes: SubItemTreeNode[], depth = 1): Array<{ id: string; taskId: string; title: string; depth: number }> {
    const result: Array<{ id: string; taskId: string; title: string; depth: number }> = [];
    for (const node of nodes) {
      const isCompleted = node.state?.group === 'completed';
      if (!isCompleted) {
        result.push({
          id: node.id,
          taskId: node.taskId,
          title: node.title,
          depth
        });
      }
      if (node.children && node.children.length > 0) {
        result.push(...this.getIncompleteDescendants(node.children, depth + 1));
      }
    }
    return result;
  }

  protected readonly incompleteSubTasks = computed(() => {
    const tree = this.stateService.subItemsTree();
    return this.getIncompleteDescendants(tree);
  });

  protected readonly localEstimate = signal<number | null>(null);
  private readonly estimateUpdate$ = new Subject<number | null>();
  /** Delayed true so Tiptap init happens in a separate macrotask from the mode-switch CD cycle */
  protected readonly showRte = signal(false);
  private _showRteTimer?: ReturnType<typeof setTimeout>;
  protected readonly currentUserId = computed(() => this.authStore.currentUser()?.id ?? '');
  private isDestroying = false;

  /** Signal accessor for save status — passed to TaskHeaderComponent */
  readonly saveStatusSignal = computed(() => this.taskStore.saveStatus());

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    const ct = this.customTrans;
    return {
      backToList:              ct.t('task-detail.backToList',          isEn ? 'Back to list'                  : 'Quay lại danh sách'),
      close:                   ct.t('task-detail.close',               isEn ? 'Close'                         : 'Đóng'),
      assigneeLabel:           (count: number) => isEn ? (count === 1 ? '1 assignee' : `${count} assignees`) : (count === 1 ? '1 người' : `${count} người`),
      assigneePlaceholder:     ct.t('task-detail.assigneePlaceholder', isEn ? 'Assignee'                      : 'Người phụ trách'),
      noAssignee:              ct.t('task-detail.noAssignee',          isEn ? 'No assignee'                   : 'Chưa giao'),
      searchAssigneePlaceholder:ct.t('task-detail.searchAssignee',     isEn ? 'Search members...'             : 'Tìm thành viên...'),
      noMemberFound:           ct.t('task-detail.noMemberFound',       isEn ? 'No members found'              : 'Không tìm thấy thành viên'),
      startDatePlaceholder:    ct.t('task-detail.startDate',           isEn ? 'Start date'                    : 'Bắt đầu'),
      dueDatePlaceholder:      ct.t('task-detail.dueDate',             isEn ? 'Due date'                      : 'Hết hạn'),
      clearDate:               ct.t('task-detail.clearDate',           isEn ? 'Clear date'                    : 'Xóa ngày'),
      descriptionLabel:        ct.t('task-detail.descriptionLabel',    isEn ? 'Description'                   : 'Mô tả'),
      labelsPlaceholder:       ct.t('task-detail.labelsPlaceholder',   isEn ? 'Search labels...'              : 'Tìm nhãn...'),
      noLabelFound:            ct.t('task-detail.noLabelFound',        isEn ? 'No labels found'               : 'Không tìm thấy nhãn'),
      parentPlaceholder:       ct.t('task-detail.parentPlaceholder',   isEn ? 'Search parent task...'         : 'Tìm parent task...'),
      noParent:                ct.t('task-detail.noParent',            isEn ? 'No parent'                     : 'Không có parent'),
      noParentFound:           ct.t('task-detail.noParentFound',       isEn ? 'No parent task found'          : 'Không tìm thấy parent'),
      estimateLabel:           ct.t('task-detail.estimateLabel',       isEn ? 'Estimate'                      : 'Ước lượng'),
      deleteBtn:               ct.t('task-detail.deleteBtn',           isEn ? 'Delete'                        : 'Xóa'),
      noModule:                ct.t('task-detail.noModule',            isEn ? 'No module'                     : 'Chưa có module'),
      noSprintPlanningOrActive:ct.t('task-detail.noSprintPlanningOrActive', isEn ? 'No sprint planning or active' : 'Chưa có sprint planning/active'),
      removeFromSprint:        ct.t('task-detail.removeFromSprint',    isEn ? 'Remove from sprint'            : 'Gỡ khỏi sprint'),
      stateLabel:              ct.t('task-detail.stateLabel',          isEn ? 'State'                         : 'Trạng thái'),
      toastSuccessHeader:      ct.t('task-detail.success',             isEn ? 'Success'                       : 'Thành công'),
      toastErrorHeader:        ct.t('task-detail.error',               isEn ? 'Error'                         : 'Lỗi'),
      uploadFailed:            ct.t('task-detail.uploadFailed',        isEn ? 'Upload failed'                 : 'Upload thất bại'),
      genericError:            ct.t('task-detail.genericError',        isEn ? 'Error occurred'                : 'Có lỗi xảy ra'),
      closeTaskBtn:            ct.t('task-detail.closeTaskBtn',        isEn ? 'Close task'                    : 'Đóng task'),
      reopenTaskBtn:           ct.t('task-detail.reopenTaskBtn',       isEn ? 'Reopen task'                   : 'Mở lại task'),
      commentsHeader:          ct.t('task-detail.commentsHeader',      isEn ? 'Comments'                      : 'Bình luận'),
      closeWarningHeader:      ct.t('backlog.closeWarningHeader',      isEn ? 'Close Task Warning'            : 'Cảnh báo đóng task'),
      closeWarningMsg:         ct.t('backlog.closeWarningMsg',         isEn ? 'This task has incomplete sub-tasks. Closing this task will leave them incomplete unless auto-closed.' : 'Task này có các sub-task chưa hoàn thành. Việc đóng task này sẽ để lại các sub-task ở trạng thái chưa hoàn thành trừ khi bạn tự động đóng.'),
      autoCloseSubtasksLabel:  ct.t('backlog.autoCloseSubtasksLabel',  isEn ? 'Auto-close incomplete sub-tasks' : 'Tự động đóng các task con chưa hoàn thành'),
      confirmBtn:              ct.t('backlog.confirmBtn',              isEn ? 'Confirm'                       : 'Đồng ý'),
      cancelBtn:               ct.t('backlog.cancelBtn',              isEn ? 'Cancel'                        : 'Hủy'),
      modules:                 ct.t('task-detail.modules',             isEn ? 'Modules'                       : 'Module'),
    };
  });

  /** Sprints (planning/active) cho popover gán sprint — cache chung từ SprintService */
  protected readonly availableSprints = computed(() => this.sprintService.openSprints());

  protected readonly currentSprintName = computed(() => {
    const id = this.task()?.sprintId;
    if (!id) return 'Sprint';
    return this.sprintService.sprintById().get(id)?.name ?? 'Sprint';
  });

  protected readonly sprintIconClass = computed(
    () => this.sprintService.projectSettings()?.icon ?? 'pi-flag',
  );

  /** Active tab in the activity panel — separate from the API filter so 'properties' tab works */
  protected readonly activeActivityTab = signal<ActivityFilterType | 'properties'>('all');

  /** Width of the properties sidebar in pixels; persisted to localStorage */
  protected readonly sidebarWidth = signal(this.loadSidebarWidth());
  /** True while the user is dragging the resize handle — suppresses width CSS transition */
  protected readonly isResizing = signal(false);

  // ─── Computed options for child components ─────────────────────────────
  protected readonly projectId = computed(() => this.projectStore.currentProject()?.id ?? '');

  protected readonly stateOptions = computed(() => {
    const states = this.projectStore.currentProjectStates();
    return states ? Object.values(states).flat() : [];
  });

  protected readonly memberOptions = computed(() => this.projectStore.members());
  protected readonly labelOptions = computed(() => this.taskStore.labels());
  protected readonly moduleOptions = computed(() => this.moduleStore.modules());

  protected readonly selectedAssigneeIds = computed(() => {
    return this.task()?.assignees?.map(a => (a as any).id || (a as any).userId).filter(Boolean) ?? [];
  });

  protected readonly selectedLabelIds = computed(() => {
    return this.task()?.labels?.map(l => l.id) ?? [];
  });

  protected readonly selectedModuleIds = computed(() => {
    return this.task()?.modules?.map(m => m.id) ?? [];
  });

  protected readonly startDateValue = computed(() => {
    const d = this.task()?.startDate;
    return d ? new Date(d) : null;
  });

  protected readonly dueDateValue = computed(() => {
    const d = this.task()?.dueDate;
    return d ? new Date(d) : null;
  });

  // ─── Metadata Row & Popovers Helpers ─────────────────────────────────────
  protected readonly priorityOptions = computed(() =>
    this.priorityConfigService.getOptions(this.projectId())
  );


  protected readonly selectedStateName = computed(() => {
    const t = this.task();
    const fallback = this.t().stateLabel;
    if (!t) return fallback;
    return this.stateOptions().find((s) => s.id === t.stateId)?.name ?? fallback;
  });

  protected readonly selectedStateRef = computed(() => {
    const t = this.task();
    if (!t) return null;
    return this.stateOptions().find((s) => s.id === t.stateId) ?? null;
  });

  protected readonly selectedPriorityConfig = computed(() => {
    const val = this.task()?.priority ?? 'none';
    const opts = this.priorityOptions();
    return opts.find((p) => p.value === val) ?? opts[opts.length - 1];
  });

  protected readonly selectedParentTitle = computed(() => {
    const parentId = this.task()?.parentId;
    if (!parentId) return 'Parent';
    const match = this.taskStore.tasks().find((t) => t.id === parentId);
    return match ? `${match.taskId} ${match.title}` : 'Parent';
  });

  protected isOverdue(): boolean {
    const t = this.task();
    if (!t || !t.dueDate) return false;
    const dueDateObj = new Date(t.dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    if (t.state?.group === 'completed') {
      if (!t.completedAt) return false;
      const completedDateObj = new Date(t.completedAt);
      completedDateObj.setHours(0, 0, 0, 0);
      return completedDateObj.getTime() > dueDateObj.getTime();
    }
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    return todayObj.getTime() > dueDateObj.getTime();
  }

  // --- Search signals & computeds ---
  protected readonly assigneeSearch = signal('');
  protected readonly filteredMembers = computed(() => {
    const query = this.assigneeSearch().trim().toLowerCase();
    const list = this.memberOptions();
    if (!query) return list;
    return list.filter(m => m.displayName.toLowerCase().includes(query));
  });

  protected readonly parentSearch = signal('');
  protected readonly parentOptions = computed(() =>
    this.taskStore.tasks().filter((t) => !t.parentId && t.id !== this.task()?.id)
  );
  protected readonly filteredParents = computed(() => {
    const query = this.parentSearch().trim().toLowerCase();
    const list = this.parentOptions();
    if (!query) return list;
    return list.filter(t => t.taskId.toLowerCase().includes(query) || t.title.toLowerCase().includes(query));
  });

  protected readonly labelSearch = signal('');
  protected readonly filteredLabels = computed(() => {
    const query = this.labelSearch().trim().toLowerCase();
    const list = this.labelOptions();
    if (!query) return list;
    return list.filter(l => l.name.toLowerCase().includes(query));
  });

  @ViewChild('assigneeSearchInput') assigneeSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('labelSearchInput') labelSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('parentSearchInput') parentSearchInput?: ElementRef<HTMLInputElement>;

  protected focusAssigneeSearch(): void {
    setTimeout(() => this.assigneeSearchInput?.nativeElement.focus(), 50);
  }
  protected focusLabelSearch(): void {
    setTimeout(() => this.labelSearchInput?.nativeElement.focus(), 50);
  }
  protected focusParentSearch(): void {
    setTimeout(() => this.parentSearchInput?.nativeElement.focus(), 50);
  }

  // --- Label coloring & parsing ---
  protected getLabelName(id: string): string {
    return this.labelOptions().find(l => l.id === id)?.name ?? id;
  }
  protected getLabelColor(id: string, isDark = false): string {
    const l = this.labelOptions().find(l => l.id === id);
    if (!l) return isDark ? '#6B7280' : '#9CA3AF';
    return isDark ? l.colorDark : l.colorLight;
  }
  protected getLabelDescription(id: string): string {
    return this.labelOptions().find(l => l.id === id)?.description ?? '';
  }
  protected isScoped(name: string): boolean {
    return name.includes('::');
  }
  protected getScope(name: string): string {
    return name.split('::')[0];
  }
  protected getValue(name: string): string {
    return name.split('::')[1] ?? name;
  }
  protected getScopeColor(name: string, defaultColor: string): string {
    const scope = this.getScope(name).toLowerCase();
    if (scope === 'epic') return '#8B5CF6';
    if (scope === 'story') return '#3B82F6';
    if (scope === 'task') return '#10B981';
    if (scope === 'bug') return '#EF4444';
    return defaultColor;
  }

  protected getMemberInitial(id: string): string {
    const match = this.memberOptions().find(m => m.userId === id);
    if (!match) return '?';
    return match.displayName.split(' ').pop()?.charAt(0).toUpperCase() || '?';
  }
  protected getMemberName(id: string): string {
    const match = this.memberOptions().find(m => m.userId === id);
    return match ? match.displayName : id;
  }

  // --- Properties Update Methods ---
  protected selectState(stateId: string): void {
    const t = this.task();
    if (!t) return;

    const targetState = this.stateOptions().find((s) => s.id === stateId);
    const isClosing = targetState?.group === 'completed';

    if (isClosing && this.incompleteSubTasks().length > 0) {
      this.targetStateId.set(stateId);
      this.autoCloseChildren.set(false); // Unchecked by default
      this.showCloseConfirm.set(true);
    } else {
      this.taskStore.updateTask(this.projectId(), t.id, { stateId });
    }
  }

  protected async confirmCloseTask(): Promise<void> {
    const t = this.task();
    const stateId = this.targetStateId();
    if (t && stateId) {
      const projId = this.projectId();
      
      // Update parent task
      this.taskStore.updateTask(projId, t.id, { stateId });

      if (this.autoCloseChildren()) {
        const completedState = this.stateOptions().find((s) => s.group === 'completed');
        const completedStateId = completedState ? completedState.id : stateId;
        const incompleteChildren = this.incompleteSubTasks();

        // Update all children
        const updatePromises = incompleteChildren.map(child => 
          firstValueFrom(this.taskService.updateTask(projId, child.id, { stateId: completedStateId }))
        );
        await Promise.allSettled(updatePromises);
      }

      // Reload detail panel and sub-items tree
      this.taskStore.loadTask(projId, t.taskId);
      this.stateService.loadSubItemsTree(projId, t.id);

      this.showCloseConfirm.set(false);
      this.targetStateId.set(null);
    }
  }

  protected closeTask(): void {
    const completedState = this.stateOptions().find((s) => s.group === 'completed');
    if (completedState) {
      this.selectState(completedState.id);
    }
  }

  protected reopenTask(): void {
    const activeState = this.stateOptions().find((s) => s.group !== 'completed' && s.group !== 'cancelled');
    if (activeState) {
      this.selectState(activeState.id);
    }
  }

  protected selectPriority(priority: string): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { priority: priority === 'none' ? null : priority } as any);
    }
  }

  protected toggleAssignee(userId: string): void {
    const t = this.task();
    if (t) {
      const current = this.selectedAssigneeIds();
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      this.taskStore.updateTask(this.projectId(), t.id, { assigneeIds: next });
    }
  }

  protected toggleLabel(labelId: string): void {
    const t = this.task();
    if (t) {
      const current = this.selectedLabelIds();
      let next: string[];
      if (current.includes(labelId)) {
        next = current.filter((id) => id !== labelId);
      } else {
        const addedLabel = this.labelOptions().find((l) => l.id === labelId);
        if (addedLabel && this.isScoped(addedLabel.name) && addedLabel.isExclusive !== false) {
          const scope = this.getScope(addedLabel.name).trim().toLowerCase();
          next = current.filter((id) => {
            const label = this.labelOptions().find((l) => l.id === id);
            if (label && this.isScoped(label.name) && label.isExclusive !== false) {
              return this.getScope(label.name).trim().toLowerCase() !== scope;
            }
            return true;
          });
          next.push(labelId);
        } else {
          next = [...current, labelId];
        }
      }
      this.taskStore.updateTask(this.projectId(), t.id, { labelIds: next });
    }
  }

  protected selectParent(parentId: string | null): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { parentId } as any);
    }
  }

  private formatDateToISO(date: Date | null): string | null {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  protected onStartDateChange(date: Date | null): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { startDate: this.formatDateToISO(date) } as any);
    }
  }

  protected onDueDateChange(date: Date | null): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { dueDate: this.formatDateToISO(date) } as any);
    }
  }

  protected onEstimateChange(val: number | null): void {
    this.localEstimate.set(val);
    this.estimateUpdate$.next(val);
  }

  protected toggleModule(moduleId: string): void {
    const t = this.task();
    if (t) {
      const current = this.selectedModuleIds();
      const next = current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId];
      this.taskStore.updateTask(this.projectId(), t.id, { moduleIds: next });
    }
  }

  protected setSprint(sprintId: string | null): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { sprintId });
    }
  }

  // ─── Constructor Effects ────────────────────────────────────────────────
  constructor() {
    // Effect: chỉ trigger khi task ID hoặc projectId thay đổi — KHÔNG phải
    // khi task object được cập nhật (save property, etc.).
    // Dùng untracked() để toàn bộ side-effects bên trong không tạo dependency mới.
    let lastLoadedTaskId: string | undefined;
    effect(() => {
      const taskId = this.task()?.id;
      const projectId = this.projectId();
      if (taskId && projectId && taskId !== lastLoadedTaskId) {
        lastLoadedTaskId = taskId;
        untracked(() => {
          this.stateService.loadSubItemsTree(projectId, taskId);
          this.taskStore.loadComments(projectId, taskId);
          this.stateService.loadActivity(projectId, taskId, 'all', 1, 20);
        });
      }
    });

    // Show RTE when panel becomes visible; hide when it closes
    effect(() => {
      const visible = this.isVisible();
      untracked(() => {
        clearTimeout(this._showRteTimer);
        if (visible) {
          this._showRteTimer = setTimeout(() => this.showRte.set(true));
        } else {
          this.showRte.set(false);
        }
      });
    });

    // Sync localEstimate when task changes
    effect(() => {
      const val = this.task()?.estimateValue ?? null;
      const status = this.taskStore.saveStatus();
      untracked(() => {
        if (status !== 'saving') {
          this.localEstimate.set(val);
        }
      });
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Wait for projectId to be available before reacting to queryParams.
    // On direct URL load, projectId may be empty until the project store hydrates.
    // combineLatest ensures we only fire once both are ready.
    const projectId$ = toObservable(this.projectId, { injector: this.injector }).pipe(
      filter((id): id is string => !!id),
      distinctUntilChanged(),
    );

    const queryParams$ = this.route.queryParams.pipe(
      distinctUntilChanged((a, b) => a['taskId'] === b['taskId']),
    );

    combineLatest([queryParams$, projectId$]).pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged(([pA, projA], [pB, projB]) => pA['taskId'] === pB['taskId'] && projA === projB),
    ).subscribe(([params, projectId]) => {
      const taskId = params['taskId'];
      if (taskId) {
        this.isVisible.set(true);
        this.taskStore.loadTask(projectId, taskId);
        this.projectStore.loadMembers(projectId);
        this.moduleStore.loadModules(projectId);
        this.taskStore.loadLabels(projectId);
        this.sprintService.loadProjectSprints(projectId);
      } else {
        this.isVisible.set(false);
      }
    });

    // Debounce estimate updates
    this.estimateUpdate$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((val) => {
        const t = this.task();
        if (t) {
          this.taskStore.updateTask(this.projectId(), t.id, { estimateValue: val });
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['viewMode']) return;
    // Template branches change on viewMode switch — reset and re-defer RTE init
    // to avoid blocking the mode-switch CD cycle regardless of which mode we switch to
    clearTimeout(this._showRteTimer);
    this.showRte.set(false);
    if (this.isVisible()) {
      this._showRteTimer = setTimeout(() => this.showRte.set(true));
    }
  }

  ngOnDestroy(): void {
    this.isDestroying = true;
    clearTimeout(this._showRteTimer);
    this.isVisible.set(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Header Actions ─────────────────────────────────────────────────────

  /** Toggle sidebar and persist state (Req 8.4, 8.7) */
  protected toggleSidebar(): void {
    this.stateService.toggleSidebar();
  }

  // ─── Sidebar Resize ─────────────────────────────────────────────────────

  private loadSidebarWidth(): number {
    try {
      const saved = localStorage.getItem('task-detail-sidebar-width');
      if (saved) return Math.max(240, Math.min(640, parseInt(saved, 10)));
    } catch { /* ignore */ }
    return 360;
  }

  private saveSidebarWidth(w: number): void {
    try { localStorage.setItem('task-detail-sidebar-width', String(w)); } catch { /* ignore */ }
  }

  protected onResizeStart(e: MouseEvent): void {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = this.sidebarWidth();
    this.isResizing.set(true);

    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(640, startWidth + (startX - ev.clientX)));
      this.sidebarWidth.set(newWidth);
    };

    const onUp = () => {
      this.isResizing.set(false);
      this.saveSidebarWidth(this.sidebarWidth());
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  protected onDialogVisibleChange(visible: boolean): void {
    if (!visible && this.viewMode === 'popup' && !this.isDestroying) {
      this.isVisible.set(false);
      this.onClose();
    }
  }

  protected onDrawerVisibleChange(visible: boolean): void {
    if (!visible && this.viewMode === 'right-pane' && !this.isDestroying) {
      this.isVisible.set(false);
      this.onClose();
    }
  }

  protected onDialogHide(): void {
    if (this.isDestroying) return;
    if (this.viewMode !== 'popup') return;
    this.onClose();
  }

  protected onDrawerClose(): void {
    if (this.isDestroying) return;
    if (this.viewMode !== 'right-pane') return;
    this.onClose();
  }

  protected onClose(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskId: null },
      queryParamsHandling: 'merge',
    });
  }

  // ─── Title ──────────────────────────────────────────────────────────────

  protected onTitleSaved(newTitle: string): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { title: newTitle });
    }
  }

  // ─── Description ────────────────────────────────────────────────────────

  protected onDescriptionSave(doc: TiptapDoc | null): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { description: doc });
    }
  }

  // ─── Properties Sidebar Events ──────────────────────────────────────────

  protected onPropertyChanged(event: { field: string; value: unknown }): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { [event.field]: event.value } as any);
    }
  }

  protected onParentChanged(parentId: string | null): void {
    const t = this.task();
    if (t) {
      this.taskStore.updateTask(this.projectId(), t.id, { parentId } as any);
    }
  }

  protected onSectionToggled(event: { key: string; expanded: boolean }): void {
    this.stateService.toggleSection(event.key);
  }

  // ─── Sub-Items Events ───────────────────────────────────────────────────

  protected onCreateSubItem(dto: CreateSubItemDto): void {
    const t = this.task();
    if (!t) return;
    const projectId = this.projectId();

    this.taskStore
      .createTask(projectId, {
        title: dto.title,
        parentId: dto.parentId,
        type: t.type === 'epic' ? 'story' : t.type === 'story' ? 'task' : 'subtask',
        assigneeIds: dto.assigneeIds,
        priority: dto.priority,
        dueDate: dto.dueDate,
      } as any)
      .then(() => {
        // Reload sub-items tree after creation
        this.stateService.loadSubItemsTree(projectId, t.id);
      });
  }

  protected async onSubItemSaveRequested(payload: {
    moves: Array<{ taskId: string; newParentId: string | null; oldParentId: string | null }>;
    parentOrders: Array<{ parentId: string | null; childIds: string[] }>;
  }): Promise<void> {
    const t = this.task();
    if (!t) return;
    const projectId = this.projectId();

    // 1. Reparent tasks where parent actually changed.
    //    In the flat tree, null means "direct child of the current task", not project-root.
    const reparentCalls = payload.moves
      .filter(m => m.newParentId !== m.oldParentId)
      .map(m =>
        firstValueFrom(
          this.taskService.updateTask(projectId, m.taskId, {
            parentId: m.newParentId ?? t.id,
          }),
        ),
      );
    await Promise.allSettled(reparentCalls);

    // 2. Persist sibling order for every affected parent via reorderTasks.
    //    backlogOrder = (index + 1) * 1000 preserves gaps for future inserts.
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

    // 3. Reload tree to reflect server-confirmed data + counts
    this.stateService.loadSubItemsTree(projectId, t.id);
  }

  protected openChildTask(taskId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { taskId },
      queryParamsHandling: 'merge',
    });
  }

  // ─── Activity Events ────────────────────────────────────────────────────

  protected onActivityFilterChanged(filter: ActivityFilterType | 'properties'): void {
    this.activeActivityTab.set(filter);
    if (filter === 'properties') return;
    const t = this.task();
    if (t) {
      this.stateService.setActivityFilter(filter as ActivityFilterType, this.projectId(), t.id);
    }
  }

  protected onActivityLoadMore(): void {
    const t = this.task();
    if (t) {
      this.stateService.loadMoreActivity(this.projectId(), t.id);
    }
  }

  protected onActivityLoadAll(): void {
    const t = this.task();
    if (t) {
      this.stateService.loadAllActivity(this.projectId(), t.id);
    }
  }

  // ─── Attachment & Link Events ───────────────────────────────────────────

  protected onFileUpload(event: { files: FileList; title: string }): void {
    const t = this.task();
    if (!t) return;
    const title = event.title || undefined;
    Array.from(event.files).forEach(file => {
      this.attachmentService.upload(this.projectId(), t.id, file, title).subscribe({
        next: (attachment) => this.taskStore.addAttachment(attachment),
        error: (err) =>
          this.messageService.add({
            severity: 'error',
            summary: this.t().toastErrorHeader,
            detail: err.error?.message ?? this.t().uploadFailed,
          }),
      });
    });
  }

  protected addLink(event: { url: string; title?: string }): void {
    const t = this.task();
    if (!t) return;
    this.linkService.addLink(this.projectId(), t.id, event).subscribe({
      next: () => this.taskStore.loadTask(this.projectId(), t.taskId),
      error: (err) =>
        this.messageService.add({
          severity: 'error',
          summary: this.t().toastErrorHeader,
          detail: err.error?.message ?? this.t().genericError,
        }),
    });
  }

  protected deleteAttachment(att: TaskAttachment): void {
    const t = this.task();
    if (t) {
      this.attachmentService
        .delete(this.projectId(), t.id, att.id)
        .subscribe(() => this.taskStore.removeAttachment(att.id));
    }
  }

  protected deleteAttachmentGroup(atts: TaskAttachment[]): void {
    const t = this.task();
    if (!t) return;
    atts.forEach(att => {
      this.attachmentService
        .delete(this.projectId(), t.id, att.id)
        .subscribe(() => this.taskStore.removeAttachment(att.id));
    });
  }

  protected onBatchUpdateAttachments(items: Array<{ id: string; title?: string | null; sortOrder?: number }>): void {
    const t = this.task();
    if (!t || !items.length) return;
    this.taskStore.batchUpdateAttachments(items);
    this.attachmentService
      .batchUpdate(this.projectId(), t.id, items)
      .subscribe({ error: () => this.taskStore.loadTask(this.projectId(), t.taskId) });
  }

  protected deleteLink(link: TaskLink): void {
    const t = this.task();
    if (t) {
      this.linkService
        .deleteLink(this.projectId(), t.id, link.id)
        .subscribe(() => this.taskStore.loadTask(this.projectId(), t.taskId));
    }
  }
}
