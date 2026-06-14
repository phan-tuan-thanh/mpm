/**
 * Unit tests for SubItemTreeComponent
 *
 * Tests: expand/collapse, flat node computation, drag helpers,
 * priority icons, initials, and view-icon click.
 *
 * Uses direct class instantiation with a mock ElementRef.
 * Pointer-event drag flow requires a live DOM and is covered by e2e tests.
 */

jest.mock('primeng/tooltip', () => ({ Tooltip: class {} }));

import { ElementRef, SimpleChange, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SubItemTreeComponent } from './sub-item-tree.component';
import { ProjectStore } from '../../../../../projects/state/project.store';
import type { SubItemTreeNode } from '@mpm/shared-types';

describe('SubItemTreeComponent', () => {
  let component: SubItemTreeComponent;
  let mockNativeEl: HTMLElement;

  function makeNode(overrides: Partial<SubItemTreeNode> = {}): SubItemTreeNode {
    return {
      id: 'node-1',
      taskId: 'PROJ-1',
      title: 'Test task',
      type: 'task',
      priority: 'medium',
      stateId: 'state-1',
      state: { id: 'state-1', name: 'Todo', colorLight: '#3B82F6', colorDark: '#3B82F6', group: 'unstarted' },
      assignees: [],
      dueDate: null,
      children: [],
      childrenCount: 0,
      doneCount: 0,
      expanded: true,
      ...overrides,
    };
  }

  /** Helper: set items and trigger ngOnChanges (mimics Angular's change detection) */
  function setItems(items: SubItemTreeNode[]): void {
    component.items = items;
    component.ngOnChanges({
      items: new SimpleChange([], items, false),
    });
  }

  beforeEach(() => {
    mockNativeEl = document.createElement('div');
    const mockElRef = { nativeElement: mockNativeEl } as ElementRef<HTMLElement>;
    TestBed.configureTestingModule({
      providers: [
        SubItemTreeComponent,
        { provide: ElementRef, useValue: mockElRef },
        { provide: ProjectStore, useValue: { projectLanguage: signal('vi') } },
      ],
    });
    component = TestBed.inject(SubItemTreeComponent);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Default values ───────────────────────────────────────────────────────

  describe('default values', () => {
    it('should default items to empty array', () => {
      expect(component.items).toEqual([]);
    });

    it('should have maxDepth of 5', () => {
      expect(component.maxDepth).toBe(5);
    });

    it('should have indentPx of 20', () => {
      expect(component.indentPx).toBe(20);
    });

    it('should start with empty flatNodes', () => {
      expect(component.flatNodes()).toEqual([]);
    });
  });

  // ─── flatNodes computation ────────────────────────────────────────────────

  describe('flatNodes', () => {
    it('should return root-level nodes at depth 0', () => {
      const a = makeNode({ id: 'a', taskId: 'P-1' });
      const b = makeNode({ id: 'b', taskId: 'P-2' });
      setItems([a, b]);

      const flat = component.flatNodes();
      expect(flat).toHaveLength(2);
      expect(flat[0]).toMatchObject({ depth: 0, parentId: null });
      expect(flat[1]).toMatchObject({ depth: 0, parentId: null });
    });

    it('should flatten children at depth 1 when parent is expanded', () => {
      const child = makeNode({ id: 'child' });
      const parent = makeNode({ id: 'parent', children: [child] });
      setItems([parent]);
      component.expandAll();

      const flat = component.flatNodes();
      expect(flat).toHaveLength(2);
      expect(flat[0]).toMatchObject({ depth: 0, parentId: null });
      expect(flat[1]).toMatchObject({ depth: 1, parentId: 'parent' });
    });

    it('should not include children of collapsed nodes', () => {
      const child = makeNode({ id: 'child' });
      const parent = makeNode({ id: 'parent', children: [child] });
      setItems([parent]);
      component.expandAll();
      expect(component.flatNodes()).toHaveLength(2);

      component.collapseAll();
      const flat = component.flatNodes();
      expect(flat).toHaveLength(1);
      expect(flat[0].node.id).toBe('parent');
    });

    it('should handle deeply nested structure', () => {
      const gc = makeNode({ id: 'gc' });
      const child = makeNode({ id: 'child', children: [gc] });
      const root = makeNode({ id: 'root', children: [child] });
      setItems([root]);
      component.expandAll();

      const flat = component.flatNodes();
      expect(flat).toHaveLength(3);
      expect(flat[2]).toMatchObject({ depth: 2, parentId: 'child' });
    });
  });

  // ─── Expand / Collapse ────────────────────────────────────────────────────

  describe('expand/collapse', () => {
    it('should start with all nodes collapsed by default', () => {
      const parent = makeNode({ id: 'p', children: [makeNode({ id: 'c' })] });
      setItems([parent]);

      expect(component.isExpanded('p')).toBe(false);
    });

    it('should expand on first toggleExpand call when collapsed', () => {
      const parent = makeNode({ id: 'p', children: [makeNode({ id: 'c' })] });
      setItems([parent]);

      component.toggleExpand('p');
      expect(component.isExpanded('p')).toBe(true);
    });

    it('should collapse again on second toggleExpand call', () => {
      const parent = makeNode({ id: 'p', children: [makeNode({ id: 'c' })] });
      setItems([parent]);

      component.toggleExpand('p');
      component.toggleExpand('p');
      expect(component.isExpanded('p')).toBe(false);
    });

    it('should not expand leaf nodes', () => {
      const leaf = makeNode({ id: 'leaf', children: [] });
      setItems([leaf]);

      expect(component.isExpanded('leaf')).toBe(false);
    });

    it('should not expand nodes at all depths by default', () => {
      const gc = makeNode({ id: 'gc', children: [makeNode({ id: 'ggc' })] });
      const child = makeNode({ id: 'child', children: [gc] });
      const root = makeNode({ id: 'root', children: [child] });
      setItems([root]);

      expect(component.isExpanded('root')).toBe(false);
      expect(component.isExpanded('child')).toBe(false);
      expect(component.isExpanded('gc')).toBe(false);
    });

    it('should expand all nodes with children when expandAll is called', () => {
      const gc = makeNode({ id: 'gc', children: [makeNode({ id: 'ggc' })] });
      const child = makeNode({ id: 'child', children: [gc] });
      const root = makeNode({ id: 'root', children: [child] });
      setItems([root]);

      component.collapseAll();
      expect(component.isExpanded('root')).toBe(false);
      expect(component.isExpanded('child')).toBe(false);

      component.expandAll();
      expect(component.isExpanded('root')).toBe(true);
      expect(component.isExpanded('child')).toBe(true);
      expect(component.isExpanded('gc')).toBe(true);
    });

    it('should collapse all nodes when collapseAll is called', () => {
      const child = makeNode({ id: 'child', children: [makeNode({ id: 'gc' })] });
      const root = makeNode({ id: 'root', children: [child] });
      setItems([root]);

      component.expandAll();
      expect(component.isExpanded('root')).toBe(true);
      expect(component.isExpanded('child')).toBe(true);

      component.collapseAll();
      expect(component.isExpanded('root')).toBe(false);
      expect(component.isExpanded('child')).toBe(false);
    });
  });

  // ─── View icon click ──────────────────────────────────────────────────────

  describe('onViewClick', () => {
    it('should emit taskId via itemClicked', () => {
      const spy = jest.spyOn(component.itemClicked, 'emit');
      const node = makeNode({ taskId: 'PROJ-42' });
      const event = new MouseEvent('click');
      jest.spyOn(event, 'stopPropagation');

      component.onViewClick(node, event);

      expect(spy).toHaveBeenCalledWith('PROJ-42');
    });

    it('should emit exactly once per click', () => {
      const spy = jest.spyOn(component.itemClicked, 'emit');
      const node = makeNode({ taskId: 'PROJ-1' });
      const event = new MouseEvent('click');

      component.onViewClick(node, event);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Row drag start (threshold-based) ────────────────────────────────────

  describe('onRowPointerDown', () => {
    function makePointerEvent(target: HTMLElement, clientX = 100, clientY = 50): PointerEvent {
      return { target, clientX, clientY } as unknown as PointerEvent;
    }

    it('should not start drag when target is a button', () => {
      const node = makeNode({ id: 'n1' });
      const btn = document.createElement('button');
      mockNativeEl.appendChild(btn);

      component.onRowPointerDown(node, makePointerEvent(btn));

      expect(component.isDragging()).toBe(false);
      expect((component as any).pendingDrag).toBeNull();
    });

    it('should record pendingDrag when target is not a button', () => {
      const node = makeNode({ id: 'n1' });
      const div = document.createElement('div');

      component.onRowPointerDown(node, makePointerEvent(div, 100, 50));

      expect((component as any).pendingDrag).toMatchObject({ startX: 100, startY: 50 });
      // Cleanup listeners added in test
      component.ngOnDestroy();
    });
  });

  // ─── Drop indicator helpers ────────────────────────────────────────────────

  describe('drop indicator helpers', () => {
    it('isDropBefore returns true only for the matching nodeId', () => {
      (component as any).dropTarget.set({ type: 'before', nodeId: 'abc' });
      expect(component.isDropBefore('abc')).toBe(true);
      expect(component.isDropBefore('xyz')).toBe(false);
    });

    it('isDropChild returns true only for the matching nodeId', () => {
      (component as any).dropTarget.set({ type: 'child', nodeId: 'abc' });
      expect(component.isDropChild('abc')).toBe(true);
      expect(component.isDropChild('xyz')).toBe(false);
    });

    it('isDropEnd returns true when target is end', () => {
      (component as any).dropTarget.set({ type: 'end' });
      expect(component.isDropEnd()).toBe(true);
    });

    it('isDropEnd returns false when target is before/child', () => {
      (component as any).dropTarget.set({ type: 'before', nodeId: 'x' });
      expect(component.isDropEnd()).toBe(false);
    });

    it('all indicators return false when dropTarget is null', () => {
      (component as any).dropTarget.set(null);
      expect(component.isDropBefore('x')).toBe(false);
      expect(component.isDropChild('x')).toBe(false);
      expect(component.isDropEnd()).toBe(false);
    });
  });

  // ─── getInitial ───────────────────────────────────────────────────────────

  describe('getInitial', () => {
    it('should return uppercase first letter', () => {
      expect(component.getInitial('Nguyễn Văn A')).toBe('N');
    });

    it('should return "?" for empty string', () => {
      expect(component.getInitial('')).toBe('?');
    });

    it('should uppercase lowercase first letter', () => {
      expect(component.getInitial('john')).toBe('J');
    });
  });

  // ─── getPriorityIconClass ─────────────────────────────────────────────────

  describe('getPriorityIconClass', () => {
    it('urgent → red flag', () => {
      const cls = component.getPriorityIconClass('urgent');
      expect(cls).toContain('text-red-500');
      expect(cls).toContain('pi-flag');
    });

    it('high → orange flag', () => {
      const cls = component.getPriorityIconClass('high');
      expect(cls).toContain('text-orange-500');
      expect(cls).toContain('pi-flag');
    });

    it('medium → yellow flag', () => {
      const cls = component.getPriorityIconClass('medium');
      expect(cls).toContain('text-yellow-500');
      expect(cls).toContain('pi-flag');
    });

    it('low → blue flag', () => {
      const cls = component.getPriorityIconClass('low');
      expect(cls).toContain('text-blue-400');
      expect(cls).toContain('pi-flag');
    });

    it('none/unknown → gray flag', () => {
      const cls = component.getPriorityIconClass('none');
      expect(cls).toContain('text-gray-300');
      expect(cls).toContain('pi-flag');
    });
  });

  // ─── getPriorityLabel ─────────────────────────────────────────────────────

  describe('getPriorityLabel', () => {
    it('should return Vietnamese labels', () => {
      expect(component.getPriorityLabel('urgent')).toBe('Khẩn cấp');
      expect(component.getPriorityLabel('high')).toBe('Cao');
      expect(component.getPriorityLabel('medium')).toBe('Trung bình');
      expect(component.getPriorityLabel('low')).toBe('Thấp');
      expect(component.getPriorityLabel('none')).toBe('Không');
    });
  });

  // ─── Outputs ──────────────────────────────────────────────────────────────

  describe('component outputs', () => {
    it('should have itemClicked EventEmitter', () => {
      expect(component.itemClicked).toBeDefined();
      expect(typeof component.itemClicked.emit).toBe('function');
    });

    it('should have saveRequested EventEmitter', () => {
      expect(component.saveRequested).toBeDefined();
      expect(typeof component.saveRequested.emit).toBe('function');
    });

    it('should not have a moved EventEmitter (removed in favour of saveRequested)', () => {
      expect((component as any).moved).toBeUndefined();
    });
  });

  // ─── Save / Cancel pending changes ───────────────────────────────────────

  describe('save / cancel pending changes', () => {
    it('hasPendingChanges is false initially', () => {
      expect(component.hasPendingChanges()).toBe(false);
    });

    it('onCancelChanges resets _items to parent items and clears pending', () => {
      const items = [makeNode({ id: 'a' }), makeNode({ id: 'b' })];
      setItems(items);
      // Simulate an optimistic move
      (component as any).pendingMoves.set([{ taskId: 'a', newParentId: 'b', newIndex: 0 }]);
      (component as any)._items.set([makeNode({ id: 'b', children: [makeNode({ id: 'a' })] })]);

      component.onCancelChanges();

      expect(component.hasPendingChanges()).toBe(false);
      expect((component as any)._items()).toEqual(items);
    });

    it('onSaveChanges emits saveRequested with moves + parentOrders and clears pending', () => {
      const spy = jest.spyOn(component.saveRequested, 'emit');
      const moves = [{ taskId: 'x', newParentId: null, oldParentId: null }];
      (component as any).pendingMoves.set(moves);

      component.onSaveChanges();

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ moves }));
      expect(component.hasPendingChanges()).toBe(false);
    });

    it('onSaveChanges does nothing when there are no pending moves', () => {
      const spy = jest.spyOn(component.saveRequested, 'emit');

      component.onSaveChanges();

      expect(spy).not.toHaveBeenCalled();
    });

    it('ngOnChanges clears pending moves when items input changes', () => {
      (component as any).pendingMoves.set([{ taskId: 'x', newParentId: null, newIndex: 0 }]);

      setItems([makeNode({ id: 'fresh' })]);

      expect(component.hasPendingChanges()).toBe(false);
    });
  });

  // ─── ngOnDestroy cleanup ──────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    it('should not throw when destroyed without an active drag', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  // ─── Type helper methods ──────────────────────────────────────────────────

  describe('type helpers', () => {
    it('should return correct icon class for each TaskType', () => {
      expect(component.typeIcon('epic')).toBe('pi pi-bolt');
      expect(component.typeIcon('story')).toBe('pi pi-book');
      expect(component.typeIcon('task')).toBe('pi pi-check-circle');
      expect(component.typeIcon('bug')).toBe('pi pi-ticket');
      expect(component.typeIcon('invalid' as any)).toBe('pi pi-circle');
    });

    it('should return correct color for each TaskType', () => {
      expect(component.typeColor('epic')).toBe('#8B5CF6');
      expect(component.typeColor('story')).toBe('#3B82F6');
      expect(component.typeColor('task')).toBe('#10B981');
      expect(component.typeColor('bug')).toBe('#EF4444');
      expect(component.typeColor('invalid' as any)).toBe('#9CA3AF');
    });
  });
});
