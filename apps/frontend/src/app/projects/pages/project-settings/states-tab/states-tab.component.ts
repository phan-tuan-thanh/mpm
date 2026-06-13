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
import { GROUP_ORDER, getGroupName, getGroupColor, getDefaultColor, getDefaultDarkColor } from './states-tab.helpers';
import { IconPickerPanelComponent } from '../../../../shared/components/icon-picker-panel/icon-picker-panel.component';
import { ColorPickerPanelComponent } from '../../../../shared/components/color-picker-panel/color-picker-panel.component';
import { StateDotComponent } from '../../../../shared/components/state-dot/state-dot.component';
import { LayoutService } from '../../../../layout/services/layout.service';

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
    ColorPickerPanelComponent,
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
  protected readonly layoutService = inject(LayoutService);

  readonly groupOrder = GROUP_ORDER;

  // Workspace templates (read-only section)
  readonly workspaceTemplates = signal<WorkspaceStateTemplate[]>([]);
  readonly isApplyingTemplate = signal<boolean>(false);

  // Inline Creation form bindings
  showAddForm: Record<string, boolean> = {};
  newNames: Record<string, string> = {};
  newColorsLight: Record<string, string> = {};
  newColorsDark: Record<string, string> = {};
  newIcons: Record<string, string> = {};
  showCustomAddColors: Record<string, boolean> = {};

  // Drafts for editing state color
  editColorLightDraft: Record<string, string> = {};
  editColorDarkDraft: Record<string, string> = {};
  showCustomEditColors: Record<string, boolean> = {};

  // Group collapsible state
  collapsedGroups: Record<string, boolean> = {};

  readonly presetPairs = [
    { light: '#EF4444', dark: '#F87171' }, // Red
    { light: '#F97316', dark: '#FB923C' }, // Orange
    { light: '#F59E0B', dark: '#FBBF24' }, // Amber
    { light: '#10B981', dark: '#34D399' }, // Emerald
    { light: '#0D9488', dark: '#2DD4BF' }, // Teal
    { light: '#3B82F6', dark: '#60A5FA' }, // Blue
    { light: '#6366F1', dark: '#818CF8' }, // Indigo
    { light: '#8B5CF6', dark: '#A78BFA' }, // Violet
    { light: '#EC4899', dark: '#F472B6' }, // Pink
    { light: '#6B7280', dark: '#9CA3AF' }  // Gray
  ];

  getPresetGradient(light: string, dark: string): string {
    return `linear-gradient(135deg, ${light} 50%, ${dark} 50%)`;
  }

  toggleGroup(group: string): void {
    this.collapsedGroups[group] = !this.collapsedGroups[group];
  }

  isAllCollapsed(): boolean {
    return this.groupOrder.every(g => this.collapsedGroups[g]);
  }

  toggleCollapseAll(): void {
    const targetState = !this.isAllCollapsed();
    for (const group of this.groupOrder) {
      this.collapsedGroups[group] = targetState;
    }
  }

  onOpenColorPopover(state: ProjectState): void {
    this.editColorLightDraft[state.id] = state.colorLight;
    this.editColorDarkDraft[state.id] = state.colorDark;
    this.showCustomEditColors[state.id] = false;
  }

  onCloseColorPopover(state: ProjectState): void {
    const light = this.editColorLightDraft[state.id];
    const dark = this.editColorDarkDraft[state.id];
    if (light && dark && (light !== state.colorLight || dark !== state.colorDark)) {
      this.onUpdateColor(state, light, dark);
    }
  }

  selectColorPair(group: string, light: string, dark: string): void {
    this.newColorsLight[group] = light;
    this.newColorsDark[group] = dark;
  }

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
    return found ? found.name : this.t().selectTargetState;
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

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      readOnlyBanner: 'Read-only view. Only Scrum Master or Admin can edit states.',
      reapplyTemplateBtn: 'Reapply template',
      templateSectionTitle: 'Workspace Template',
      templateReferenceDesc: 'Reference template list (read-only). States created from template will display icon',
      defaultIndicator: 'Default',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      addBtn: 'Add',
      cancelBtn: 'Cancel',
      addStatePlaceholder: 'State name...',
      quickColorTitle: 'Quick Colors (Light / Dark)',
      customColorBtn: 'Customize Light & Dark colors',
      lightModeLabel: 'Light mode color:',
      darkModeLabel: 'Dark mode color:',
      colorTooltip: 'Choose color pair',
      iconTooltip: 'State icon',
      fromTemplateTooltip: 'From workspace template',
      deleteBtn: 'Delete',
      migrationDialogHeader: 'Migrate Work & Delete State',
      migrationWarningTitle: 'This state is currently in use!',
      migrationWarningDesc: 'There are tasks in this state. You must choose another state to migrate these tasks to before deleting.',
      migrationTargetLabel: 'Select replacement state:',
      selectTargetState: 'Select target state',
      migrateAndDeleteBtn: 'Migrate & Delete',
      applyTemplateSuccessSummary: 'Reapply Success',
      applyTemplateSuccessDetail: (added: number, skipped: number) => `Added ${added} new state(s) from template (skipped ${skipped} already existing).`,
      applyTemplateInfoSummary: 'No Changes',
      applyTemplateInfoDetail: (skipped: number) => `All ${skipped} state(s) from template already exist in the project.`,
      applyTemplateErrorSummary: 'Reapply Failed',
      applyTemplateErrorDetail: (msg: string) => msg || 'An error occurred while reapplying template.',
      reorderErrorSummary: 'Reorder Failed',
      reorderErrorDetail: (msg: string) => msg || 'An error occurred while reordering.',
      groupMoveErrorSummary: 'Group Move Failed',
      groupMoveErrorDetail: (msg: string) => msg || 'Could not move state to another group.',
      setDefaultSuccessSummary: 'Success',
      setDefaultSuccessDetail: (name: string) => `Set "${name}" as default state.`,
      setDefaultErrorSummary: 'Failed',
      setDefaultErrorDetail: (msg: string) => msg || 'Could not set default.',
      updateNameSuccessSummary: 'Update Success',
      updateNameSuccessDetail: (name: string) => `State renamed to "${name}".`,
      updateNameErrorSummary: 'Failed',
      updateNameErrorDetail: (msg: string) => msg || 'Could not rename state.',
      updateColorSuccessSummary: 'Update Success',
      updateColorSuccessDetail: 'State color saved.',
      updateColorErrorSummary: 'Failed',
      updateColorErrorDetail: (msg: string) => msg || 'Could not change color.',
      updateIconSuccessSummary: 'Update Success',
      updateIconSuccessDetail: 'State icon saved.',
      updateIconErrorSummary: 'Failed',
      updateIconErrorDetail: (msg: string) => msg || 'Could not change icon.',
      limitErrorSummary: 'State Limit',
      limitErrorDetail: 'Each project can have a maximum of 20 states.',
      createSuccessSummary: 'Success',
      createSuccessDetail: (name: string) => `Added state "${name}".`,
      createErrorSummary: 'Failed to Add State',
      createErrorDetail: (msg: string) => msg || 'An error occurred.',
      defaultDeleteWarningSummary: 'Warning',
      defaultDeleteWarningDetail: 'Cannot delete default state.',
      minLimitWarningSummary: 'Warning',
      minLimitWarningDetail: 'Project must have at least 2 states.',
      deleteSuccessSummary: 'Success',
      deleteSuccessDetail: 'State deleted successfully.',
      deleteErrorSummary: 'Error',
      deleteErrorDetail: (msg: string) => msg || 'Could not delete state.',
      migrateSuccessSummary: 'Success',
      migrateSuccessDetail: 'Tasks migrated and state deleted successfully.',
      migrateErrorSummary: 'Migration Failed',
      migrateErrorDetail: (msg: string) => msg || 'An error occurred during migration.',
    } : {
      readOnlyBanner: 'Chế độ xem. Chỉ Scrum Master hoặc Admin mới có quyền thực hiện các thao tác này.',
      reapplyTemplateBtn: 'Áp dụng lại template',
      templateSectionTitle: 'Workspace Template',
      templateReferenceDesc: 'Danh sách template tham khảo (read-only). States được tạo từ template sẽ hiển thị icon',
      defaultIndicator: 'Mặc định',
      expandAll: 'Mở rộng tất cả',
      collapseAll: 'Thu gọn tất cả',
      addBtn: 'Thêm',
      cancelBtn: 'Hủy',
      addStatePlaceholder: 'Tên trạng thái...',
      quickColorTitle: 'Màu chọn nhanh (Light / Dark)',
      customColorBtn: 'Tự tùy chỉnh màu sắc Light & Dark',
      lightModeLabel: 'Màu Light mode:',
      darkModeLabel: 'Màu Dark mode:',
      colorTooltip: 'Chọn cặp màu sắc',
      iconTooltip: 'Icon trạng thái',
      fromTemplateTooltip: 'Từ workspace template',
      deleteBtn: 'Xóa',
      migrationDialogHeader: 'Di chuyển công việc & Xóa trạng thái',
      migrationWarningTitle: 'Trạng thái này đang được sử dụng!',
      migrationWarningDesc: 'Có một số công việc đang ở trạng thái này. Bạn cần chọn trạng thái khác để di chuyển những công việc đó sang trước khi xóa.',
      migrationTargetLabel: 'Chọn trạng thái thay thế:',
      selectTargetState: 'Chọn trạng thái đích',
      migrateAndDeleteBtn: 'Di chuyển & Xóa',
      applyTemplateSuccessSummary: 'Áp dụng template thành công',
      applyTemplateSuccessDetail: (added: number, skipped: number) => `Đã thêm ${added} trạng thái mới từ template (bỏ qua ${skipped} đã tồn tại).`,
      applyTemplateInfoSummary: 'Không có thay đổi',
      applyTemplateInfoDetail: (skipped: number) => `Tất cả ${skipped} trạng thái từ template đã tồn tại trong project.`,
      applyTemplateErrorSummary: 'Áp dụng template thất bại',
      applyTemplateErrorDetail: (msg: string) => msg || 'Có lỗi xảy ra khi áp dụng template.',
      reorderErrorSummary: 'Lỗi sắp xếp',
      reorderErrorDetail: (msg: string) => msg || 'Có lỗi xảy ra khi sắp xếp lại.',
      groupMoveErrorSummary: 'Lỗi di chuyển nhóm',
      groupMoveErrorDetail: (msg: string) => msg || 'Không thể di chuyển trạng thái sang nhóm khác.',
      setDefaultSuccessSummary: 'Thành công',
      setDefaultSuccessDetail: (name: string) => `Đã đặt "${name}" làm mặc định.`,
      setDefaultErrorSummary: 'Thất bại',
      setDefaultErrorDetail: (msg: string) => msg || 'Không thể thiết lập mặc định.',
      updateNameSuccessSummary: 'Cập nhật thành công',
      updateNameSuccessDetail: (name: string) => `Tên trạng thái đã được đổi thành "${name}".`,
      updateNameErrorSummary: 'Thất bại',
      updateNameErrorDetail: (msg: string) => msg || 'Không thể đổi tên trạng thái.',
      updateColorSuccessSummary: 'Cập nhật thành công',
      updateColorSuccessDetail: 'Màu trạng thái đã được lưu.',
      updateColorErrorSummary: 'Thất bại',
      updateColorErrorDetail: (msg: string) => msg || 'Không thể đổi màu trạng thái.',
      updateIconSuccessSummary: 'Cập nhật thành công',
      updateIconSuccessDetail: 'Icon trạng thái đã được lưu.',
      updateIconErrorSummary: 'Thất bại',
      updateIconErrorDetail: (msg: string) => msg || 'Không thể đổi icon trạng thái.',
      limitErrorSummary: 'Giới hạn trạng thái',
      limitErrorDetail: 'Mỗi dự án chỉ có tối đa 20 trạng thái.',
      createSuccessSummary: 'Thành công',
      createSuccessDetail: (name: string) => `Đã thêm trạng thái "${name}".`,
      createErrorSummary: 'Thêm trạng thái thất bại',
      createErrorDetail: (msg: string) => msg || 'Có lỗi xảy ra.',
      defaultDeleteWarningSummary: 'Cảnh báo',
      defaultDeleteWarningDetail: 'Không thể xóa trạng thái mặc định.',
      minLimitWarningSummary: 'Cảnh báo',
      minLimitWarningDetail: 'Dự án phải có ít nhất 2 trạng thái.',
      deleteSuccessSummary: 'Thành công',
      deleteSuccessDetail: 'Trạng thái đã được xóa.',
      deleteErrorSummary: 'Lỗi',
      deleteErrorDetail: (msg: string) => msg || 'Không thể xóa trạng thái.',
      migrateSuccessSummary: 'Thành công',
      migrateSuccessDetail: 'Đã di chuyển công việc và xóa trạng thái thành công.',
      migrateErrorSummary: 'Di chuyển thất bại',
      migrateErrorDetail: (msg: string) => msg || 'Có lỗi xảy ra khi di chuyển.',
    };
  });

  ngOnInit(): void {
    // Initialize add forms config
    for (const group of this.groupOrder) {
      this.showAddForm[group] = false;
      this.newNames[group] = '';
      this.newColorsLight[group] = this.getDefaultColor(group);
      this.newColorsDark[group] = this.getDefaultDarkColor(group);
      this.newIcons[group] = '';
      this.showCustomAddColors[group] = false;
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

    const trans = this.t();
    this.stateTemplateService.applyToProject(project.workspaceId, project.id).subscribe({
      next: (result) => {
        this.isApplyingTemplate.set(true); // set in sub? wait it was false
        this.isApplyingTemplate.set(false);
        this.projectStore.loadStates(project.id);

        if (result.addedCount > 0) {
          this.messageService.add({
            severity: 'success',
            summary: trans.applyTemplateSuccessSummary,
            detail: trans.applyTemplateSuccessDetail(result.addedCount, result.skippedCount),
          });
        } else {
          this.messageService.add({
            severity: 'info',
            summary: trans.applyTemplateInfoSummary,
            detail: trans.applyTemplateInfoDetail(result.skippedCount),
          });
        }
      },
      error: (err) => {
        this.isApplyingTemplate.set(false);
        this.messageService.add({
          severity: 'error',
          summary: trans.applyTemplateErrorSummary,
          detail: trans.applyTemplateErrorDetail(err.error?.message),
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

  getGroupLabel(group: StateGroup): string {
    const isEn = this.projectStore.projectLanguage() === 'en';
    switch (group) {
      case StateGroup.BACKLOG:
        return 'Backlog';
      case StateGroup.UNSTARTED:
        return isEn ? 'Unstarted' : 'Chưa bắt đầu';
      case StateGroup.STARTED:
        return isEn ? 'Started' : 'Đang thực hiện';
      case StateGroup.COMPLETED:
        return isEn ? 'Completed' : 'Đã hoàn thành';
      case StateGroup.CANCELLED:
        return isEn ? 'Cancelled' : 'Đã hủy';
      default:
        return group;
    }
  }

  getGroupColor = getGroupColor;
  getDefaultColor = getDefaultColor;
  getDefaultDarkColor = getDefaultDarkColor;

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

    const allStates = this.allStatesList();
    const draggedState = allStates.find(s => s.id === draggedId);
    if (!draggedState) return;

    const sourceGroup = draggedState.group;
    const targetGroup = group;

    const trans = this.t();
    if (sourceGroup === targetGroup) {
      const currentList = [...this.statesForGroup(targetGroup)];
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
            summary: trans.reorderErrorSummary,
            detail: trans.reorderErrorDetail(err.error?.message),
          });
        },
      });
    } else {
      const targetList = [...this.statesForGroup(targetGroup)];
      
      if (hoveredId.startsWith('end-')) {
        targetList.push(draggedState);
      } else {
        const targetIdx = targetList.findIndex(s => s.id === hoveredId);
        targetList.splice(targetIdx === -1 ? targetList.length : targetIdx, 0, draggedState);
      }

      const reorderItems = targetList.map((state, idx) => ({
        stateId: state.id,
        order: idx + 1,
      }));

      this.projectService.updateState(project.id, draggedId, { group: targetGroup }).subscribe({
        next: () => {
          this.projectService.reorderStates(project.id, { items: reorderItems }).subscribe({
            next: () => {
              this.projectStore.loadStates(project.id);
            },
            error: (err) => {
              this.projectStore.loadStates(project.id);
              this.messageService.add({
                severity: 'error',
                summary: trans.reorderErrorSummary,
                detail: trans.reorderErrorDetail(err.error?.message),
              });
            }
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: trans.groupMoveErrorSummary,
            detail: trans.groupMoveErrorDetail(err.error?.message),
          });
        },
      });
    }
  }

  onSetDefault(state: ProjectState): void {
    if (state.isDefault || this.isReadOnly()) return;
    const project = this.projectStore.currentProject();
    if (!project) return;

    const trans = this.t();
    this.projectService.updateState(project.id, state.id, { isDefault: true }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: trans.setDefaultSuccessSummary,
          detail: trans.setDefaultSuccessDetail(state.name),
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: trans.setDefaultErrorSummary,
          detail: trans.setDefaultErrorDetail(err.error?.message),
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

    const trans = this.t();
    this.projectService.updateState(project.id, state.id, { name: formattedName }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: trans.updateNameSuccessSummary,
          detail: trans.updateNameSuccessDetail(formattedName),
        });
      },
      error: (err) => {
        state.name = this.originalNameTemp;
        this.messageService.add({
          severity: 'error',
          summary: trans.updateNameErrorSummary,
          detail: trans.updateNameErrorDetail(err.error?.message),
        });
      },
    });
  }

  onUpdateColor(state: ProjectState, colorLight: string, colorDark: string): void {
    if ((state.colorLight === colorLight && state.colorDark === colorDark) || this.isReadOnly()) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    const trans = this.t();
    this.projectService.updateState(project.id, state.id, { colorLight, colorDark }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: trans.updateColorSuccessSummary,
          detail: trans.updateColorSuccessDetail,
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: trans.updateColorErrorSummary,
          detail: trans.updateColorErrorDetail(err.error?.message),
        });
      },
    });
  }

  onUpdateIcon(state: ProjectState, icon: string): void {
    if (state.icon === icon || this.isReadOnly()) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    const trans = this.t();
    this.projectService.updateState(project.id, state.id, { icon }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: trans.updateIconSuccessSummary,
          detail: trans.updateIconSuccessDetail,
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: trans.updateIconErrorSummary,
          detail: trans.updateIconErrorDetail(err.error?.message),
        });
      },
    });
  }

  onCreateState(group: StateGroup): void {
    const name = this.newNames[group]?.trim();
    const colorLight = this.newColorsLight[group] || this.getDefaultColor(group);
    const colorDark = this.newColorsDark[group] || this.getDefaultDarkColor(group);

    if (!name) return;

    const project = this.projectStore.currentProject();
    if (!project) return;

    const trans = this.t();
    if (this.totalStatesCount() >= 20) {
      this.messageService.add({
        severity: 'error',
        summary: trans.limitErrorSummary,
        detail: trans.limitErrorDetail,
      });
      return;
    }

    const icon = this.newIcons[group] || undefined;
    this.projectService.createState(project.id, { name, colorLight, colorDark, group, icon }).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.newNames[group] = '';
        this.newIcons[group] = '';
        this.newColorsLight[group] = this.getDefaultColor(group);
        this.newColorsDark[group] = this.getDefaultDarkColor(group);
        this.showCustomAddColors[group] = false;
        this.showAddForm[group] = false;
        this.messageService.add({
          severity: 'success',
          summary: trans.createSuccessSummary,
          detail: trans.createSuccessDetail(name),
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: trans.createErrorSummary,
          detail: trans.createErrorDetail(err.error?.message),
        });
      },
    });
  }

  onDeleteState(state: ProjectState): void {
    const project = this.projectStore.currentProject();
    if (!project || this.isReadOnly()) return;

    const trans = this.t();
    if (state.isDefault) {
      this.messageService.add({
        severity: 'warn',
        summary: trans.defaultDeleteWarningSummary,
        detail: trans.defaultDeleteWarningDetail,
      });
      return;
    }

    if (this.totalStatesCount() <= 2) {
      this.messageService.add({
        severity: 'warn',
        summary: trans.minLimitWarningSummary,
        detail: trans.minLimitWarningDetail,
      });
      return;
    }

    this.projectService.deleteState(project.id, state.id).subscribe({
      next: () => {
        this.projectStore.loadStates(project.id);
        this.messageService.add({
          severity: 'success',
          summary: trans.deleteSuccessSummary,
          detail: trans.deleteSuccessDetail,
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
            summary: trans.deleteErrorSummary,
            detail: trans.deleteErrorDetail(err.error?.message),
          });
        }
      },
    });
  }

  onMigrateAndDelete(): void {
    const project = this.projectStore.currentProject();
    if (!project || !this.stateToDelete || !this.selectedMigrationTargetId) return;

    this.isMigrating.set(true);

    const trans = this.t();
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
            summary: trans.migrateSuccessSummary,
            detail: trans.migrateSuccessDetail,
          });
        },
        error: (err) => {
          this.isMigrating.set(false);
          this.messageService.add({
            severity: 'error',
            summary: trans.migrateErrorSummary,
            detail: trans.migrateErrorDetail(err.error?.message),
          });
        },
      });
  }
}
