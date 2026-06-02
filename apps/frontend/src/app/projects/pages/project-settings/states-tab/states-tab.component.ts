import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FluidModule } from 'primeng/fluid';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { StateGroup, ProjectState } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-states-tab',
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    FluidModule,
    FormsModule,
    DragDropModule,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center pb-2 border-b border-gray-150">
        <div>
          <h2 class="text-lg font-bold text-gray-900">Quy trình làm việc (States)</h2>
          <p class="text-xs text-gray-500">Cấu hình trạng thái công việc cho dự án của bạn (tối đa 20 trạng thái).</p>
        </div>
      </div>

      <!-- Main Groups Layout -->
      <div class="grid grid-cols-1 gap-6">
        @for (group of groupOrder; track group) {
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div class="flex justify-between items-center pb-2 border-b border-gray-50">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" [ngClass]="getGroupColor(group)"></span>
                <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider">{{ getGroupName(group) }}</h3>
                <span class="text-xs text-gray-400 font-semibold">({{ getStatesCount(group) }})</span>
              </div>
              @if (!isReadOnly() && getStatesCount(group) < 20) {
                <button
                  pButton
                  type="button"
                  icon="pi pi-plus"
                  label="Thêm trạng thái"
                  class="p-button-text p-button-sm font-semibold text-xs py-1"
                  (click)="showAddForm[group] = true"
                ></button>
              }
            </div>

            <!-- Drag and Drop List -->
            <div
              cdkDropList
              [cdkDropListData]="statesForGroup(group)"
              (cdkDropListDropped)="onDrop($event, group)"
              class="space-y-2 min-h-[40px]"
            >
              @for (state of statesForGroup(group); track state.id) {
                <div
                  cdkDrag
                  [cdkDragDisabled]="isReadOnly()"
                  class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-white shadow-sm transition group"
                >
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <!-- Drag handle -->
                    @if (!isReadOnly()) {
                      <div cdkDragHandle class="cursor-grab text-gray-400 hover:text-gray-600 px-1">
                        <i class="pi pi-bars text-sm"></i>
                      </div>
                    }

                    <!-- Color Picker -->
                    <div class="relative flex-shrink-0">
                      <input
                        type="color"
                        [ngModel]="state.color"
                        (change)="onUpdateColor(state, $any($event.target).value)"
                        [disabled]="isReadOnly()"
                        class="w-6 h-6 rounded-full border-none cursor-pointer p-0 bg-transparent flex-shrink-0"
                      />
                    </div>

                    <!-- Inline Name Input -->
                    <input
                      type="text"
                      [ngModel]="state.name"
                      (focus)="onFocusName(state)"
                      (blur)="onUpdateName(state, $any($event.target).value)"
                      (keydown.enter)="onUpdateName(state, $any($event.target).value); $any($event.target).blur()"
                      [disabled]="isReadOnly()"
                      class="bg-transparent border-none focus:bg-gray-50 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-0.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition w-full max-w-xs"
                    />

                    <!-- Default indicator -->
                    @if (state.isDefault) {
                      <span class="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        <i class="pi pi-star-fill text-[9px]"></i> Mặc định
                      </span>
                    } @else if (!isReadOnly()) {
                      <button
                        pButton
                        type="button"
                        icon="pi pi-star"
                        class="p-button-text p-button-sm text-gray-300 hover:text-amber-500 p-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition"
                        tooltipPosition="top"
                        (click)="onSetDefault(state)"
                      ></button>
                    }
                  </div>

                  <!-- Actions -->
                  @if (!isReadOnly() && !state.isDefault && totalStatesCount() > 2) {
                    <button
                      pButton
                      type="button"
                      icon="pi pi-trash"
                      severity="danger"
                      [outlined]="true"
                      class="p-0 h-8 w-8 text-xs opacity-0 group-hover:opacity-100 transition"
                      (click)="onDeleteState(state)"
                    ></button>
                  }
                </div>
              }

              <!-- Add State Inline Form -->
              @if (showAddForm[group]) {
                <div class="flex items-center gap-3 p-3 rounded-lg border border-indigo-100 bg-indigo-50/10 shadow-sm transition">
                  <input
                    type="color"
                    [(ngModel)]="newColors[group]"
                    class="w-6 h-6 rounded-full border-none cursor-pointer p-0 bg-transparent flex-shrink-0"
                  />
                  <input
                    type="text"
                    pInputText
                    [(ngModel)]="newNames[group]"
                    placeholder="Tên trạng thái..."
                    class="p-inputtext-sm flex-1 max-w-xs text-sm"
                    (keydown.enter)="onCreateState(group)"
                  />
                  <div class="flex items-center gap-2">
                    <button
                      pButton
                      type="button"
                      label="Thêm"
                      size="small"
                      [disabled]="!newNames[group]?.trim()"
                      (click)="onCreateState(group)"
                    ></button>
                    <button
                      pButton
                      type="button"
                      label="Hủy"
                      size="small"
                      severity="secondary"
                      [text]="true"
                      (click)="showAddForm[group] = false; newNames[group] = ''"
                    ></button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Migration Dialog -->
      <p-dialog
        header="Di chuyển công việc & Xóa trạng thái"
        [(visible)]="displayMigrationDialog"
        [modal]="true"
        [style]="{ width: '450px' }"
        [draggable]="false"
        [resizable]="false"
      >
        <div class="space-y-4 py-2 text-xs text-gray-600">
          <div class="rounded-lg bg-amber-50 border border-amber-100 p-3 text-amber-800 flex gap-2">
            <i class="pi pi-info-circle text-base mt-0.5"></i>
            <div>
              <p class="font-bold">Trạng thái này đang được sử dụng!</p>
              <p class="mt-0.5">Có một số công việc đang ở trạng thái này. Bạn cần chọn trạng thái khác để di chuyển những công việc đó sang trước khi xóa.</p>
            </div>
          </div>

          <p class="font-medium text-sm text-gray-700">
            Chọn trạng thái thay thế:
          </p>

          <p-fluid>
            <p-select
              [options]="migrationTargets"
              [(ngModel)]="selectedMigrationTargetId"
              optionLabel="name"
              optionValue="id"
              placeholder="Chọn trạng thái đích"
            ></p-select>
          </p-fluid>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex items-center justify-end gap-2 text-xs">
            <button
              pButton
              (click)="displayMigrationDialog = false"
              label="Hủy"
              severity="secondary"
              [text]="true"
              [fluid]="false"
            ></button>
            <button
              pButton
              (click)="onMigrateAndDelete()"
              [disabled]="!selectedMigrationTargetId || isMigrating()"
              label="Di chuyển & Xóa"
              severity="danger"
              [fluid]="false"
            ></button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .cdk-drag-preview {
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                  0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12);
      border-radius: 8px;
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `],
})
export class StatesTabComponent implements OnInit {
  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly groupOrder = [
    StateGroup.BACKLOG,
    StateGroup.UNSTARTED,
    StateGroup.STARTED,
    StateGroup.COMPLETED,
    StateGroup.CANCELLED,
  ];

  // Inline Creation form bindings
  showAddForm: Record<string, boolean> = {};
  newNames: Record<string, string> = {};
  newColors: Record<string, string> = {};

  // Inline editing temp name store
  private originalNameTemp = '';

  // Migration Dialog bindings
  displayMigrationDialog = false;
  stateToDelete: ProjectState | null = null;
  migrationTargets: ProjectState[] = [];
  selectedMigrationTargetId: string | null = null;
  readonly isMigrating = signal<boolean>(false);

  // Compute all states in a single list
  readonly allStatesList = computed(() => {
    const grouped = this.projectStore.currentProjectStates();
    if (!grouped) return [];
    return [
      ...(grouped.backlog || []),
      ...(grouped.unstarted || []),
      ...(grouped.started || []),
      ...(grouped.completed || []),
      ...(grouped.cancelled || []),
    ];
  });

  readonly totalStatesCount = computed(() => this.allStatesList().length);

  // Check read-only state
  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;

    const user = this.authService.currentUser();
    if (!user) return true;

    if (user.systemRole === 'Admin') return false;

    const member = this.projectStore.members().find((m) => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  ngOnInit(): void {
    // Initialize add forms config
    for (const group of this.groupOrder) {
      this.showAddForm[group] = false;
      this.newNames[group] = '';
      this.newColors[group] = this.getDefaultColor(group);
    }

    const project = this.projectStore.currentProject();
    if (project) {
      this.projectStore.loadStates(project.id);
      this.projectStore.loadMembers(project.id);
    }
  }

  statesForGroup(group: StateGroup): ProjectState[] {
    const statesObj = this.projectStore.currentProjectStates();
    if (!statesObj) return [];
    return statesObj[group] || [];
  }

  getStatesCount(group: StateGroup): number {
    return this.statesForGroup(group).length;
  }

  getGroupName(group: StateGroup): string {
    switch (group) {
      case StateGroup.BACKLOG:
        return 'Backlog';
      case StateGroup.UNSTARTED:
        return 'Chưa bắt đầu';
      case StateGroup.STARTED:
        return 'Đang thực hiện';
      case StateGroup.COMPLETED:
        return 'Đã hoàn thành';
      case StateGroup.CANCELLED:
        return 'Đã hủy';
      default:
        return group;
    }
  }

  getGroupColor(group: StateGroup): string {
    switch (group) {
      case StateGroup.BACKLOG:
        return 'bg-gray-400';
      case StateGroup.UNSTARTED:
        return 'bg-amber-400';
      case StateGroup.STARTED:
        return 'bg-blue-500';
      case StateGroup.COMPLETED:
        return 'bg-green-500';
      case StateGroup.CANCELLED:
        return 'bg-red-400';
      default:
        return 'bg-gray-300';
    }
  }

  getDefaultColor(group: StateGroup): string {
    switch (group) {
      case StateGroup.BACKLOG:
        return '#9ca3af';
      case StateGroup.UNSTARTED:
        return '#fbbf24';
      case StateGroup.STARTED:
        return '#3b82f6';
      case StateGroup.COMPLETED:
        return '#22c55e';
      case StateGroup.CANCELLED:
        return '#f87171';
      default:
        return '#6b7280';
    }
  }

  onDrop(event: CdkDragDrop<ProjectState[]>, group: StateGroup): void {
    if (event.previousIndex === event.currentIndex || this.isReadOnly()) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    const currentList = [...this.statesForGroup(group)];
    moveItemInArray(currentList, event.previousIndex, event.currentIndex);

    const reorderItems = currentList.map((state, idx) => ({
      stateId: state.id,
      order: idx + 1,
    }));

    this.projectService.reorderStates(project.id, { items: reorderItems }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi sắp xếp',
          detail: err.error?.message || 'Có lỗi xảy ra khi sắp xếp lại.',
        });
      },
    });
  }

  onSetDefault(state: ProjectState): void {
    if (state.isDefault || this.isReadOnly()) return;
    const project = this.projectStore.currentProject();
    if (!project) return;

    this.projectService.updateState(project.id, state.id, { isDefault: true }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã đặt "${state.name}" làm mặc định.`,
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Thất bại',
          detail: err.error?.message || 'Không thể thiết lập mặc định.',
        });
      },
    });
  }

  onFocusName(state: ProjectState): void {
    this.originalNameTemp = state.name;
  }

  onUpdateName(state: ProjectState, newName: string): void {
    const formattedName = newName.trim();
    if (!formattedName) {
      // Revert name
      state.name = this.originalNameTemp;
      return;
    }

    if (formattedName === this.originalNameTemp) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    this.projectService.updateState(project.id, state.id, { name: formattedName }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Cập nhật thành công',
          detail: `Tên trạng thái đã được đổi thành "${formattedName}".`,
        });
      },
      error: (err) => {
        state.name = this.originalNameTemp;
        this.messageService.add({
          severity: 'error',
          summary: 'Thất bại',
          detail: err.error?.message || 'Không thể đổi tên trạng thái.',
        });
      },
    });
  }

  onUpdateColor(state: ProjectState, color: string): void {
    if (state.color === color || this.isReadOnly()) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    this.projectService.updateState(project.id, state.id, { color }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Cập nhật thành công',
          detail: 'Màu trạng thái đã được lưu.',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Thất bại',
          detail: err.error?.message || 'Không thể đổi màu trạng thái.',
        });
      },
    });
  }

  onCreateState(group: StateGroup): void {
    const name = this.newNames[group]?.trim();
    const color = this.newColors[group] || this.getDefaultColor(group);

    if (!name) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    if (this.totalStatesCount() >= 20) {
      this.messageService.add({
        severity: 'error',
        summary: 'Giới hạn trạng thái',
        detail: 'Mỗi dự án chỉ có tối đa 20 trạng thái.',
      });
      return;
    }

    this.projectService.createState(project.id, { name, color, group }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.newNames[group] = '';
        this.showAddForm[group] = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: `Đã thêm trạng thái "${name}".`,
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Thêm trạng thái thất bại',
          detail: err.error?.message || 'Có lỗi xảy ra.',
        });
      },
    });
  }

  onDeleteState(state: ProjectState): void {
    const project = this.projectStore.currentProject();
    if (!project || this.isReadOnly()) return;

    if (state.isDefault) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Không thể xóa trạng thái mặc định.',
      });
      return;
    }

    if (this.totalStatesCount() <= 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cảnh báo',
        detail: 'Dự án phải có ít nhất 2 trạng thái.',
      });
      return;
    }

    this.projectService.deleteState(project.id, state.id).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Thành công',
          detail: 'Trạng thái đã được xóa.',
        });
      },
      error: (err) => {
        if (err.status === 422) {
          // Open migration / replacement dialog
          this.stateToDelete = state;
          this.selectedMigrationTargetId = null;
          // Filter targets (excluding deleted one)
          this.migrationTargets = this.allStatesList().filter((s) => s.id !== state.id);
          this.displayMigrationDialog = true;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: err.error?.message || 'Không thể xóa trạng thái.',
          });
        }
      },
    });
  }

  onMigrateAndDelete(): void {
    const project = this.projectStore.currentProject();
    if (!project || !this.stateToDelete || !this.selectedMigrationTargetId) return;

    this.isMigrating.set(true);

    this.projectService
      .migrateState(project.id, {
        fromStateId: this.stateToDelete.id,
        toStateId: this.selectedMigrationTargetId,
      })
      .subscribe({
        next: () => {
          this.isMigrating.set(false);
          this.displayMigrationDialog = false;
          this.stateToDelete = null;
          this.projectStore.loadStates(project.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã di chuyển công việc và xóa trạng thái thành công.',
          });
        },
        error: (err) => {
          this.isMigrating.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Di chuyển thất bại',
            detail: err.error?.message || 'Có lỗi xảy ra khi di chuyển.',
          });
        },
      });
  }
}
