import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { ProjectStore } from '../../../state/project.store';
import { ProjectService } from '../../../services/project.service';
import { StateTemplateService } from '../../../services/state-template.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { FluidModule } from 'primeng/fluid';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TooltipModule } from 'primeng/tooltip';
import { StateGroup, ProjectState, WorkspaceStateTemplate } from '@mpm/shared-types';
import { GROUP_ORDER, getGroupName, getGroupColor, getDefaultColor } from './states-tab.helpers';
import { IconPickerPanelComponent } from '../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { StateDotComponent } from '../../../../shared/components/state-dot/state-dot.component';

@Component({
  standalone: true,
  selector: 'app-states-tab',
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PopoverModule,
    FluidModule,
    FormsModule,
    DragDropModule,
    TooltipModule,
    IconPickerPanelComponent,
    StateDotComponent,
  ],
  templateUrl: './states-tab.component.html',
  styleUrl: './states-tab.component.css',
})
export class StatesTabComponent implements OnInit {
  readonly projectStore = inject(ProjectStore);
  private readonly projectService = inject(ProjectService);
  private readonly stateTemplateService = inject(StateTemplateService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly groupOrder = GROUP_ORDER;

  // Workspace templates (read-only section)
  readonly workspaceTemplates = signal<WorkspaceStateTemplate[]>([]);
  readonly isApplyingTemplate = signal<boolean>(false);

  // Inline Creation form bindings
  showAddForm: Record<string, boolean> = {};
  newNames: Record<string, string> = {};
  newColors: Record<string, string> = {};
  newIcons: Record<string, string> = {};

  // Inline editing temp name store
  private originalNameTemp = '';

  // Drag & Drop state
  draggedStateId: string | null = null;
  hoveredStateId: string | null = null;

  // Migration Dialog bindings
  displayMigrationDialog = false;
  stateToDelete: ProjectState | null = null;
  migrationTargets: ProjectState[] = [];
  selectedMigrationTargetId: string | null = null;
  readonly isMigrating = signal<boolean>(false);

  getMigrationTargetLabel(): string {
    const found = this.migrationTargets.find((t) => t.id === this.selectedMigrationTargetId);
    return found ? found.name : 'Chọn trạng thái đích';
  }

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

  // Check read-only state (SM/PO can edit project states)
  readonly isReadOnly = computed(() => {
    const project = this.projectStore.currentProject();
    if (!project) return true;

    const user = this.authService.currentUser();
    if (!user) return true;

    if (user.systemRole === 'Admin') return false;

    const member = this.projectStore.members().find((m) => m.userId === user.id);
    return member?.projectRole !== 'Scrum_Master';
  });

  // Check if user is admin (for "Áp dụng lại template" button)
  readonly isAdmin = computed(() => {
    const user = this.authService.currentUser();
    return user?.systemRole === 'Admin';
  });

  ngOnInit(): void {
    // Initialize add forms config
    for (const group of this.groupOrder) {
      this.showAddForm[group] = false;
      this.newNames[group] = '';
      this.newColors[group] = this.getDefaultColor(group);
      this.newIcons[group] = '';
    }

    const project = this.projectStore.currentProject();
    if (project) {
      this.projectStore.loadStates(project.id);
      this.projectStore.loadMembers(project.id);
      this.loadWorkspaceTemplates(project.workspaceId);
    }
  }

  /**
   * Tải workspace state templates để hiển thị section tham khảo
   */
  private loadWorkspaceTemplates(workspaceId: string | null): void {
    if (!workspaceId) return;

    this.stateTemplateService.getTemplates(workspaceId).subscribe({
      next: (templates) => this.workspaceTemplates.set(templates),
      error: () => {
        // Không hiển thị section nếu không lấy được templates
        this.workspaceTemplates.set([]);
      },
    });
  }

  /**
   * Áp dụng lại workspace template vào project hiện tại
   * Chỉ admin mới có thể thực hiện
   */
  onApplyTemplate(): void {
    const project = this.projectStore.currentProject();
    if (!project || !project.workspaceId) return;

    this.isApplyingTemplate.set(true);

    this.stateTemplateService.applyToProject(project.workspaceId, project.id).subscribe({
      next: (result) => {
        this.isApplyingTemplate.set(false);
        this.projectStore.loadStates(project.id);

        if (result.addedCount > 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Áp dụng template thành công',
            detail: `Đã thêm ${result.addedCount} trạng thái mới từ template (bỏ qua ${result.skippedCount} đã tồn tại).`,
          });
        } else {
          this.messageService.add({
            severity: 'info',
            summary: 'Không có thay đổi',
            detail: `Tất cả ${result.skippedCount} trạng thái từ template đã tồn tại trong project.`,
          });
        }
      },
      error: (err) => {
        this.isApplyingTemplate.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Áp dụng template thất bại',
          detail: err.error?.message || 'Có lỗi xảy ra khi áp dụng template.',
        });
      },
    });
  }

  statesForGroup(group: StateGroup): ProjectState[] {
    const statesObj = this.projectStore.currentProjectStates();
    if (!statesObj) return [];
    return statesObj[group] || [];
  }

  getStatesCount(group: StateGroup): number {
    return this.statesForGroup(group).length;
  }

  getGroupName = getGroupName;
  getGroupColor = getGroupColor;
  getDefaultColor = getDefaultColor;

  onStateDragStart(stateId: string): void {
    this.draggedStateId = stateId;
  }

  onStateDragEnd(): void {
    setTimeout(() => {
      this.draggedStateId = null;
      this.hoveredStateId = null;
    }, 100);
  }

  onDrop(_event: CdkDragDrop<ProjectState[]>, group: StateGroup): void {
    if (this.isReadOnly()) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    const draggedId = this.draggedStateId;
    const hoveredId = this.hoveredStateId;

    this.draggedStateId = null;
    this.hoveredStateId = null;

    if (!draggedId || !hoveredId || draggedId === hoveredId) return;

    const currentList = [...this.statesForGroup(group)];
    const draggedIdx = currentList.findIndex(s => s.id === draggedId);
    if (draggedIdx === -1) return;

    const [dragged] = currentList.splice(draggedIdx, 1);

    if (hoveredId.startsWith('end-')) {
      currentList.push(dragged);
    } else {
      const targetIdx = currentList.findIndex(s => s.id === hoveredId);
      currentList.splice(targetIdx === -1 ? currentList.length : targetIdx, 0, dragged);
    }

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

  onUpdateIcon(state: ProjectState, icon: string): void {
    if (state.icon === icon || this.isReadOnly()) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    this.projectService.updateState(project.id, state.id, { icon }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Cập nhật thành công',
          detail: 'Icon trạng thái đã được lưu.',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Thất bại',
          detail: err.error?.message || 'Không thể đổi icon trạng thái.',
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

    const icon = this.newIcons[group] || undefined;
    this.projectService.createState(project.id, { name, color, group, icon }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.newNames[group] = '';
        this.newIcons[group] = '';
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
