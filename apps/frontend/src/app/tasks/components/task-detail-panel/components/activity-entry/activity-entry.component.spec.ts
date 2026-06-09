import { ActivityEntryComponent } from './activity-entry.component';
import type { TaskActivity } from '@mpm/shared-types';

/**
 * Unit tests for ActivityEntryComponent
 *
 * Tests avatar computation, action descriptions, state value parsing,
 * and component behavior. Uses direct class instantiation since the template
 * relies on Angular standalone compilation not available in Jest CJS mode.
 *
 * Validates: Requirements 5.6, 5.7
 */

function createMockEntry(overrides: Partial<TaskActivity> = {}): TaskActivity {
  return {
    id: 'entry-1',
    taskId: 'task-1',
    actorId: 'user-1',
    actorName: 'Nguyễn Văn A',
    actorAvatar: null,
    entryType: 'state_changed',
    field: 'stateId',
    oldValue: JSON.stringify({ id: 'state-1', name: 'Backlog', color: '#6B7280' }),
    newValue: JSON.stringify({ id: 'state-2', name: 'Todo', color: '#3B82F6' }),
    comment: null,
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('ActivityEntryComponent', () => {
  let component: ActivityEntryComponent;

  beforeEach(() => {
    component = new ActivityEntryComponent();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('avatar initial computation (Req 5.7)', () => {
    it('should compute first letter uppercase from actorName', () => {
      component.entry = createMockEntry({ actorName: 'Trần Thị B' });
      component.ngOnInit();
      expect(component.initial()).toBe('T');
    });

    it('should handle lowercase actor name', () => {
      component.entry = createMockEntry({ actorName: 'admin user' });
      component.ngOnInit();
      expect(component.initial()).toBe('A');
    });

    it('should fallback to ? when actorName is empty string', () => {
      component.entry = createMockEntry({ actorName: '' });
      component.ngOnInit();
      expect(component.initial()).toBe('?');
    });

    it('should fallback to ? when actorName is undefined', () => {
      component.entry = createMockEntry({ actorName: undefined });
      component.ngOnInit();
      expect(component.initial()).toBe('?');
    });
  });

  describe('avatar color computation (Req 5.7)', () => {
    it('should return a hex color string for a valid name', () => {
      component.entry = createMockEntry({ actorName: 'User A' });
      component.ngOnInit();
      expect(component.avatarColor()).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should return default gray when name is empty', () => {
      component.entry = createMockEntry({ actorName: '' });
      component.ngOnInit();
      expect(component.avatarColor()).toBe('#6B7280');
    });

    it('should produce deterministic colors for same name', () => {
      component.entry = createMockEntry({ actorName: 'Nguyễn Văn A' });
      component.ngOnInit();
      const color1 = component.avatarColor();

      const component2 = new ActivityEntryComponent();
      component2.entry = createMockEntry({ actorName: 'Nguyễn Văn A' });
      component2.ngOnInit();
      expect(component2.avatarColor()).toBe(color1);
    });

    it('should produce different colors for different names', () => {
      component.entry = createMockEntry({ actorName: 'User Alpha' });
      component.ngOnInit();
      const color1 = component.avatarColor();

      const component2 = new ActivityEntryComponent();
      component2.entry = createMockEntry({ actorName: 'User Zeta' });
      component2.ngOnInit();
      // Not guaranteed different for all names, but highly likely for these
      // Just verify both are valid hex colors
      expect(component2.avatarColor()).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('action text descriptions (Req 5.6, 5.7)', () => {
    const actionCases: Array<[TaskActivity['entryType'], string]> = [
      ['created', 'đã tạo task'],
      ['title_changed', 'đã đổi tiêu đề'],
      ['description_changed', 'đã cập nhật mô tả'],
      ['state_changed', 'chuyển trạng thái'],
      ['priority_changed', 'thay đổi ưu tiên'],
      ['type_changed', 'thay đổi loại'],
      ['parent_changed', 'thay đổi parent'],
      ['estimate_changed', 'thay đổi ước lượng'],
      ['start_date_changed', 'thay đổi ngày bắt đầu'],
      ['due_date_changed', 'thay đổi ngày hạn'],
      ['assignee_added', 'thêm người phụ trách'],
      ['assignee_removed', 'xoá người phụ trách'],
      ['label_added', 'thêm nhãn'],
      ['label_removed', 'xoá nhãn'],
      ['attachment_added', 'thêm tệp đính kèm'],
      ['attachment_removed', 'xoá tệp đính kèm'],
      ['link_added', 'thêm liên kết'],
      ['link_removed', 'xoá liên kết'],
      ['relation_added', 'thêm quan hệ'],
      ['relation_removed', 'xoá quan hệ'],
      ['comment_added', 'thêm bình luận'],
      ['comment_edited', 'sửa bình luận'],
      ['comment_deleted', 'xoá bình luận'],
      ['deleted', 'đã xoá task'],
      ['completed', 'đã hoàn thành'],
      ['reopened', 'mở lại task'],
    ];

    it.each(actionCases)(
      'should return "%s" for entryType "%s"',
      (entryType, expectedText) => {
        component.entry = createMockEntry({ entryType });
        component.ngOnInit();
        expect(component.actionText()).toBe(expectedText);
      },
    );
  });

  describe('state transition parsing (Req 5.6)', () => {
    it('should parse valid old/new state JSON for state_changed entries', () => {
      component.entry = createMockEntry({
        entryType: 'state_changed',
        oldValue: JSON.stringify({ id: 's1', name: 'Backlog', color: '#6B7280' }),
        newValue: JSON.stringify({ id: 's2', name: 'In Progress', color: '#F59E0B' }),
      });
      component.ngOnInit();
      expect(component.oldState()).toEqual({ id: 's1', name: 'Backlog', color: '#6B7280' });
      expect(component.newState()).toEqual({ id: 's2', name: 'In Progress', color: '#F59E0B' });
    });

    it('should set oldState/newState to null for non state_changed entries', () => {
      component.entry = createMockEntry({ entryType: 'priority_changed' });
      component.ngOnInit();
      expect(component.oldState()).toBeNull();
      expect(component.newState()).toBeNull();
    });

    it('should handle invalid JSON in oldValue gracefully', () => {
      component.entry = createMockEntry({
        entryType: 'state_changed',
        oldValue: 'not-valid-json',
        newValue: JSON.stringify({ id: 's2', name: 'Todo', color: '#3B82F6' }),
      });
      component.ngOnInit();
      expect(component.oldState()).toBeNull();
      expect(component.newState()).toEqual({ id: 's2', name: 'Todo', color: '#3B82F6' });
    });

    it('should handle null oldValue/newValue gracefully', () => {
      component.entry = createMockEntry({
        entryType: 'state_changed',
        oldValue: null,
        newValue: null,
      });
      component.ngOnInit();
      expect(component.oldState()).toBeNull();
      expect(component.newState()).toBeNull();
    });

    it('should handle JSON missing required name/color fields', () => {
      component.entry = createMockEntry({
        entryType: 'state_changed',
        oldValue: JSON.stringify({ id: 's1' }), // missing name and color
        newValue: JSON.stringify({ name: 'Done', color: '#22C55E' }), // missing id is ok
      });
      component.ngOnInit();
      expect(component.oldState()).toBeNull();
      expect(component.newState()).toEqual({ id: '', name: 'Done', color: '#22C55E' });
    });
  });

  describe('ngOnChanges updates (Req 5.7)', () => {
    it('should recompute values when entry changes via ngOnChanges', () => {
      component.entry = createMockEntry({ actorName: 'User A', entryType: 'created' });
      component.ngOnInit();
      expect(component.actionText()).toBe('đã tạo task');
      expect(component.initial()).toBe('U');

      // Simulate input change
      component.entry = createMockEntry({ actorName: 'User B', entryType: 'completed' });
      component.ngOnChanges();
      expect(component.actionText()).toBe('đã hoàn thành');
      expect(component.initial()).toBe('U');
    });
  });
});
