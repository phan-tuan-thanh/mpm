import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { LayoutService } from '../../../../layout/services/layout.service';
import { TaskStore } from '../../../state/task.store';
import type { TaskListItem, DisplayProperties, Label } from '@mpm/shared-types';

const PRIORITY_CONFIG: Record<string, { icon: string; color: string }> = {
  urgent: { icon: 'pi pi-angle-double-up', color: '#EF4444' },
  high:   { icon: 'pi pi-angle-up',        color: '#F97316' },
  medium: { icon: 'pi pi-minus',           color: '#EAB308' },
  low:    { icon: 'pi pi-angle-down',      color: '#3B82F6' },
  none:   { icon: 'pi pi-circle',          color: '#D1D5DB' },
};

@Component({
  standalone: true,
  selector: 'app-board-card',
  imports: [CommonModule, TooltipModule],
  template: `
    <div
      class="bg-white dark:bg-surface-800 border rounded-lg p-3 cursor-pointer select-none transition-all duration-150 ease-in-out"
      [class.border-gray-200]="!hovered"
      [class.dark:border-surface-700]="!hovered"
      [class.border-indigo-400]="hovered"
      [class.shadow-md]="hovered"
      (click)="cardClick.emit(task)"
      (mouseenter)="hovered = true"
      (mouseleave)="hovered = false">

      <!-- identifier + type icon -->
      <div class="flex items-center gap-1 mb-1">
        <i class="text-[10px]" [class]="typeIcon" [style.color]="typeColor"></i>
        <span class="text-[10px] font-mono text-gray-400">{{ task.taskId }}</span>
      </div>

      <!-- title -->
      <div class="text-sm text-gray-800 dark:text-surface-100 font-medium line-clamp-2 mb-2 leading-snug">
        {{ task.title }}
      </div>

      <!-- labels -->
      @if (displayProps.showLabels && task.labels?.length) {
        <div class="mb-2">
          @if (displayProps.labelMode === 'dot') {
            <div class="flex items-center -space-x-1">
              @for (label of task.labels.slice(0, displayProps.maxLabels); track label.id) {
                <span class="w-2.5 h-2.5 rounded-full border border-white dark:border-surface-800 flex-shrink-0"
                      [style.background]="ls.getAdaptiveColor(label.color)"
                      [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                </span>
              }
              @if (task.labels.length > displayProps.maxLabels) {
                <span class="text-[10px] text-gray-500 font-medium pl-1.5">
                  +{{ task.labels.length - displayProps.maxLabels }}
                </span>
              }
            </div>
          } @else {
            <div class="flex flex-wrap gap-1">
              @for (label of task.labels.slice(0, displayProps.maxLabels); track label.id) {
                @if (isScoped(label.name)) {
                  <span class="inline-flex items-center text-[10px] rounded-full overflow-hidden border border-gray-300 dark:border-surface-600 font-medium"
                        [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                    <span class="px-1.5 py-0.5"
                          [style.background]="ls.getAdaptiveColor(getScopeColor(label))"
                          [style.color]="ls.getTextColor(ls.getAdaptiveColor(getScopeColor(label)))">
                      {{ getScope(label.name) }}
                    </span>
                    <span class="px-1.5 py-0.5"
                          [style.background]="ls.getAdaptiveColor(label.color) + '28'"
                          [style.color]="ls.getAdaptiveColor(label.color)">
                      {{ getValue(label.name) }}
                    </span>
                  </span>
                } @else {
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-medium border border-gray-300 dark:border-surface-600"
                        [style.background]="ls.getAdaptiveColor(label.color) + '22'"
                        [style.color]="ls.getAdaptiveColor(label.color)"
                        [pTooltip]="label.description ? label.name + ': ' + label.description : label.name">
                    {{ label.name }}
                  </span>
                }
              }
              @if (task.labels.length > displayProps.maxLabels) {
                <span class="text-[10px] text-gray-500 font-medium px-1 py-0.5 rounded-full bg-gray-100 border border-gray-300 cursor-default"
                      [pTooltip]="hiddenLabelsTooltip(task.labels)">
                  +{{ task.labels.length - displayProps.maxLabels }}
                </span>
              }
            </div>
          }
        </div>
      }

      <!-- modules -->
      @if (displayProps.showModules && task.modules?.length) {
        <div class="flex flex-wrap gap-1 mb-1.5">
          @for (mod of task.modules.slice(0, displayProps.maxModules); track mod.id) {
            <span class="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-px rounded bg-gray-50 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 text-gray-600 dark:text-surface-300 cursor-default"
                  [pTooltip]="(mod.scope === 'workspace' ? 'Workspace module: ' : 'Project module: ') + mod.name">
              <i [class]="mod.scope === 'workspace' ? 'pi pi-globe' : 'pi pi-folder'" style="font-size:9px"></i>
              <span class="truncate max-w-[72px]">{{ mod.name }}</span>
            </span>
          }
          @if (task.modules.length > displayProps.maxModules) {
            <span class="inline-flex items-center text-[10px] text-gray-500 dark:text-surface-400 font-medium px-1 py-px rounded-full bg-gray-100 dark:bg-surface-800 border border-gray-200 dark:border-surface-700 cursor-default"
                  [pTooltip]="hiddenModulesTooltip(task.modules)">
              +{{ task.modules.length - displayProps.maxModules }}
            </span>
          }
        </div>
      }

      <!-- priority + assignees + due date + sub-item count -->
      <div class="flex items-center gap-2 flex-wrap">
        @if (displayProps.showPriority && task.priority !== 'none') {
          <i class="text-[11px]" [class]="priorityIcon" [style.color]="priorityColor" [pTooltip]="task.priority"></i>
        }
        @if (displayProps.showAssignee && task.assignees?.length) {
          <div class="flex items-center -space-x-1">
            @for (a of task.assignees.slice(0, 2); track a.userId) {
              @if (a.avatarUrl) {
                <img [src]="a.avatarUrl" [alt]="a.displayName"
                     class="w-4 h-4 rounded-full border border-white dark:border-surface-800"
                     [pTooltip]="a.displayName" />
              } @else {
                <span class="w-4 h-4 rounded-full bg-indigo-500 text-white text-[8px] flex items-center justify-center border border-white dark:border-surface-800"
                      [pTooltip]="a.displayName">
                  {{ a.displayName.charAt(0).toUpperCase() }}
                </span>
              }
            }
          </div>
        }
        @if (displayProps.showDueDate && task.dueDate) {
          <span class="text-[10px] flex items-center gap-0.5"
                [class.text-red-500]="isOverdue(task.dueDate)"
                [class.text-gray-400]="!isOverdue(task.dueDate)"
                pTooltip="Due date">
            <i class="pi pi-calendar" style="font-size: 9px"></i>
            {{ formatDate(task.dueDate) }}
          </span>
        }
        <div class="flex-1"></div>
        @if (displayProps.showSubItemCount && task.subItemCount > 0) {
          <span class="text-[10px] text-gray-400 flex items-center gap-0.5">
            <i class="pi pi-sitemap" style="font-size: 9px"></i>
            {{ task.subItemCount }}
          </span>
        }
      </div>

      <!-- parent ref -->
      @if (displayProps.showParent && task.parent) {
        <div class="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-surface-700 flex items-center gap-1 text-[10px] text-gray-400 truncate">
          <i class="pi pi-arrow-up" style="font-size: 9px"></i>
          <span class="truncate">{{ task.parent.taskId }} · {{ task.parent.title }}</span>
        </div>
      }
    </div>
  `,
})
export class BoardCardComponent {
  protected readonly ls = inject(LayoutService);
  private readonly taskStore = inject(TaskStore);

  @Input({ required: true }) task!: TaskListItem;
  @Input() displayProps!: DisplayProperties;
  @Output() cardClick = new EventEmitter<TaskListItem>();

  protected hovered = false;

  protected get typeIcon(): string {
    const map: Record<string, string> = { epic: 'pi pi-bolt', story: 'pi pi-book', task: 'pi pi-check-circle', subtask: 'pi pi-minus-circle' };
    return map[this.task.type] ?? 'pi pi-circle';
  }
  protected get typeColor(): string {
    const map: Record<string, string> = { epic: '#8B5CF6', story: '#3B82F6', task: '#10B981', subtask: '#6B7280' };
    return map[this.task.type] ?? '#9CA3AF';
  }
  protected get priorityIcon(): string { return PRIORITY_CONFIG[this.task.priority]?.icon ?? 'pi pi-circle'; }
  protected get priorityColor(): string { return PRIORITY_CONFIG[this.task.priority]?.color ?? '#D1D5DB'; }

  protected isScoped(name: string): boolean { return name.includes('::'); }
  protected getScope(name: string): string { return name.split('::')[0].trim(); }
  protected getValue(name: string): string { return name.split('::').slice(1).join('::').trim(); }

  protected getScopeColor(label: Label): string {
    if (!this.isScoped(label.name)) return label.color;
    const scope = this.getScope(label.name).toLowerCase();
    const match = this.taskStore.labels().find(
      l => l.name.includes('::') && l.name.split('::')[0].trim().toLowerCase() === scope
    );
    return match ? match.color : label.color;
  }

  protected hiddenLabelsTooltip(labels: Label[]): string {
    return labels.slice(this.displayProps.maxLabels).map(l => l.name).join(', ');
  }

  protected hiddenModulesTooltip(modules: { name: string }[]): string {
    return modules.slice(this.displayProps.maxModules).map(m => m.name).join(', ');
  }

  protected isOverdue(d: string | null): boolean { return !!d && new Date(d) < new Date(); }

  protected formatDate(d: string): string {
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
}
