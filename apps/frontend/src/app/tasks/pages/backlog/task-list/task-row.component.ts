import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { TaskListItem, TaskType, TaskPriority, DisplayProperties, DEFAULT_DISPLAY_PROPS, Label } from '@mpm/shared-types';
import { LayoutService } from '../../../../layout/services/layout.service';
import { TaskStore } from '../../../state/task.store';

const PRIORITY_CONFIG = {
  urgent: { icon: 'pi pi-angle-double-up', color: '#EF4444', label: 'Urgent' },
  high: { icon: 'pi pi-angle-up', color: '#F97316', label: 'High' },
  medium: { icon: 'pi pi-minus', color: '#EAB308', label: 'Medium' },
  low: { icon: 'pi pi-angle-down', color: '#3B82F6', label: 'Low' },
  none: { icon: 'pi pi-circle', color: '#D1D5DB', label: 'None' }
} as Record<TaskPriority, { icon: string; color: string; label: string }>;

const TYPE_CONFIG = {
  epic: { icon: 'pi pi-bolt', color: '#8B5CF6' },
  story: { icon: 'pi pi-book', color: '#3B82F6' },
  task: { icon: 'pi pi-check-circle', color: '#10B981' },
  subtask: { icon: 'pi pi-minus-circle', color: '#6B7280' }
} as Record<TaskType, { icon: string; color: string }>;

const AVATAR_PALETTE = [
  ['#EDE9FE', '#5B21B6'], ['#DBEAFE', '#1E40AF'], ['#D1FAE5', '#065F46'],
  ['#FEF3C7', '#92400E'], ['#FCE7F3', '#9D174D'], ['#FFE4E6', '#9F1239']
];

@Component({
  selector: 'app-task-row',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DragDropModule,
    ButtonModule, CheckboxModule, TooltipModule
  ],
  styles: [`
    :host { display: flex; align-items: center; width: 100%; }
  `],
  template: `
    <div class="flex items-center justify-center flex-shrink-0 animate-fade-in" style="width:40px" (click)="$event.stopPropagation()">
      <p-checkbox 
        [class.show-on-hover]="!isSelected" 
        [class.opacity-0]="!isSelected" 
        [binary]="true" 
        [ngModel]="isSelected" 
        (ngModelChange)="selectionToggle.emit(task.id)" />
    </div>
    @if (depth === 1) {
      <span class="flex-shrink-0" style="width:20px; padding-left:4px"><span class="block w-3 h-px bg-gray-200 dark:bg-surface-700"></span></span>
    }
    <span class="text-xs font-mono text-gray-400 dark:text-surface-500 flex-shrink-0 mr-2" style="width:58px">{{ task.taskId }}</span>
    @if (childCount > 0) {
      <button class="flex items-center justify-center flex-shrink-0 w-4 h-4 rounded hover:bg-gray-200 dark:hover:bg-surface-800 mr-2" (click)="$event.stopPropagation(); toggleExpand.emit(task.id)">
        <i class="pi text-[9px] text-gray-500 dark:text-surface-400" [class.pi-chevron-right]="!isExpanded" [class.pi-chevron-down]="isExpanded"></i>
      </button>
    }
    <i class="flex-shrink-0 text-xs mr-2" [class]="typeIcon(task.type)" [style.color]="typeColor(task.type)" [pTooltip]="task.type"></i>
    <span class="flex-1 text-sm text-gray-800 dark:text-surface-100 truncate">{{ task.title }}</span>
    @if (displayProps.showSubItemCount && childCount > 0) {
      <span class="flex items-center gap-0.5 text-xs text-gray-400 dark:text-surface-500 flex-shrink-0 mr-2" [pTooltip]="childCount + ' sub-items'">
        <i class="pi pi-sitemap text-[10px]"></i>{{ childCount }}
      </span>
    }
    @if (displayProps.showLabels && task.labels?.length) {
      @if (displayProps.labelMode === 'dot') {
        <div class="flex items-center -space-x-1 flex-shrink-0 mr-2 select-none cursor-default"
             [class.show-on-hover]="!displayProps.alwaysShowLabels"
             [class.opacity-0]="!displayProps.alwaysShowLabels">
          @for (label of task.labels.slice(0, 4); track label.id) {
            <span class="w-2.5 h-2.5 rounded-full border border-white dark:border-surface-900 flex-shrink-0"
                  [style.background]="layoutService.getAdaptiveColor(label.color)"
                  [pTooltip]="label.description ? label.name + ': ' + label.description : label.name"></span>
          }
          @if (task.labels.length > 4) {
            <span class="text-[10px] text-gray-500 dark:text-surface-400 font-medium pl-1.5"
                  [pTooltip]="hiddenLabelsTooltip(task.labels, 4)">
              +{{ task.labels.length - 4 }}
            </span>
          }
        </div>
      } @else {
        <div class="flex items-center gap-1 flex-shrink-0 mr-2"
             [class.show-on-hover]="!displayProps.alwaysShowLabels"
             [class.opacity-0]="!displayProps.alwaysShowLabels">
          @for (label of task.labels.slice(0, displayProps.maxLabels); track label.id) {
            @if (isScoped(label.name)) {
              <span class="inline-flex items-center text-[10px] rounded-full overflow-hidden border border-gray-300 dark:border-surface-600 font-medium select-none cursor-default" [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                <span class="px-1.5 py-0.5"
                      [style.background]="layoutService.getAdaptiveColor(getScopeColor(label.name, label.color))"
                      [style.color]="layoutService.getTextColor(layoutService.getAdaptiveColor(getScopeColor(label.name, label.color)))">{{ getScope(label.name) }}</span>
                <span class="px-1.5 py-0.5"
                      [style.background]="layoutService.getAdaptiveColor(label.color) + '28'"
                      [style.color]="layoutService.getAdaptiveColor(label.color)">{{ getValue(label.name) }}</span>
              </span>
            } @else {
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium border border-gray-300 dark:border-surface-600 select-none cursor-default"
                    [style.background]="layoutService.getAdaptiveColor(label.color) + '22'"
                    [style.color]="layoutService.getAdaptiveColor(label.color)"
                    [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                {{ label.name }}
              </span>
            }
          }
          @if (task.labels.length > displayProps.maxLabels) {
            <span class="inline-flex items-center text-[10px] text-gray-500 dark:text-surface-400 font-medium px-1 py-0.5 rounded-full bg-gray-100 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 flex-shrink-0 cursor-default"
                  [pTooltip]="hiddenLabelsTooltip(task.labels, displayProps.maxLabels)">
              +{{ task.labels.length - displayProps.maxLabels }}
            </span>
          }
        </div>
      }
    }
    @if (displayProps.showModules && task.modules?.length) {
      <div class="flex items-center gap-1 flex-shrink-0 mr-2">
        @for (mod of task.modules.slice(0, displayProps.maxModules); track mod.id) {
          <span class="inline-flex items-center gap-1 text-xs px-1.5 py-px rounded bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-600 dark:text-surface-300 max-w-[96px] cursor-default"
                [pTooltip]="(mod.scope === 'workspace' ? 'Workspace module: ' : 'Project module: ') + mod.name">
            <i [class]="mod.scope === 'workspace' ? 'pi pi-globe text-[10px]' : 'pi pi-folder text-[10px]'"></i>
            <span class="truncate" style="max-width:80px">{{ mod.name }}</span>
          </span>
        }
        @if (task.modules.length > displayProps.maxModules) {
          <span class="inline-flex items-center text-xs text-gray-500 dark:text-surface-400 font-medium px-1 py-px rounded-full bg-gray-100 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 flex-shrink-0 cursor-default"
                [pTooltip]="hiddenModulesTooltip(task.modules, displayProps.maxModules)">
            +{{ task.modules.length - displayProps.maxModules }}
          </span>
        }
      </div>
    }
    @if (displayProps.showEstimate && task.estimateValue != null) {
      <span class="flex items-center gap-0.5 text-xs text-gray-400 dark:text-surface-500 flex-shrink-0 mr-2" pTooltip="Estimate"><i class="pi pi-hourglass text-[10px]"></i>{{ task.estimateValue }}</span>
    }
    @if (displayProps.showDueDate && task.dueDate) {
      <span class="flex items-center gap-0.5 text-xs flex-shrink-0 mr-2" [class.text-red-500]="isOverdue(task.dueDate)" [class.text-gray-400]="!isOverdue(task.dueDate)" [class.dark:text-surface-500]="!isOverdue(task.dueDate)" pTooltip="Due date"><i class="pi pi-calendar text-[10px]"></i>{{ formatDate(task.dueDate) }}</span>
    }
    @if (displayProps.showPriority && task.priority !== 'none') {
      <i class="flex-shrink-0 text-xs mr-2" [class]="priorityIcon(task.priority)" [style.color]="priorityColor(task.priority)" [pTooltip]="'Priority: ' + task.priority"></i>
    }
    @if (displayProps.showAssignee && task.assignees?.length) {
      <div class="flex -space-x-1.5 flex-shrink-0 mr-2">
        @for (a of task.assignees.slice(0, 3); track a.userId) {
          <div class="w-5 h-5 rounded-full border-2 border-white dark:border-surface-900 flex items-center justify-center text-[10px] font-bold" [style.background]="avatarBg(a.displayName)" [style.color]="avatarFg(a.displayName)" [pTooltip]="a.displayName">{{ a.displayName[0].toUpperCase() }}</div>
        }
        @if (task.assignees.length > 3) {
          <div class="w-5 h-5 rounded-full bg-gray-100 dark:bg-surface-800 border-2 border-white dark:border-surface-900 flex items-center justify-center text-[10px] text-gray-500 dark:text-surface-400">+{{ task.assignees.length - 3 }}</div>
        }
      </div>
    }
    <button pButton icon="pi pi-ellipsis-h" size="small" text severity="secondary" class="show-on-hover opacity-0 flex-shrink-0 mr-2 !w-6 !h-6 !p-0" (click)="$event.stopPropagation(); taskMenuClick.emit(task)"></button>
  `
})
export class TaskRowComponent {
  protected readonly layoutService = inject(LayoutService);
  private readonly taskStore = inject(TaskStore);

  @Input({ required: true }) task!: TaskListItem;
  @Input() depth = 0;
  @Input() childCount = 0;
  @Input() isSelected = false;
  @Input() isExpanded = false;
  @Input() displayProps: DisplayProperties = DEFAULT_DISPLAY_PROPS;

  @Output() selectionToggle = new EventEmitter<string>();
  @Output() toggleExpand = new EventEmitter<string>();
  @Output() taskMenuClick = new EventEmitter<TaskListItem>();

  protected isFilledState(group: string): boolean {
    return group === 'started' || group === 'completed';
  }

  protected typeIcon(t: TaskType): string { return TYPE_CONFIG[t]?.icon ?? 'pi pi-circle'; }
  protected typeColor(t: TaskType): string { return TYPE_CONFIG[t]?.color ?? '#9CA3AF'; }
  protected priorityIcon(p: TaskPriority): string { return PRIORITY_CONFIG[p]?.icon ?? 'pi pi-circle'; }
  protected priorityColor(p: TaskPriority): string { return PRIORITY_CONFIG[p]?.color ?? '#D1D5DB'; }

  protected isOverdue(d: string | null): boolean { return !!d && new Date(d) < new Date(); }
  protected formatDate(d: string): string {
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
  protected avatarBg(n: string): string { return AVATAR_PALETTE[n.charCodeAt(0) % AVATAR_PALETTE.length][0]; }
  protected avatarFg(n: string): string { return AVATAR_PALETTE[n.charCodeAt(0) % AVATAR_PALETTE.length][1]; }

  protected isScoped(name: string): boolean { return name.includes('::'); }
  protected getScope(name: string): string { return name.split('::')[0].trim(); }
  protected getValue(name: string): string { return name.split('::').slice(1).join('::').trim(); }

  protected getScopeColor(name: string, fallbackColor: string): string {
    if (!this.isScoped(name)) return fallbackColor;
    const scope = this.getScope(name).toLowerCase();
    const allLabels = this.taskStore.labels();
    const match = allLabels.find(l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope);
    return match ? match.color : fallbackColor;
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

  protected hiddenLabelsTooltip(labels: Label[], maxLabels: number): string {
    return labels.slice(maxLabels).map(l => l.name).join(', ');
  }

  protected hiddenModulesTooltip(modules: { name: string }[], maxModules: number): string {
    return modules.slice(maxModules).map(m => m.name).join(', ');
  }
}

