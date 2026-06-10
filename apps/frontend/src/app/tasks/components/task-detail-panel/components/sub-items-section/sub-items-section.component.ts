import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  signal,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import type { SubItemTreeNode, CreateSubItemDto, MemberResponse, TaskPriority } from '@mpm/shared-types';
import { SubItemProgressComponent } from '../sub-item-progress/sub-item-progress.component';
import { SubItemTreeComponent } from '../sub-item-tree/sub-item-tree.component';
import { SubItemQuickToolbarComponent } from '../sub-item-quick-toolbar/sub-item-quick-toolbar.component';

/**
 * SubItemsSectionComponent — Container component for Sub-Items section
 *
 * Integrates SubItemProgressComponent, SubItemTreeComponent, and SubItemQuickToolbarComponent.
 * Displays header with "Sub-items" text + count badge + circular progress ring,
 * the tree of sub-items, and inline input for adding new sub-items.
 *
 * Requirements: 4.1, 4.6, 4.8, 4.9, 7.4, 7.5, 7.6
 */
@Component({
  standalone: true,
  selector: 'app-sub-items-section',
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    SubItemProgressComponent,
    SubItemTreeComponent,
    SubItemQuickToolbarComponent,
  ],
  template: `
    <!-- ═══ Section Header ═══ -->
    <div class="flex items-center gap-2 mb-3">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-surface-200">Sub-items</h3>

      <!-- Count badge -->
      <span
        class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
               text-[11px] font-medium rounded-full
               bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-surface-300"
      >
        {{ totalCount }}
      </span>

      <!-- Circular progress ring -->
      @if (totalCount > 0) {
        <app-sub-item-progress
          [done]="doneCount"
          [total]="totalCount"
        />
      }

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Add button (shown when not in adding mode and has items) -->
      @if (!isAddingMode() && items.length > 0) {
        <button
          pButton
          class="p-button-text p-button-sm"
          icon="pi pi-plus"
          label="Thêm sub-item"
          pTooltip="Thêm sub-item mới"
          tooltipPosition="top"
          (click)="enterAddMode()"
          aria-label="Thêm sub-item"
        ></button>
      }
    </div>

    <!-- ═══ Sub-Items Tree ═══ -->
    @if (items.length > 0) {
      <app-sub-item-tree
        [items]="items"
        (itemClicked)="subItemClicked.emit($event)"
        (reordered)="reordered.emit($event)"
      />
    }

    <!-- ═══ Empty State ═══ -->
    @if (items.length === 0 && !isAddingMode()) {
      <div class="flex flex-col items-center justify-center py-8 text-center">
        <i class="pi pi-sitemap text-3xl text-gray-300 dark:text-surface-600 mb-3"></i>
        <p class="text-sm text-gray-500 dark:text-surface-400 mb-3">
          Chưa có sub-item nào. Chia nhỏ công việc để dễ theo dõi tiến độ.
        </p>
        <button
          pButton
          class="p-button-outlined p-button-sm"
          icon="pi pi-plus"
          label="Thêm sub-item"
          (click)="enterAddMode()"
          aria-label="Thêm sub-item"
        ></button>
      </div>
    }

    <!-- ═══ Inline Add Form ═══ -->
    @if (isAddingMode()) {
      <div class="mt-2 border border-surface-200 dark:border-surface-700 rounded-lg p-2.5">
        <!-- Title input -->
        <input
          #titleInput
          pInputText
          type="text"
          class="w-full text-sm"
          style="height: 32px; padding: 0 10px; border-radius: 6px"
          placeholder="Nhập tiêu đề sub-item..."
          [maxlength]="255"
          [(ngModel)]="newTitle"
          (keydown.enter)="onSubmit()"
          (keydown.escape)="onDismiss()"
          aria-label="Tiêu đề sub-item mới"
        />

        <!-- Quick toolbar -->
        <app-sub-item-quick-toolbar
          #toolbar
          [members]="members"
          (assigneeSelected)="onAssigneeSelected($event)"
          (prioritySelected)="onPrioritySelected($event)"
          (dueDateSelected)="onDueDateSelected($event)"
        />

        <!-- Action buttons -->
        <div class="flex items-center gap-2 mt-1.5">
          <button
            pButton
            class="p-button-sm"
            icon="pi pi-check"
            label="Tạo"
            [disabled]="!newTitle.trim()"
            (click)="onSubmit()"
            aria-label="Tạo sub-item"
          ></button>
          <button
            pButton
            class="p-button-text p-button-sm p-button-secondary"
            label="Hủy"
            (click)="onDismiss()"
            aria-label="Hủy thêm sub-item"
          ></button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class SubItemsSectionComponent {
  /** Hierarchical tree data */
  @Input() items: SubItemTreeNode[] = [];

  /** Total number of direct children */
  @Input() totalCount = 0;

  /** Number of items in "done" state */
  @Input() doneCount = 0;

  /** Project members for assignee selection */
  @Input() members: MemberResponse[] = [];

  /** Current project ID */
  @Input() projectId = '';

  /** Current task ID (parent for new sub-items) */
  @Input() taskId = '';

  /** Emits CreateSubItemDto when a new sub-item is submitted */
  @Output() createSubItem = new EventEmitter<CreateSubItemDto>();

  /** Emits task ID when a sub-item row is clicked */
  @Output() subItemClicked = new EventEmitter<string>();

  /** Emits after drag-drop reorder */
  @Output() reordered = new EventEmitter<{ taskId: string; newIndex: number }>();

  @ViewChild('toolbar') toolbarRef?: SubItemQuickToolbarComponent;
  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLInputElement>;

  // ─── Internal State ──────────────────────────────────────────────────────

  /** Whether the inline add form is visible */
  readonly isAddingMode = signal(false);

  /** New sub-item title bound to input */
  protected newTitle = '';

  /** Tracked toolbar selections */
  private selectedAssigneeId: string | null = null;
  private selectedPriority: TaskPriority = 'none';
  private selectedDueDate: string | null = null;

  // ─── Actions ─────────────────────────────────────────────────────────────

  /** Show the inline add form and focus input */
  enterAddMode(): void {
    this.isAddingMode.set(true);
    // Cho Angular render xong rồi focus
    setTimeout(() => this.titleInputRef?.nativeElement.focus(), 0);
  }

  /** Dismiss the inline add form and reset state */
  onDismiss(): void {
    this.isAddingMode.set(false);
    this.resetForm();
  }

  /**
   * Submit the new sub-item creation.
   * Requirement 4.9: Empty/whitespace title → dismiss without creating
   * Requirement 7.4: Submit creates with all toolbar properties in single call
   * Requirement 7.5: Empty title → no creation request, keep toolbar state
   */
  onSubmit(): void {
    const trimmedTitle = this.newTitle.trim();

    // Requirement 7.5: Empty title → no creation request
    if (!trimmedTitle) {
      return;
    }

    // Build CreateSubItemDto with toolbar selections
    const dto: CreateSubItemDto = {
      title: trimmedTitle,
      parentId: this.taskId,
    };

    if (this.selectedAssigneeId) {
      dto.assigneeIds = [this.selectedAssigneeId];
    }

    if (this.selectedPriority !== 'none') {
      dto.priority = this.selectedPriority;
    }

    if (this.selectedDueDate) {
      dto.dueDate = this.selectedDueDate;
    }

    // Emit creation event — parent handles API call
    this.createSubItem.emit(dto);

    // Requirement 7.4: Clear input and reset toolbar after submit
    this.resetForm();
  }

  /** Handle assignee selection from toolbar */
  onAssigneeSelected(userId: string | null): void {
    this.selectedAssigneeId = userId;
  }

  /** Handle priority selection from toolbar */
  onPrioritySelected(priority: TaskPriority): void {
    this.selectedPriority = priority;
  }

  /** Handle due date selection from toolbar */
  onDueDateSelected(dueDate: string | null): void {
    this.selectedDueDate = dueDate;
  }

  /**
   * Preserve form state for retry on API failure (Requirement 7.6).
   * Called by parent when creation fails to keep title and toolbar selections.
   */
  preserveStateForRetry(title: string): void {
    this.newTitle = title;
    // Toolbar selections remain intact since we don't reset on failure
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /** Reset form state: clear title, reset toolbar */
  private resetForm(): void {
    this.newTitle = '';
    this.selectedAssigneeId = null;
    this.selectedPriority = 'none';
    this.selectedDueDate = null;
    this.toolbarRef?.reset();
  }
}
