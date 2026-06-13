/**
 * Mock Angular and PrimeNG modules to avoid JIT compilation issues in jsdom.
 * These modules are not needed for unit-testing component logic directly.
 */
jest.mock('@angular/common', () => ({ NgTemplateOutlet: {} }));
jest.mock('@angular/forms', () => ({ FormsModule: {} }));
jest.mock('@angular/cdk/drag-drop', () => ({
  CdkDrag: {},
  CdkDragDrop: {},
  CdkDragHandle: {},
  CdkDragPlaceholder: {},
  CdkDragPreview: {},
  CdkDropList: {},
  moveItemInArray: jest.fn(),
}));
jest.mock('primeng/popover', () => ({ PopoverModule: {} }));
jest.mock('primeng/datepicker', () => ({ DatePickerModule: {} }));
jest.mock('primeng/button', () => ({ ButtonModule: {} }));
jest.mock('primeng/inputtext', () => ({ InputTextModule: {} }));
jest.mock('primeng/tooltip', () => ({ TooltipModule: {}, Tooltip: {} }));

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SubItemsSectionComponent } from './sub-items-section.component';
import { ProjectStore } from '../../../../../projects/state/project.store';
import type { SubItemTreeNode, CreateSubItemDto, TaskPriority } from '@mpm/shared-types';

/**
 * Unit tests for SubItemsSectionComponent
 *
 * Tests the container component's logic: add mode toggling, form submission,
 * dismissal, empty/whitespace validation, and toolbar integration.
 *
 * Validates: Requirements 4.1, 4.6, 4.8, 4.9, 7.4, 7.5, 7.6
 */
describe('SubItemsSectionComponent', () => {
  let component: SubItemsSectionComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SubItemsSectionComponent,
        { provide: ProjectStore, useValue: { projectLanguage: signal('vi') } },
      ],
    });
    component = TestBed.inject(SubItemsSectionComponent);
    component.taskId = 'task-123';
    component.projectId = 'proj-456';
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('default state', () => {
    it('should not be in adding mode by default', () => {
      expect(component.isAddingMode()).toBe(false);
    });

    it('should have empty items by default', () => {
      expect(component.items).toEqual([]);
    });

    it('should have totalCount 0 by default', () => {
      expect(component.totalCount).toBe(0);
    });

    it('should have doneCount 0 by default', () => {
      expect(component.doneCount).toBe(0);
    });

    it('should have empty members by default', () => {
      expect(component.members).toEqual([]);
    });
  });

  describe('enterAddMode (Requirement 4.6)', () => {
    it('should set isAddingMode to true', () => {
      component.enterAddMode();
      expect(component.isAddingMode()).toBe(true);
    });
  });

  describe('onDismiss (Requirement 4.6 - Escape to dismiss)', () => {
    it('should set isAddingMode to false', () => {
      component.enterAddMode();
      component.onDismiss();
      expect(component.isAddingMode()).toBe(false);
    });

    it('should clear newTitle on dismiss', () => {
      component.enterAddMode();
      component['newTitle'] = 'Some text';
      component.onDismiss();
      expect(component['newTitle']).toBe('');
    });
  });

  describe('onSubmit (Requirements 4.9, 7.4, 7.5)', () => {
    it('should not emit when title is empty (Requirement 7.5)', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = '';
      component.onSubmit();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when title is only whitespace (Requirement 4.9)', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = '   ';
      component.onSubmit();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should emit CreateSubItemDto with trimmed title and parentId (Requirement 7.4)', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = '  New Sub Item  ';
      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Sub Item',
          parentId: 'task-123',
        }),
      );
    });

    it('should include assigneeIds when assignee is selected (Requirement 7.4)', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = 'Test item';
      component.onAssigneeSelected('user-abc');
      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          assigneeIds: ['user-abc'],
        }),
      );
    });

    it('should not include assigneeIds when no assignee selected', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = 'Test item';
      component.onSubmit();

      const dto = spy.mock.calls[0][0] as CreateSubItemDto;
      expect(dto.assigneeIds).toBeUndefined();
    });

    it('should include priority when priority is not none (Requirement 7.4)', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = 'Test item';
      component.onPrioritySelected('high');
      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
        }),
      );
    });

    it('should not include priority when priority is none', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = 'Test item';
      component.onSubmit();

      const dto = spy.mock.calls[0][0] as CreateSubItemDto;
      expect(dto.priority).toBeUndefined();
    });

    it('should include dueDate when set (Requirement 7.4)', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = 'Test item';
      component.onDueDateSelected('2026-06-15');
      component.onSubmit();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: '2026-06-15',
        }),
      );
    });

    it('should not include dueDate when null', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');
      component.enterAddMode();
      component['newTitle'] = 'Test item';
      component.onSubmit();

      const dto = spy.mock.calls[0][0] as CreateSubItemDto;
      expect(dto.dueDate).toBeUndefined();
    });

    it('should clear newTitle after successful submit (Requirement 7.4)', () => {
      component.enterAddMode();
      component['newTitle'] = 'Test item';
      component.onSubmit();
      expect(component['newTitle']).toBe('');
    });

    it('should reset toolbar selections after successful submit (Requirement 7.4)', () => {
      component.enterAddMode();
      component['newTitle'] = 'Test item';
      component.onAssigneeSelected('user-abc');
      component.onPrioritySelected('high');
      component.onDueDateSelected('2026-06-15');
      component.onSubmit();

      // Verify internal tracking is reset
      expect(component['selectedAssigneeId']).toBeNull();
      expect(component['selectedPriority']).toBe('none');
      expect(component['selectedDueDate']).toBeNull();
    });

    it('should keep toolbar state when title is empty (Requirement 7.5)', () => {
      component.enterAddMode();
      component['newTitle'] = '   ';
      component.onAssigneeSelected('user-abc');
      component.onPrioritySelected('high');
      component.onSubmit();

      // Selections should be preserved
      expect(component['selectedAssigneeId']).toBe('user-abc');
      expect(component['selectedPriority']).toBe('high');
    });
  });

  describe('toolbar event handlers', () => {
    it('should track assignee selection', () => {
      component.onAssigneeSelected('user-1');
      expect(component['selectedAssigneeId']).toBe('user-1');
    });

    it('should track assignee deselection (null)', () => {
      component.onAssigneeSelected('user-1');
      component.onAssigneeSelected(null);
      expect(component['selectedAssigneeId']).toBeNull();
    });

    it('should track priority selection', () => {
      component.onPrioritySelected('urgent');
      expect(component['selectedPriority']).toBe('urgent');
    });

    it('should track due date selection', () => {
      component.onDueDateSelected('2026-12-25');
      expect(component['selectedDueDate']).toBe('2026-12-25');
    });

    it('should track due date clear', () => {
      component.onDueDateSelected('2026-12-25');
      component.onDueDateSelected(null);
      expect(component['selectedDueDate']).toBeNull();
    });
  });

  describe('preserveStateForRetry (Requirement 7.6)', () => {
    it('should restore title for retry', () => {
      component.preserveStateForRetry('Failed item title');
      expect(component['newTitle']).toBe('Failed item title');
    });
  });

  describe('output events', () => {
    it('should have createSubItem EventEmitter', () => {
      expect(component.createSubItem).toBeDefined();
      expect(component.createSubItem.emit).toBeDefined();
    });

    it('should have subItemClicked EventEmitter', () => {
      expect(component.subItemClicked).toBeDefined();
      expect(component.subItemClicked.emit).toBeDefined();
    });

    it('should have saveRequested EventEmitter', () => {
      expect(component.saveRequested).toBeDefined();
      expect(typeof component.saveRequested.emit).toBe('function');
    });
  });

  describe('full creation flow with all toolbar properties', () => {
    it('should build complete DTO with all optional fields set', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');

      component.enterAddMode();
      component['newTitle'] = 'Complete sub-item';
      component.onAssigneeSelected('user-xyz');
      component.onPrioritySelected('urgent');
      component.onDueDateSelected('2026-07-01');
      component.onSubmit();

      const expectedDto: CreateSubItemDto = {
        title: 'Complete sub-item',
        parentId: 'task-123',
        assigneeIds: ['user-xyz'],
        priority: 'urgent',
        dueDate: '2026-07-01',
      };

      expect(spy).toHaveBeenCalledWith(expectedDto);
    });

    it('should build minimal DTO with only required fields', () => {
      const spy = jest.spyOn(component.createSubItem, 'emit');

      component.enterAddMode();
      component['newTitle'] = 'Minimal item';
      component.onSubmit();

      const expectedDto: CreateSubItemDto = {
        title: 'Minimal item',
        parentId: 'task-123',
      };

      expect(spy).toHaveBeenCalledWith(expectedDto);
    });
  });
});
