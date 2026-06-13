import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal,
  computed,
  ElementRef,
  inject,
} from '@angular/core';
import { Tooltip } from 'primeng/tooltip';
import { StateDotComponent } from '../../../../../shared/components/state-dot/state-dot.component';
import { IconDisplayComponent } from '../../../../../shared/components/icon-display/icon-display.component';
import type { SubItemTreeNode, TaskType } from '@mpm/shared-types';
import { ProjectStore } from '../../../../../projects/state/project.store';
import { TaskTypeConfigService } from '../../../../../shared/services/task-type-config.service';

interface FlatNode {
  node: SubItemTreeNode;
  depth: number;
  parentId: string | null;
}

type DropTarget =
  | { type: 'before'; nodeId: string }
  | { type: 'child'; nodeId: string }
  | { type: 'end' };

const MAX_DEPTH = 5;
const INDENT_PX = 20;

@Component({
  standalone: true,
  selector: 'app-sub-item-tree',
  imports: [Tooltip, StateDotComponent, IconDisplayComponent],
  template: `
    <div class="sub-item-tree relative select-none">

      <!-- Expand/Collapse All Toolbar -->
      <div class="flex items-center justify-end gap-1 mb-2.5 text-[11px] border-b border-gray-100 dark:border-surface-800 pb-1.5">
        <button
          type="button"
          class="text-gray-400 hover:text-indigo-600 dark:text-surface-500 dark:hover:text-indigo-400 font-semibold cursor-pointer flex items-center gap-1 bg-transparent border-none py-0.5 px-1.5 rounded transition select-none"
          (click)="collapseAll()"
        >
          <i class="pi pi-minus-circle text-[10px]"></i>
          {{ t().collapseAll }}
        </button>
        <span class="text-gray-200 dark:text-surface-800 select-none">|</span>
        <button
          type="button"
          class="text-gray-400 hover:text-indigo-600 dark:text-surface-500 dark:hover:text-indigo-400 font-semibold cursor-pointer flex items-center gap-1 bg-transparent border-none py-0.5 px-1.5 rounded transition select-none"
          (click)="expandAll()"
        >
          <i class="pi pi-plus-circle text-[10px]"></i>
          {{ t().expandAll }}
        </button>
      </div>

      @for (flat of flatNodes(); track flat.node.id) {

        <!-- Drop line BEFORE this row -->
        @if (isDropBefore(flat.node.id)) {
          <div class="flex items-center py-0.5" [style.padding-left.px]="flat.depth * indentPx + 8" style="padding-right: 8px;">
            <div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
            <div class="flex-1 h-0.5 bg-indigo-500 ml-0.5"></div>
          </div>
        }

        <!-- Row — pointerdown here activates drag after DRAG_THRESHOLD movement -->
        <!-- Row — pointerdown here activates drag after DRAG_THRESHOLD movement -->
        <div
          [attr.data-node-id]="flat.node.id"
          class="flex items-center gap-1.5 py-1.5 rounded transition-colors duration-100 group text-sm"
          [class.cursor-grab]="!disabled"
          [class.active:cursor-grabbing]="!disabled"
          [class.cursor-default]="disabled"
          [class.opacity-30]="draggingId() === flat.node.id"
          [class.bg-indigo-50]="isDropChild(flat.node.id)"
          [class.dark:bg-indigo-950]="isDropChild(flat.node.id)"
          [style.padding-left.px]="flat.depth * indentPx + 8"
          style="padding-right: 8px;"
          (pointerdown)="onRowPointerDown(flat.node, $event)"
        >
          <!-- Expand/Collapse toggle -->
          @if (flat.node.children && flat.node.children.length > 0) {
            <button
              class="w-5 h-5 flex items-center justify-center rounded
                     hover:bg-gray-200 dark:hover:bg-surface-700 flex-shrink-0 cursor-pointer"
              [attr.aria-label]="isExpanded(flat.node.id) ? t().collapse : t().expand"
              (pointerdown)="$event.stopPropagation()"
              (click)="toggleExpand(flat.node.id)"
            >
              <i
                class="pi pi-chevron-right text-[10px] text-gray-500 dark:text-surface-400
                       transition-transform duration-150"
                [class.rotate-90]="isExpanded(flat.node.id)"
              ></i>
            </button>
          } @else {
            <span class="w-5 flex-shrink-0"></span>
          }

          <!-- Type icon -->
          <app-icon-display
            [icon]="typeIcon(flat.node.type)"
            [style.color]="typeColor(flat.node.type)"
            class="flex-shrink-0 text-[11px]"
            [pTooltip]="flat.node.type"
            tooltipPosition="top"
          ></app-icon-display>

          <!-- Task ID -->
          <span class="font-mono text-xs text-gray-400 dark:text-surface-500 flex-shrink-0">
            {{ flat.node.taskId }}
          </span>

          <!-- Title -->
          <span
            class="flex-1 text-gray-800 dark:text-surface-100 truncate min-w-0"
            [pTooltip]="flat.node.title"
            tooltipPosition="top"
            [tooltipOptions]="{ showDelay: 500 }"
          >
            {{ flat.node.title }}
          </span>

          <!-- Action icons — visible on hover -->
          <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">

            <!-- Assignee -->
            @if (flat.node.assignees && flat.node.assignees.length > 0) {
              <span
                class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white flex-shrink-0"
                style="background-color: #6366F1;"
                [pTooltip]="flat.node.assignees[0].displayName"
                tooltipPosition="top"
              >
                {{ getInitial(flat.node.assignees[0].displayName) }}
              </span>
            } @else {
              <i
                class="pi pi-user text-[11px] text-gray-300 dark:text-surface-600"
                [pTooltip]="t().unassigned"
                tooltipPosition="top"
              ></i>
            }

            <!-- Priority -->
            <i
              class="text-[11px]"
              [class]="getPriorityIconClass(flat.node.priority)"
              [pTooltip]="getPriorityLabel(flat.node.priority)"
              tooltipPosition="top"
            ></i>

            <!-- Due date -->
            @if (flat.node.dueDate) {
              <span
                class="text-[10px] text-gray-400 dark:text-surface-500"
                [pTooltip]="flat.node.dueDate"
                tooltipPosition="top"
              >
                <i class="pi pi-calendar text-[10px]"></i>
              </span>
            }

            <!-- View icon (right side) — opens task detail -->
            <button
              class="w-5 h-5 flex items-center justify-center rounded
                     hover:bg-gray-200 dark:hover:bg-surface-700 flex-shrink-0 cursor-pointer"
              [pTooltip]="t().viewDetails"
              tooltipPosition="top"
              [attr.aria-label]="t().viewDetails"
              (pointerdown)="$event.stopPropagation()"
              (click)="onViewClick(flat.node, $event)"
            >
              <i class="pi pi-eye text-[11px] text-gray-400 dark:text-surface-500 hover:text-indigo-500"></i>
            </button>

          </div>

          <!-- State icon / dot (always visible on the right) -->
          @if (flat.node.state) {
            <app-state-dot [state]="flat.node.state" [size]="10" class="flex-shrink-0 ml-1.5" />
          } @else {
            <span
              class="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-400 dark:bg-surface-600 ml-1.5"
              [pTooltip]="t().undefinedState"
              tooltipPosition="top"
            ></span>
          }
        </div>

        <!-- Drop line as CHILD (below this row, indented deeper) -->
        @if (isDropChild(flat.node.id)) {
          <div class="flex items-center py-0.5" [style.padding-left.px]="(flat.depth + 1) * indentPx + 8" style="padding-right: 8px;">
            <div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
            <div class="flex-1 h-0.5 bg-indigo-500 ml-0.5"></div>
          </div>
        }

      }

      <!-- Drop line at END of list -->
      @if (isDropEnd()) {
        <div class="flex items-center py-0.5" style="padding-left: 8px; padding-right: 8px;">
          <div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
          <div class="flex-1 h-0.5 bg-indigo-500 ml-0.5"></div>
        </div>
      }

      <!-- Pending-changes bar -->
      @if (hasPendingChanges()) {
        <div class="mt-2 flex items-center gap-2 px-3 py-2
                    bg-amber-50 dark:bg-amber-950/40
                    border border-amber-200 dark:border-amber-700 rounded-lg">
          <i class="pi pi-exclamation-triangle text-amber-500 text-xs flex-shrink-0"></i>
          <span class="text-xs text-amber-700 dark:text-amber-400 flex-1">{{ t().unsavedChanges }}</span>
          <button
            class="text-xs px-2 py-1 rounded text-gray-600 dark:text-surface-400
                   hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors cursor-pointer"
            (click)="onCancelChanges()"
          >{{ t().cancelBtn }}</button>
          <button
            class="text-xs px-2.5 py-1 rounded bg-indigo-500 text-white
                   hover:bg-indigo-600 transition-colors cursor-pointer"
            (click)="onSaveChanges()"
          >{{ t().updateBtn }}</button>
        </div>
      }

    </div>

    <!-- Drag ghost (follows cursor, fixed position) -->
    @if (isDragging() && draggingNode()) {
      <div
        class="fixed z-[9999] pointer-events-none bg-white dark:bg-surface-800
               border border-indigo-300 dark:border-indigo-600 shadow-xl rounded-lg
               px-3 flex items-center gap-2"
        style="height: 34px; min-width: 180px; max-width: 320px; transform: translateY(-50%);"
        [style.left.px]="ghostX()"
        [style.top.px]="ghostY()"
      >
        <!-- Type icon -->
        <app-icon-display
          [icon]="typeIcon(draggingNode()!.type)"
          [style.color]="typeColor(draggingNode()!.type)"
          class="flex-shrink-0 text-[11px]"
        ></app-icon-display>
        <span class="text-xs font-mono text-gray-400">{{ draggingNode()!.taskId }}</span>
        <span class="text-sm text-gray-800 dark:text-surface-100 font-medium truncate">
          {{ draggingNode()!.title }}
        </span>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class SubItemTreeComponent implements OnChanges, OnDestroy {
  constructor(private readonly el: ElementRef<HTMLElement>) {}

  private readonly projectStore = inject(ProjectStore);
  private readonly typeConfigSvc = inject(TaskTypeConfigService);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      collapseAll: 'Collapse all',
      expandAll: 'Expand all',
      collapse: 'Collapse',
      expand: 'Expand',
      unassigned: 'Unassigned',
      viewDetails: 'View details',
      undefinedState: 'Undefined',
      unsavedChanges: 'Unsaved order changes',
      cancelBtn: 'Cancel',
      updateBtn: 'Update',
      prioUrgent: 'Urgent',
      prioHigh: 'High',
      prioMedium: 'Medium',
      prioLow: 'Low',
      prioNone: 'None'
    } : {
      collapseAll: 'Thu gọn hết',
      expandAll: 'Mở rộng hết',
      collapse: 'Thu gọn',
      expand: 'Mở rộng',
      unassigned: 'Chưa gán',
      viewDetails: 'Xem chi tiết',
      undefinedState: 'Không xác định',
      unsavedChanges: 'Có thay đổi thứ tự chưa lưu',
      cancelBtn: 'Hủy',
      updateBtn: 'Cập nhật',
      prioUrgent: 'Khẩn cấp',
      prioHigh: 'Cao',
      prioMedium: 'Trung bình',
      prioLow: 'Thấp',
      prioNone: 'Không'
    };
  });

  @Input() items: SubItemTreeNode[] = [];
  @Input() disabled = false;

  /** Emits the task ID when the view (eye) icon is clicked */
  @Output() itemClicked = new EventEmitter<string>();

  /**
   * Emits when user clicks "Cập nhật".
   * parentOrders: for every parent touched by moves, the final child UUID order — used
   * by the parent component to call reorderTasks and persist sibling position.
   */
  @Output() saveRequested = new EventEmitter<{
    moves: Array<{ taskId: string; newParentId: string | null; oldParentId: string | null }>;
    parentOrders: Array<{ parentId: string | null; childIds: string[] }>;
  }>();

  readonly maxDepth = MAX_DEPTH;
  readonly indentPx = INDENT_PX;

  // ─── Internal state ───────────────────────────────────────────────────────

  private readonly _items = signal<SubItemTreeNode[]>([]);
  private readonly expandedNodes = signal<Set<string>>(new Set());

  /** Moves buffered since last save or cancel (includes old parent for reorder calls) */
  private readonly pendingMoves = signal<Array<{ taskId: string; newParentId: string | null; oldParentId: string | null }>>([]);
  readonly hasPendingChanges = computed(() => this.pendingMoves().length > 0);

  /** Flattened visible nodes (respects expand/collapse state) */
  readonly flatNodes = computed<FlatNode[]>(() => {
    const result: FlatNode[] = [];
    this.buildFlat(this._items(), 0, null, result);
    return result;
  });

  // ─── Drag state ───────────────────────────────────────────────────────────

  readonly isDragging = signal(false);
  readonly draggingId = signal<string | null>(null);
  readonly dropTarget = signal<DropTarget | null>(null);
  readonly ghostX = signal(0);
  readonly ghostY = signal(0);
  readonly draggingNode = computed<SubItemTreeNode | null>(() => {
    const id = this.draggingId();
    return id ? this.findNode(this._items(), id) : null;
  });

  private pendingDrag: { node: SubItemTreeNode; startX: number; startY: number } | null = null;
  private pointerMoveHandler?: (e: PointerEvent) => void;
  private pointerUpHandler?: (e: PointerEvent) => void;
  private readonly DRAG_THRESHOLD = 5;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this._items.set(this.items);
      this.pendingMoves.set([]); // server data is now source of truth
    }
  }

  ngOnDestroy(): void {
    this.cleanupDrag();
  }

  // ─── Expand / Collapse ────────────────────────────────────────────────────

  expandAll(): void {
    const ids = new Set<string>();
    this.collectExpandableIds(this.items, ids);
    this.expandedNodes.set(ids);
  }

  collapseAll(): void {
    this.expandedNodes.set(new Set<string>());
  }

  isExpanded(nodeId: string): boolean {
    return this.expandedNodes().has(nodeId);
  }

  toggleExpand(nodeId: string): void {
    this.expandedNodes.update(set => {
      const next = new Set(set);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  }

  // ─── View icon ────────────────────────────────────────────────────────────

  onViewClick(node: SubItemTreeNode, event: MouseEvent): void {
    event.stopPropagation();
    this.itemClicked.emit(node.taskId);
  }

  // ─── Drag (row-level, threshold-based) ───────────────────────────────────

  /**
   * Called on pointerdown anywhere on the row.
   * Buttons (expand toggle, view icon) stop propagation so they are excluded.
   * Actual drag only activates after the pointer moves DRAG_THRESHOLD pixels —
   * short movements are treated as regular clicks and ignored.
   */
  onRowPointerDown(node: SubItemTreeNode, event: PointerEvent): void {
    if (this.disabled) return;
    // Let button clicks through — they stop propagation on their own pointerdown
    if ((event.target as HTMLElement).closest('button')) return;

    this.pendingDrag = { node, startX: event.clientX, startY: event.clientY };

    this.pointerMoveHandler = (e: PointerEvent) => this.onPointerMove(e);
    this.pointerUpHandler = (e: PointerEvent) => this.onPointerUp(e);
    document.addEventListener('pointermove', this.pointerMoveHandler, { passive: true });
    document.addEventListener('pointerup', this.pointerUpHandler);
  }

  private onPointerMove(event: PointerEvent): void {
    // Phase 1: waiting for threshold
    if (this.pendingDrag && !this.isDragging()) {
      const dx = event.clientX - this.pendingDrag.startX;
      const dy = event.clientY - this.pendingDrag.startY;
      if (Math.sqrt(dx * dx + dy * dy) < this.DRAG_THRESHOLD) return;

      // Threshold crossed → activate drag
      this.isDragging.set(true);
      this.draggingId.set(this.pendingDrag.node.id);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    // Phase 2: drag is active
    if (this.isDragging()) {
      this.ghostX.set(event.clientX + 14);
      this.ghostY.set(event.clientY);
      const id = this.draggingId();
      if (id) {
        this.dropTarget.set(this.computeDropTarget(event.clientY, id));
      }
    }
  }

  private onPointerUp(_event: PointerEvent): void {
    const draggingId = this.draggingId();
    const target = this.dropTarget();
    const wasDragging = this.isDragging();

    this.pendingDrag = null;
    this.cleanupDrag();
    this.isDragging.set(false);
    this.draggingId.set(null);
    this.dropTarget.set(null);

    if (wasDragging && draggingId && target) {
      this.executeDrop(draggingId, target);
    }
  }

  private cleanupDrag(): void {
    if (this.pointerMoveHandler) {
      document.removeEventListener('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = undefined;
    }
    if (this.pointerUpHandler) {
      document.removeEventListener('pointerup', this.pointerUpHandler);
      this.pointerUpHandler = undefined;
    }
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }

  // ─── Drop target computation ──────────────────────────────────────────────

  private computeDropTarget(clientY: number, draggingId: string): DropTarget | null {
    const host = this.el.nativeElement as HTMLElement;
    const rows = Array.from(host.querySelectorAll<HTMLElement>('[data-node-id]'));
    if (rows.length === 0) return null;

    // Below all rows → end
    const lastRect = rows[rows.length - 1].getBoundingClientRect();
    if (clientY > lastRect.bottom) {
      return { type: 'end' };
    }

    // Above all rows → before first valid row
    const firstRect = rows[0].getBoundingClientRect();
    if (clientY < firstRect.top) {
      for (const row of rows) {
        const nId = row.dataset['nodeId']!;
        if (nId !== draggingId && !this.isDescendant(draggingId, nId)) {
          return { type: 'before', nodeId: nId };
        }
      }
      return null;
    }

    // Scan rows to find which one the cursor is over
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rect = row.getBoundingClientRect();
      if (clientY < rect.top || clientY > rect.bottom) continue;

      const nodeId = row.dataset['nodeId']!;

      // Skip the dragging node and its descendants
      if (nodeId === draggingId || this.isDescendant(draggingId, nodeId)) {
        return null;
      }

      const relY = (clientY - rect.top) / rect.height;

      if (relY < 0.3) {
        return { type: 'before', nodeId };
      } else if (relY > 0.7) {
        // Find next valid row (skip dragging node)
        for (let j = i + 1; j < rows.length; j++) {
          const nId = rows[j].dataset['nodeId']!;
          if (nId !== draggingId && !this.isDescendant(draggingId, nId)) {
            return { type: 'before', nodeId: nId };
          }
        }
        return { type: 'end' };
      } else {
        return { type: 'child', nodeId };
      }
    }

    return null;
  }

  // ─── Drop indicator helpers (used in template) ────────────────────────────

  isDropBefore(nodeId: string): boolean {
    const t = this.dropTarget();
    return t?.type === 'before' && (t as { type: 'before'; nodeId: string }).nodeId === nodeId;
  }

  isDropChild(nodeId: string): boolean {
    const t = this.dropTarget();
    return t?.type === 'child' && (t as { type: 'child'; nodeId: string }).nodeId === nodeId;
  }

  isDropEnd(): boolean {
    return this.dropTarget()?.type === 'end';
  }

  // ─── Drop execution (optimistic update + emit event) ─────────────────────

  private executeDrop(draggingId: string, target: DropTarget): void {
    const flat = this.flatNodes();

    // Capture old parent before mutation
    const oldParentId = flat.find(f => f.node.id === draggingId)?.parentId ?? null;

    // Step 1: Remove dragging item from tree
    const [tempItems, removedNode] = this.removeFromTree(this._items(), draggingId);
    if (!removedNode) return;

    // Step 2: Determine new parent and index (using tempItems so indices are correct post-removal)
    let newParentId: string | null;
    let newIndex: number;

    if (target.type === 'before') {
      const targetFlat = flat.find(f => f.node.id === target.nodeId);
      if (!targetFlat) return;
      newParentId = targetFlat.parentId;
      const siblings = this.getSiblingsInTree(tempItems, newParentId);
      newIndex = siblings.findIndex(n => n.id === target.nodeId);
      if (newIndex < 0) newIndex = siblings.length;
    } else if (target.type === 'child') {
      newParentId = target.nodeId;
      const parentNode = this.findNode(tempItems, target.nodeId);
      newIndex = parentNode?.children?.length ?? 0;
    } else {
      // end → append at root level
      newParentId = null;
      newIndex = tempItems.length;
    }

    // Step 3: Insert at new position
    const finalItems = this.insertIntoTree(tempItems, newParentId, newIndex, removedNode);
    this._items.set(finalItems);

    // Auto-expand new parent so the moved item is visible
    if (newParentId) {
      this.expandedNodes.update(set => new Set([...set, newParentId!]));
    }

    // Buffer the move — user must click "Cập nhật" to persist
    this.pendingMoves.update(list => [...list, { taskId: draggingId, newParentId, oldParentId }]);
  }

  // ─── Save / Cancel pending changes ───────────────────────────────────────

  onSaveChanges(): void {
    const pending = this.pendingMoves();
    if (pending.length === 0) return;

    // Collect every parent whose children order may have changed (old + new parent of each move)
    const affectedParents = new Set<string | null>();
    for (const m of pending) {
      affectedParents.add(m.newParentId);
      affectedParents.add(m.oldParentId);
    }

    // Build ordered child-UUID list for each affected parent from the current optimistic tree
    const flat = this.flatNodes();
    const parentOrders = Array.from(affectedParents).map(parentId => ({
      parentId,
      childIds: flat.filter(f => f.parentId === parentId).map(f => f.node.id),
    }));

    this.pendingMoves.set([]);
    this.saveRequested.emit({ moves: pending, parentOrders });
  }

  onCancelChanges(): void {
    this._items.set(this.items); // revert to last known server state
    this.pendingMoves.set([]);
  }

  // ─── Utility (template) ───────────────────────────────────────────────────

  typeIcon(type: TaskType): string {
    return this.typeConfigSvc.getIcon(type, this.projectStore.currentProject()?.taskTypeConfig);
  }

  typeColor(type: TaskType): string {
    return this.typeConfigSvc.getColor(type, this.projectStore.currentProject()?.taskTypeConfig);
  }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || '?';
  }

  getPriorityIconClass(priority: string): string {
    switch (priority) {
      case 'urgent': return 'pi pi-flag text-red-500';
      case 'high':   return 'pi pi-flag text-orange-500';
      case 'medium': return 'pi pi-flag text-yellow-500';
      case 'low':    return 'pi pi-flag text-blue-400';
      default:       return 'pi pi-flag text-gray-300 dark:text-surface-600';
    }
  }

  getPriorityLabel(priority: string): string {
    const tr = this.t();
    switch (priority) {
      case 'urgent': return tr.prioUrgent;
      case 'high':   return tr.prioHigh;
      case 'medium': return tr.prioMedium;
      case 'low':    return tr.prioLow;
      default:       return tr.prioNone;
    }
  }

  // ─── Private tree helpers ─────────────────────────────────────────────────

  private initExpandedState(nodes: SubItemTreeNode[]): void {
    const ids = new Set<string>();
    this.collectExpandableIds(nodes, ids);
    this.expandedNodes.set(ids);
  }

  private collectExpandableIds(nodes: SubItemTreeNode[], ids: Set<string>): void {
    for (const node of nodes) {
      if (node.children?.length > 0) {
        ids.add(node.id);
        this.collectExpandableIds(node.children, ids);
      }
    }
  }

  private buildFlat(nodes: SubItemTreeNode[], depth: number, parentId: string | null, result: FlatNode[]): void {
    for (const node of nodes) {
      result.push({ node, depth, parentId });
      if (node.children?.length > 0 && this.isExpanded(node.id)) {
        this.buildFlat(node.children, depth + 1, node.id, result);
      }
    }
  }

  private findNode(nodes: SubItemTreeNode[], id: string): SubItemTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = this.findNode(node.children ?? [], id);
      if (found) return found;
    }
    return null;
  }

  private isDescendant(ancestorId: string, targetId: string): boolean {
    const ancestor = this.findNode(this._items(), ancestorId);
    if (!ancestor) return false;
    return this.containsNode(ancestor.children ?? [], targetId);
  }

  private containsNode(nodes: SubItemTreeNode[], id: string): boolean {
    return nodes.some(n => n.id === id || this.containsNode(n.children ?? [], id));
  }

  private getSiblingsInTree(items: SubItemTreeNode[], parentId: string | null): SubItemTreeNode[] {
    if (!parentId) return items;
    return this.findNode(items, parentId)?.children ?? [];
  }

  private removeFromTree(nodes: SubItemTreeNode[], id: string): [SubItemTreeNode[], SubItemTreeNode | null] {
    let removed: SubItemTreeNode | null = null;
    const newNodes = nodes.reduce<SubItemTreeNode[]>((acc, node) => {
      if (node.id === id) {
        removed = node;
        return acc;
      }
      const [newChildren, r] = this.removeFromTree(node.children ?? [], id);
      if (r) removed = r;
      return [...acc, { ...node, children: newChildren }];
    }, []);
    return [newNodes, removed];
  }

  private insertIntoTree(
    nodes: SubItemTreeNode[],
    parentId: string | null,
    index: number,
    nodeToInsert: SubItemTreeNode,
  ): SubItemTreeNode[] {
    if (!parentId) {
      const result = [...nodes];
      result.splice(Math.min(index, result.length), 0, nodeToInsert);
      return result;
    }
    return nodes.map(node => {
      if (node.id === parentId) {
        const children = [...(node.children ?? [])];
        children.splice(Math.min(index, children.length), 0, nodeToInsert);
        return { ...node, children };
      }
      return { ...node, children: this.insertIntoTree(node.children ?? [], parentId, index, nodeToInsert) };
    });
  }
}
