/**
 * Mock Angular common/forms and PrimeNG modules to avoid JIT compilation issues in jsdom.
 * These modules are not needed for unit-testing component logic directly.
 */
jest.mock('@angular/common', () => ({ CommonModule: {} }));
jest.mock('@angular/forms', () => ({ FormsModule: {} }));
jest.mock('primeng/popover', () => ({ PopoverModule: {} }));
jest.mock('primeng/datepicker', () => ({ DatePickerModule: {} }));
jest.mock('primeng/button', () => ({ ButtonModule: {} }));
jest.mock('primeng/inputtext', () => ({ InputTextModule: {} }));
jest.mock('primeng/tooltip', () => ({ TooltipModule: {} }));

import { SubItemQuickToolbarComponent } from './sub-item-quick-toolbar.component';
import type { MemberResponse, TaskPriority } from '@mpm/shared-types';

/**
 * Unit tests for SubItemQuickToolbarComponent
 *
 * Tests component logic directly without TestBed since this is a standalone
 * component with simple I/O, signals, and no complex DI dependencies.
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 */
describe('SubItemQuickToolbarComponent', () => {
  let component: SubItemQuickToolbarComponent;

  const mockMembers: MemberResponse[] = [
    {
      userId: 'user-1',
      displayName: 'Nguyễn Văn A',
      email: 'a@example.com',
      avatarUrl: null,
      projectRole: 'Developer',
      joinedAt: new Date(),
    },
    {
      userId: 'user-2',
      displayName: 'Trần Thị B',
      email: 'b@example.com',
      avatarUrl: 'https://example.com/avatar.png',
      projectRole: 'Scrum_Master',
      joinedAt: new Date(),
    },
    {
      userId: 'user-3',
      displayName: 'Lê Văn C',
      email: 'c@example.com',
      avatarUrl: null,
      projectRole: 'Developer',
      joinedAt: new Date(),
    },
  ];

  beforeEach(() => {
    component = new SubItemQuickToolbarComponent();
    component.members = mockMembers;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('default state', () => {
    it('should have no assignee selected by default', () => {
      expect(component['selectedAssigneeId']()).toBeNull();
    });

    it('should have priority "none" by default', () => {
      expect(component['selectedPriority']()).toBe('none');
    });

    it('should have no due date selected by default', () => {
      expect(component['selectedDueDate']()).toBeNull();
    });

    it('should have empty assignee search by default', () => {
      expect(component['assigneeSearch']()).toBe('');
    });
  });

  describe('assignee selection (Requirement 7.1, 7.2)', () => {
    it('should emit userId when assignee is selected', () => {
      const spy = jest.spyOn(component.assigneeSelected, 'emit');
      component['onAssigneeSelect']('user-1');
      expect(spy).toHaveBeenCalledWith('user-1');
    });

    it('should update internal state when assignee is selected', () => {
      component['onAssigneeSelect']('user-2');
      expect(component['selectedAssigneeId']()).toBe('user-2');
    });

    it('should toggle assignee off when clicking same user', () => {
      const spy = jest.spyOn(component.assigneeSelected, 'emit');
      component['onAssigneeSelect']('user-1');
      component['onAssigneeSelect']('user-1');
      expect(component['selectedAssigneeId']()).toBeNull();
      expect(spy).toHaveBeenLastCalledWith(null);
    });

    it('should emit null when assignee is cleared', () => {
      const spy = jest.spyOn(component.assigneeSelected, 'emit');
      component['onAssigneeSelect']('user-1');
      component['onAssigneeSelect'](null);
      expect(spy).toHaveBeenLastCalledWith(null);
      expect(component['selectedAssigneeId']()).toBeNull();
    });

    it('should return correct initial for selected member (Requirement 7.2)', () => {
      component['onAssigneeSelect']('user-1');
      expect(component['getSelectedMemberInitial']()).toBe('N');
    });

    it('should return "?" when no assignee selected', () => {
      expect(component['getSelectedMemberInitial']()).toBe('?');
    });

    it('should return "?" for unknown userId', () => {
      component['selectedAssigneeId'].set('unknown-id');
      expect(component['getSelectedMemberInitial']()).toBe('?');
    });
  });

  describe('assignee search filtering', () => {
    it('should return all members when search is empty', () => {
      expect(component['filteredMembers']()).toHaveLength(3);
    });

    it('should filter members by display name', () => {
      component['assigneeSearch'].set('Nguyễn');
      expect(component['filteredMembers']()).toHaveLength(1);
      expect(component['filteredMembers']()[0].userId).toBe('user-1');
    });

    it('should filter members by email', () => {
      component['assigneeSearch'].set('b@example');
      expect(component['filteredMembers']()).toHaveLength(1);
      expect(component['filteredMembers']()[0].userId).toBe('user-2');
    });

    it('should be case-insensitive', () => {
      component['assigneeSearch'].set('nguyễn');
      expect(component['filteredMembers']()).toHaveLength(1);
    });

    it('should return empty when no match', () => {
      component['assigneeSearch'].set('zzz');
      expect(component['filteredMembers']()).toHaveLength(0);
    });
  });

  describe('priority selection (Requirement 7.1, 7.3)', () => {
    it('should emit priority when selected', () => {
      const spy = jest.spyOn(component.prioritySelected, 'emit');
      component['onPrioritySelect']('high');
      expect(spy).toHaveBeenCalledWith('high');
    });

    it('should update internal state when priority is selected', () => {
      component['onPrioritySelect']('urgent');
      expect(component['selectedPriority']()).toBe('urgent');
    });

    it('should return correct config for selected priority (Requirement 7.3)', () => {
      component['onPrioritySelect']('urgent');
      const config = component['selectedPriorityConfig']();
      expect(config.value).toBe('urgent');
      expect(config.color).toBe('#EF4444');
      expect(config.icon).toBe('pi pi-flag');
    });

    it('should return "none" config by default', () => {
      const config = component['selectedPriorityConfig']();
      expect(config.value).toBe('none');
      expect(config.color).toBe('#9CA3AF');
    });

    const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none'];
    priorities.forEach(priority => {
      it(`should handle ${priority} priority selection`, () => {
        component['onPrioritySelect'](priority);
        expect(component['selectedPriority']()).toBe(priority);
      });
    });
  });

  describe('due date selection (Requirement 7.1)', () => {
    it('should emit ISO date string when date is selected', () => {
      const spy = jest.spyOn(component.dueDateSelected, 'emit');
      const testDate = new Date(2026, 5, 15); // June 15, 2026
      component['onDueDateSelect'](testDate);
      expect(spy).toHaveBeenCalledWith('2026-06-15');
    });

    it('should update internal state when date is selected', () => {
      const testDate = new Date(2026, 11, 25); // Dec 25, 2026
      component['onDueDateSelect'](testDate);
      expect(component['selectedDueDate']()).toBe('2026-12-25');
    });

    it('should emit null when date is cleared', () => {
      const spy = jest.spyOn(component.dueDateSelected, 'emit');
      component['onDueDateSelect'](new Date(2026, 5, 15));
      component['onDueDateClear']();
      expect(spy).toHaveBeenLastCalledWith(null);
      expect(component['selectedDueDate']()).toBeNull();
    });

    it('should reset dueDateModel when cleared', () => {
      component['dueDateModel'] = new Date();
      component['onDueDateClear']();
      expect(component['dueDateModel']).toBeNull();
    });
  });

  describe('formatShortDate', () => {
    it('should format ISO date as dd/MM', () => {
      expect(component['formatShortDate']('2026-06-15')).toBe('15/06');
    });

    it('should format single-digit day/month with leading zeros', () => {
      expect(component['formatShortDate']('2026-01-05')).toBe('05/01');
    });

    it('should return input as-is if not valid ISO date', () => {
      expect(component['formatShortDate']('invalid')).toBe('invalid');
    });
  });

  describe('reset()', () => {
    it('should reset assignee to null', () => {
      component['onAssigneeSelect']('user-1');
      component.reset();
      expect(component['selectedAssigneeId']()).toBeNull();
    });

    it('should reset priority to "none"', () => {
      component['onPrioritySelect']('high');
      component.reset();
      expect(component['selectedPriority']()).toBe('none');
    });

    it('should reset due date to null', () => {
      component['onDueDateSelect'](new Date(2026, 5, 15));
      component.reset();
      expect(component['selectedDueDate']()).toBeNull();
    });

    it('should reset dueDateModel to null', () => {
      component['dueDateModel'] = new Date();
      component.reset();
      expect(component['dueDateModel']).toBeNull();
    });

    it('should reset assignee search to empty', () => {
      component['assigneeSearch'].set('test');
      component.reset();
      expect(component['assigneeSearch']()).toBe('');
    });
  });

  describe('component outputs', () => {
    it('should have assigneeSelected EventEmitter', () => {
      expect(component.assigneeSelected).toBeDefined();
      expect(component.assigneeSelected.emit).toBeDefined();
    });

    it('should have prioritySelected EventEmitter', () => {
      expect(component.prioritySelected).toBeDefined();
      expect(component.prioritySelected.emit).toBeDefined();
    });

    it('should have dueDateSelected EventEmitter', () => {
      expect(component.dueDateSelected).toBeDefined();
      expect(component.dueDateSelected.emit).toBeDefined();
    });
  });
});
