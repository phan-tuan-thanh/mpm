import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Tooltip } from 'primeng/tooltip';
import type { SubItemTreeNode } from '@mpm/shared-types';

/** Maximum tree depth supported */
const MAX_DEPTH = 5;

/** Indentation in pixels per nesting level */
const INDENT_PX = 20;

/**
 * SubItemTreeComponent — Hierarchical tree rendering with drag-drop reordering.
 *
 * Renders sub-items as an indented tree (max depth 5), each row showing:
 * - Expand/collapse toggle (if node has children)
 * - State colored dot
 * - Task ID (monospace)
 * - Title (truncated with CSS ellipsis)
 * - Inline action icons (assignee, priority, due date)
 *
 * Supports drag-and-drop reordering within the same hierarchical level
 * using Angular CDK DragDrop.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.7
 */
@Component({
  standalone: true,
  selector: 'app-sub-item-tree',
  imports: [NgTemplateOutlet, CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, CdkDropList, Tooltip],
  template: `
    <div class="sub-item-tree">
      <ng-container
        *ngTemplateOutlet="treeLevel; context: { $implicit: items, depth: 0 }"
      ></ng-container>
    </div>

    <!-- Recursive tree level template -->
    <ng-template #treeLevel let-nodes let-depth="depth">
      @if (depth < maxDepth) {
        <div
          cdkDropList
          [cdkDropListData]="nodes"
          (cdkDropListDropped)="onDrop($event, depth)"
          class="tree-level"
        >
          @for (node of nodes; track node.id) {
            <div cdkDrag [cdkDragData]="node">
              <!-- Tree row -->
              <div
                class="flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer
                       hover:bg-gray-50 dark:hover:bg-surface-800 transition-colors duration-100
                       group text-sm"
                [style.padding-left.px]="depth * indentPx + 8"
                (click)="onItemClick(node)"
              >
                <!-- Expand/Collapse toggle -->
                @if (node.children && node.children.length > 0) {
                  <button
                    class="w-5 h-5 flex items-center justify-center rounded
                           hover:bg-gray-200 dark:hover:bg-surface-700 flex-shrink-0"
                    [attr.aria-label]="isExpanded(node.id) ? 'Thu gọn' : 'Mở rộng'"
                    (click)="toggleExpand(node.id); $event.stopPropagation()"
                  >
                    <i
                      class="pi pi-chevron-right text-[10px] text-gray-500 dark:text-surface-400
                             transition-transform duration-150"
                      [class.rotate-90]="isExpanded(node.id)"
                    ></i>
                  </button>
                } @else {
                  <!-- Spacer for alignment when no toggle -->
                  <span class="w-5 flex-shrink-0"></span>
                }

                <!-- State colored dot -->
                <span
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  [style.background-color]="node.state?.color ?? '#9CA3AF'"
                  [pTooltip]="node.state?.name ?? 'Không xác định'"
                  tooltipPosition="top"
                ></span>

                <!-- Task ID (monospace) -->
                <span class="font-mono text-xs text-gray-400 dark:text-surface-500 flex-shrink-0">
                  {{ node.taskId }}
                </span>

                <!-- Title (truncated) -->
                <span
                  class="flex-1 text-gray-800 dark:text-surface-100 truncate min-w-0"
                  [pTooltip]="node.title"
                  tooltipPosition="top"
                  [tooltipOptions]="{ showDelay: 500 }"
                >
                  {{ node.title }}
                </span>

                <!-- Action icons — visible on hover -->
                <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <!-- Assignee -->
                  @if (node.assignees && node.assignees.length > 0) {
                    <span
                      class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white flex-shrink-0"
                      [style.background-color]="'#6366F1'"
                      [pTooltip]="node.assignees[0].displayName"
                      tooltipPosition="top"
                    >
                      {{ getInitial(node.assignees[0].displayName) }}
                    </span>
                  } @else {
                    <i
                      class="pi pi-user text-[11px] text-gray-300 dark:text-surface-600"
                      pTooltip="Chưa gán"
                      tooltipPosition="top"
                    ></i>
                  }

                  <!-- Priority icon -->
                  <i
                    class="text-[11px]"
                    [class]="getPriorityIconClass(node.priority)"
                    [pTooltip]="getPriorityLabel(node.priority)"
                    tooltipPosition="top"
                  ></i>

                  <!-- Due date -->
                  @if (node.dueDate) {
                    <span
                      class="text-[10px] text-gray-400 dark:text-surface-500"
                      [pTooltip]="node.dueDate"
                      tooltipPosition="top"
                    >
                      <i class="pi pi-calendar text-[10px]"></i>
                    </span>
                  }
                </div>

                <!-- Drag handle (visible on hover) -->
                <i
                  cdkDragHandle
                  class="pi pi-bars text-[10px] text-gray-300 dark:text-surface-600
                         opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing
                         flex-shrink-0 ml-1"
                  pTooltip="Kéo để sắp xếp"
                  tooltipPosition="top"
                ></i>
              </div>

              <!-- Drag preview -->
              <div
                *cdkDragPreview
                class="flex items-center gap-2 bg-white dark:bg-surface-800 border border-surface-200
                       dark:border-surface-700 shadow-xl rounded-lg px-3 pointer-events-none select-none"
                style="min-width: 200px; max-width: 350px; height: 34px;"
              >
                <span
                  class="w-2 h-2 rounded-full"
                  [style.background-color]="node.state?.color ?? '#9CA3AF'"
                ></span>
                <span class="text-xs font-mono text-gray-400">{{ node.taskId }}</span>
                <span class="text-sm text-gray-800 dark:text-surface-100 font-medium truncate flex-1">
                  {{ node.title }}
                </span>
              </div>

              <!-- Drop placeholder -->
              <div *cdkDragPlaceholder class="border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded h-8 my-0.5"></div>

              <!-- Children (recursive) -->
              @if (node.children && node.children.length > 0 && isExpanded(node.id)) {
                <ng-container
                  *ngTemplateOutlet="treeLevel; context: { $implicit: node.children, depth: depth + 1 }"
                ></ng-container>
              }
            </div>
          }
        </div>
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
    }
    .cdk-drag-animating {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
})
export class SubItemTreeComponent {
  /** Tree data — hierarchical sub-item nodes */
  @Input() items: SubItemTreeNode[] = [];

  /** Emits the task ID when a row is clicked */
  @Output() itemClicked = new EventEmitter<string>();

  /** Emits after drag-drop reorder: taskId and new index within the same level */
  @Output() reordered = new EventEmitter<{ taskId: string; newIndex: number }>();

  /** Maximum depth for tree rendering */
  readonly maxDepth = MAX_DEPTH;

  /** Indentation pixels per level */
  readonly indentPx = INDENT_PX;

  /** Track expanded state per node ID — all expanded by default */
  private readonly expandedNodes = signal<Set<string>>(new Set());

  /** Whether all nodes have been initialized as expanded */
  private initialized = false;

  /** Check if a node is expanded. Default: expanded (true) unless explicitly collapsed. */
  isExpanded(nodeId: string): boolean {
    // Lazy init: all nodes expanded by default
    if (!this.initialized && this.items.length > 0) {
      this.initExpandedState(this.items);
      this.initialized = true;
    }
    return this.expandedNodes().has(nodeId);
  }

  /** Toggle expand/collapse for a node */
  toggleExpand(nodeId: string): void {
    this.expandedNodes.update((set) => {
      const next = new Set(set);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  /** Handle row click — emit task ID */
  onItemClick(node: SubItemTreeNode): void {
    this.itemClicked.emit(node.taskId);
  }

  /** Handle drag-drop within the same level */
  onDrop(event: CdkDragDrop<SubItemTreeNode[]>, depth: number): void {
    if (event.previousIndex === event.currentIndex) return;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      const movedNode = event.container.data[event.currentIndex];
      this.reordered.emit({ taskId: movedNode.id, newIndex: event.currentIndex });
    }
  }

  /** Get first letter of display name for avatar fallback */
  getInitial(name: string): string {
    const ch = name?.charAt(0)?.toUpperCase();
    return ch || '?';
  }

  /** Get priority icon class based on priority level */
  getPriorityIconClass(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'pi pi-exclamation-circle text-red-500';
      case 'high':
        return 'pi pi-arrow-up text-orange-500';
      case 'medium':
        return 'pi pi-minus text-yellow-500';
      case 'low':
        return 'pi pi-arrow-down text-blue-400';
      default:
        return 'pi pi-minus text-gray-300 dark:text-surface-600';
    }
  }

  /** Get priority human label */
  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return 'Không';
    }
  }

  /** Recursively initialize all nodes as expanded */
  private initExpandedState(nodes: SubItemTreeNode[]): void {
    const ids = new Set<string>();
    this.collectAllNodeIds(nodes, ids);
    this.expandedNodes.set(ids);
  }

  /** Recursively collect all node IDs that have children */
  private collectAllNodeIds(nodes: SubItemTreeNode[], ids: Set<string>): void {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        ids.add(node.id);
        this.collectAllNodeIds(node.children, ids);
      }
    }
  }
}
