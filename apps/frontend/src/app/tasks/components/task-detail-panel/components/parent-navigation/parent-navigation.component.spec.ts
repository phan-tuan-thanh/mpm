/**
 * Mock Angular and PrimeNG modules to avoid JIT compilation issues in jsdom.
 */
jest.mock('@angular/forms', () => ({ FormsModule: {} }));
jest.mock('primeng/select', () => ({ SelectModule: {} }));
jest.mock('primeng/popover', () => ({ PopoverModule: {} }));
jest.mock('primeng/inputtext', () => ({ InputTextModule: {} }));
jest.mock('primeng/button', () => ({ ButtonModule: {} }));
jest.mock('primeng/tooltip', () => ({ TooltipModule: {} }));
jest.mock('primeng/confirmdialog', () => ({ ConfirmDialogModule: {} }));
jest.mock('primeng/api', () => ({
  ConfirmationService: class MockConfirmationService {},
}));

import { Injector, runInInjectionContext, SimpleChange, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ParentNavigationComponent } from './parent-navigation.component';
import type { TaskParentRef, TaskListItem, TaskType } from '@mpm/shared-types';
import { ProjectStore } from '../../../../../projects/state/project.store';

function makeParentRef(overrides: Partial<TaskParentRef> = {}): TaskParentRef {
  return {
    id: 'parent-id-1',
    taskId: 'PROJ-1',
    title: 'Parent Epic Task',
    type: 'epic',
    ...overrides,
  };
}

function makeTaskItem(overrides: Partial<TaskListItem> = {}): TaskListItem {
  return {
    id: 'task-id-1',
    taskId: 'PROJ-2',
    projectId: 'project-1',
    type: 'epic',
    title: 'Epic Task',
    priority: 'medium',
    stateId: 'state-1',
    assignees: [],
    labels: [],
    estimateValue: null,
    startDate: null,
    dueDate: null,
    completedAt: null,
    backlogOrder: 0,
    parentId: null,
    reporterId: 'user-1',
    cycleId: null,
    subItemCount: 0,
    attachmentCount: 0,
    linkCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TaskListItem;
}

/**
 * Unit tests for ParentNavigationComponent
 *
 * Tests component logic: hierarchy filtering, parent navigation emit,
 * parent change emit, remove confirm flow, dropdown visibility.
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
describe('ParentNavigationComponent', () => {
  let component: ParentNavigationComponent;
  let mockConfirmService: { confirm: jest.Mock };
  let injector: Injector;

  beforeEach(() => {
    mockConfirmService = { confirm: jest.fn() };
    injector = Injector.create({
      providers: [
        { provide: ConfirmationService, useValue: mockConfirmService },
        { provide: ProjectStore, useValue: { projectLanguage: signal('vi') } },
      ],
    });
    component = runInInjectionContext(injector, () => new ParentNavigationComponent());
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Display parent (Requirement 10.1)', () => {
    it('should compute correct type icon for epic parent', () => {
      component.parent = makeParentRef({ type: 'epic' });
      expect(component.parentTypeIcon()).toBe('pi pi-bolt');
      expect(component.parentTypeColor()).toBe('#8B5CF6');
    });

    it('should compute correct type icon for story parent', () => {
      component.parent = makeParentRef({ type: 'story' });
      expect(component.parentTypeIcon()).toBe('pi pi-book');
      expect(component.parentTypeColor()).toBe('#3B82F6');
    });

    it('should compute correct type icon for task parent', () => {
      component.parent = makeParentRef({ type: 'task' });
      expect(component.parentTypeIcon()).toBe('pi pi-check-circle');
      expect(component.parentTypeColor()).toBe('#10B981');
    });

    it('should return empty string when no parent', () => {
      component.parent = null;
      expect(component.parentTypeIcon()).toBe('');
      expect(component.parentTypeColor()).toBe('');
    });
  });

  describe('Navigate to parent (Requirement 10.2)', () => {
    it('should emit parentClicked with parent ID when onParentClick is called', () => {
      const spy = jest.spyOn(component.parentClicked, 'emit');
      component.parent = makeParentRef({ id: 'nav-parent-id' });
      component.onParentClick();

      expect(spy).toHaveBeenCalledWith('nav-parent-id');
    });

    it('should not emit when parent is null', () => {
      const spy = jest.spyOn(component.parentClicked, 'emit');
      component.parent = null;
      component.onParentClick();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Hierarchy filtering (Requirement 10.3)', () => {
    it('should filter available tasks by valid parent types for "task" child', () => {
      component.currentTaskType = 'task';
      component.availableTasks = [
        makeTaskItem({ id: '1', type: 'epic', title: 'Epic' }),
        makeTaskItem({ id: '2', type: 'story', title: 'Story' }),
        makeTaskItem({ id: '3', type: 'task', title: 'Task' }),
        makeTaskItem({ id: '4', type: 'subtask', title: 'Subtask' }),
      ];
      component.ngOnChanges({
        availableTasks: new SimpleChange(null, component.availableTasks, true),
        currentTaskType: new SimpleChange(null, component.currentTaskType, true),
      });

      const filtered = component.filteredTasks();
      expect(filtered.length).toBe(2);
      expect(filtered.map((t) => t.type)).toEqual(['epic', 'story']);
    });

    it('should filter for "subtask" child — epic, story, task are valid parents', () => {
      component.currentTaskType = 'subtask';
      component.availableTasks = [
        makeTaskItem({ id: '1', type: 'epic' }),
        makeTaskItem({ id: '2', type: 'story' }),
        makeTaskItem({ id: '3', type: 'task' }),
        makeTaskItem({ id: '4', type: 'subtask' }),
      ];
      component.ngOnChanges({
        availableTasks: new SimpleChange(null, component.availableTasks, true),
        currentTaskType: new SimpleChange(null, component.currentTaskType, true),
      });

      const filtered = component.filteredTasks();
      expect(filtered.length).toBe(3);
      expect(filtered.map((t) => t.type)).toEqual(['epic', 'story', 'task']);
    });

    it('should return empty for "epic" — no valid parents', () => {
      component.currentTaskType = 'epic';
      component.availableTasks = [
        makeTaskItem({ id: '1', type: 'epic' }),
        makeTaskItem({ id: '2', type: 'story' }),
      ];
      component.ngOnChanges({
        availableTasks: new SimpleChange(null, component.availableTasks, true),
        currentTaskType: new SimpleChange(null, component.currentTaskType, true),
      });

      expect(component.filteredTasks().length).toBe(0);
    });

    it('should exclude current task from dropdown', () => {
      component.currentTaskType = 'subtask';
      component.currentTaskId = 'self-id';
      component.availableTasks = [
        makeTaskItem({ id: 'self-id', type: 'task', title: 'Self' }),
        makeTaskItem({ id: 'other-id', type: 'task', title: 'Other' }),
      ];
      component.ngOnChanges({
        availableTasks: new SimpleChange(null, component.availableTasks, true),
        currentTaskType: new SimpleChange(null, component.currentTaskType, true),
        currentTaskId: new SimpleChange(null, component.currentTaskId, true),
      });

      const filtered = component.filteredTasks();
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('other-id');
    });
  });

  describe('Select parent (Requirement 10.4)', () => {
    it('should emit parentChanged with selected task ID', () => {
      const spy = jest.spyOn(component.parentChanged, 'emit');
      component.onParentSelected({ value: 'selected-parent-id' });

      expect(spy).toHaveBeenCalledWith('selected-parent-id');
    });

    it('should hide dropdown after selection', () => {
      component.dropdownVisible.set(true);
      component.onParentSelected({ value: 'selected-parent-id' });

      expect(component.dropdownVisible()).toBe(false);
    });

    it('should not emit when value is null (cleared)', () => {
      const spy = jest.spyOn(component.parentChanged, 'emit');
      component.onParentSelected({ value: null });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Remove parent (Requirement 10.6)', () => {
    it('should call confirmService.confirm when remove is triggered', () => {
      component.parent = makeParentRef({ taskId: 'PROJ-5' });
      component.onRemoveParent();

      expect(mockConfirmService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Xác nhận gỡ parent',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Gỡ',
          rejectLabel: 'Hủy',
        }),
      );
    });

    it('should emit parentChanged(null) when confirm is accepted', () => {
      const emitSpy = jest.spyOn(component.parentChanged, 'emit');
      mockConfirmService.confirm.mockImplementation((config: any) => {
        config.accept();
      });

      component.parent = makeParentRef();
      component.onRemoveParent();

      expect(emitSpy).toHaveBeenCalledWith(null);
    });

    it('should not emit when confirm is rejected', () => {
      const emitSpy = jest.spyOn(component.parentChanged, 'emit');
      mockConfirmService.confirm.mockImplementation((config: any) => {
        if (config.reject) config.reject();
      });

      component.parent = makeParentRef();
      component.onRemoveParent();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should include parent taskId in confirm message', () => {
      component.parent = makeParentRef({ taskId: 'PROJ-99' });
      component.onRemoveParent();

      const callArg = mockConfirmService.confirm.mock.calls[0][0];
      expect(callArg.message).toContain('PROJ-99');
    });
  });

  describe('Dropdown visibility', () => {
    it('should start hidden', () => {
      expect(component.dropdownVisible()).toBe(false);
    });

    it('should show when showDropdown is called', () => {
      component.showDropdown();
      expect(component.dropdownVisible()).toBe(true);
    });

    it('should hide when parent input changes from outside (not firstChange)', () => {
      component.dropdownVisible.set(true);
      component.parent = makeParentRef();
      component.ngOnChanges({
        parent: new SimpleChange(null, component.parent, false),
      });

      expect(component.dropdownVisible()).toBe(false);
    });

    it('should NOT hide on firstChange of parent', () => {
      component.dropdownVisible.set(true);
      component.parent = makeParentRef();
      component.ngOnChanges({
        parent: new SimpleChange(undefined, component.parent, true),
      });

      // Remains true on firstChange
      expect(component.dropdownVisible()).toBe(true);
    });

    it('should hide on onDropdownHide', () => {
      component.dropdownVisible.set(true);
      component.onDropdownHide();

      expect(component.dropdownVisible()).toBe(false);
    });
  });

  describe('Helper methods', () => {
    it('getTypeIcon should return correct icon for each type', () => {
      expect(component.getTypeIcon('epic')).toBe('pi pi-bolt');
      expect(component.getTypeIcon('story')).toBe('pi pi-book');
      expect(component.getTypeIcon('task')).toBe('pi pi-check-circle');
      expect(component.getTypeIcon('subtask')).toBe('pi pi-minus-circle');
    });

    it('getTypeColor should return correct color for each type', () => {
      expect(component.getTypeColor('epic')).toBe('#8B5CF6');
      expect(component.getTypeColor('story')).toBe('#3B82F6');
      expect(component.getTypeColor('task')).toBe('#10B981');
      expect(component.getTypeColor('subtask')).toBe('#6B7280');
    });
  });
});
