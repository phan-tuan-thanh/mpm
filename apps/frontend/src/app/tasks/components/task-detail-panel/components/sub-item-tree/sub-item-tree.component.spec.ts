/**
 * Unit tests for SubItemTreeComponent
 *
 * Tests component logic: expand/collapse, drag-drop reorder,
 * priority icons, initials, and tree depth constraints.
 *
 * Uses direct class instantiation (same pattern as CollapsibleSectionComponent tests)
 * with module mocks to avoid JIT compilation issues.
 *
 * Validates: Requirements 4.3, 4.4, 4.5, 4.7
 */

// Mock Angular modules that require JIT compilation
jest.mock('@angular/common', () => ({ NgTemplateOutlet: class {} }));
jest.mock('primeng/tooltip', () => ({ Tooltip: class {} }));
jest.mock('@angular/cdk/drag-drop', () => ({
  CdkDrag: class {},
  CdkDragHandle: class {},
  CdkDragPlaceholder: class {},
  CdkDragPreview: class {},
  CdkDropList: class {},
  moveItemInArray: jest.fn((array: unknown[], previousIndex: number, currentIndex: number) => {
    const item = array[previousIndex];
    array.splice(previousIndex, 1);
    array.splice(currentIndex, 0, item);
  }),
}));

import { SubItemTreeComponent } from './sub-item-tree.component';
import type { SubItemTreeNode } from '@mpm/shared-types';

describe('SubItemTreeComponent', () => {
  let component: SubItemTreeComponent;

  /** Helper to create a minimal SubItemTreeNode */
  function makeNode(overrides: Partial<SubItemTreeNode> = {}): SubItemTreeNode {
    return {
      id: 'node-1',
      taskId: 'PROJ-1',
      title: 'Test task',
      type: 'task',
      priority: 'medium',
      stateId: 'state-1',
      state: { id: 'state-1', name: 'Todo', color: '#3B82F6', group: 'unstarted' },
      assignees: [],
      dueDate: null,
      children: [],
      childrenCount: 0,
      doneCount: 0,
      expanded: true,
      ...overrides,
    };
  }

  beforeEach(() => {
    component = new SubItemTreeComponent();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should default items to empty array', () => {
      expect(component.items).toEqual([]);
    });

    it('should have maxDepth of 5 (Requirement 4.3)', () => {
      expect(component.maxDepth).toBe(5);
    });

    it('should have indentation of 20px per level', () => {
      expect(component.indentPx).toBe(20);
    });
  });

  describe('expand/collapse (Requirement 4.4)', () => {
    it('should expand all nodes by default when items have children', () => {
      const parent = makeNode({
        id: 'parent-1',
        children: [makeNode({ id: 'child-1' })],
      });
      component.items = [parent];

      // isExpanded triggers lazy initialization
      expect(component.isExpanded('parent-1')).toBe(true);
    });

    it('should collapse a node when toggleExpand is called on expanded node', () => {
      const parent = makeNode({
        id: 'parent-1',
        children: [makeNode({ id: 'child-1' })],
      });
      component.items = [parent];

      // Initialize
      component.isExpanded('parent-1');

      // Toggle to collapse
      component.toggleExpand('parent-1');
      expect(component.isExpanded('parent-1')).toBe(false);
    });

    it('should expand a node when toggleExpand is called on collapsed node', () => {
      const parent = makeNode({
        id: 'parent-1',
        children: [makeNode({ id: 'child-1' })],
      });
      component.items = [parent];

      // Initialize and collapse
      component.isExpanded('parent-1');
      component.toggleExpand('parent-1');
      expect(component.isExpanded('parent-1')).toBe(false);

      // Toggle again to expand
      component.toggleExpand('parent-1');
      expect(component.isExpanded('parent-1')).toBe(true);
    });

    it('should handle deeply nested nodes as expanded by default', () => {
      const grandchild = makeNode({ id: 'gc-1' });
      const child = makeNode({ id: 'child-1', children: [grandchild] });
      const parent = makeNode({ id: 'parent-1', children: [child] });
      component.items = [parent];

      expect(component.isExpanded('parent-1')).toBe(true);
      expect(component.isExpanded('child-1')).toBe(true);
    });

    it('should not track leaf nodes (no children) in expanded set', () => {
      const leaf = makeNode({ id: 'leaf-1', children: [] });
      component.items = [leaf];

      // Leaf nodes aren't tracked as expanded since they have no children
      expect(component.isExpanded('leaf-1')).toBe(false);
    });

    it('should handle multiple root nodes all expanded', () => {
      const root1 = makeNode({ id: 'root-1', children: [makeNode({ id: 'c1' })] });
      const root2 = makeNode({ id: 'root-2', children: [makeNode({ id: 'c2' })] });
      component.items = [root1, root2];

      expect(component.isExpanded('root-1')).toBe(true);
      expect(component.isExpanded('root-2')).toBe(true);
    });
  });

  describe('onItemClick (Requirement 4.5)', () => {
    it('should emit the taskId when a row is clicked', () => {
      const spy = jest.spyOn(component.itemClicked, 'emit');
      const node = makeNode({ taskId: 'PROJ-42' });

      component.onItemClick(node);

      expect(spy).toHaveBeenCalledWith('PROJ-42');
    });

    it('should emit exactly once per click', () => {
      const spy = jest.spyOn(component.itemClicked, 'emit');
      const node = makeNode({ taskId: 'PROJ-1' });

      component.onItemClick(node);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDrop — drag-and-drop reorder (Requirement 4.7)', () => {
    it('should emit reordered event with taskId and newIndex on valid drop', () => {
      const spy = jest.spyOn(component.reordered, 'emit');
      const nodes = [
        makeNode({ id: 'a', taskId: 'PROJ-1' }),
        makeNode({ id: 'b', taskId: 'PROJ-2' }),
        makeNode({ id: 'c', taskId: 'PROJ-3' }),
      ];

      // Simulate CDK drop event: move index 0 to index 2
      const container = { data: [...nodes] } as any;
      const event = {
        previousIndex: 0,
        currentIndex: 2,
        previousContainer: container,
        container: container,
      } as any;

      component.onDrop(event, 0);

      // After moveItemInArray, node 'a' moves to index 2
      expect(spy).toHaveBeenCalledWith({ taskId: 'a', newIndex: 2 });
    });

    it('should not emit when previousIndex equals currentIndex', () => {
      const spy = jest.spyOn(component.reordered, 'emit');
      const nodes = [makeNode({ id: 'a' }), makeNode({ id: 'b' })];

      const container = { data: [...nodes] } as any;
      const event = {
        previousIndex: 1,
        currentIndex: 1,
        previousContainer: container,
        container: container,
      } as any;

      component.onDrop(event, 0);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when containers differ (cross-level drop)', () => {
      const spy = jest.spyOn(component.reordered, 'emit');
      const nodes = [makeNode({ id: 'a' }), makeNode({ id: 'b' })];

      const container1 = { data: [...nodes] } as any;
      const container2 = { data: [] } as any;
      const event = {
        previousIndex: 0,
        currentIndex: 0,
        previousContainer: container1,
        container: container2,
      } as any;

      component.onDrop(event, 0);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should reorder the array data correctly', () => {
      const nodes = [
        makeNode({ id: 'a' }),
        makeNode({ id: 'b' }),
        makeNode({ id: 'c' }),
      ];

      const container = { data: [...nodes] } as any;
      const event = {
        previousIndex: 2,
        currentIndex: 0,
        previousContainer: container,
        container: container,
      } as any;

      component.onDrop(event, 0);

      // Verify order changed: c moved from index 2 to index 0
      expect(container.data[0].id).toBe('c');
      expect(container.data[1].id).toBe('a');
      expect(container.data[2].id).toBe('b');
    });
  });

  describe('getInitial (Requirement 4.5 — assignee avatar)', () => {
    it('should return uppercase first letter of name', () => {
      expect(component.getInitial('Nguyễn Văn A')).toBe('N');
    });

    it('should return "?" for empty string', () => {
      expect(component.getInitial('')).toBe('?');
    });

    it('should handle single character names', () => {
      expect(component.getInitial('a')).toBe('A');
    });

    it('should handle names starting with lowercase', () => {
      expect(component.getInitial('john')).toBe('J');
    });
  });

  describe('getPriorityIconClass (Requirement 4.5 — priority icon)', () => {
    it('should return red exclamation for urgent', () => {
      const cls = component.getPriorityIconClass('urgent');
      expect(cls).toContain('text-red-500');
      expect(cls).toContain('pi-exclamation-circle');
    });

    it('should return orange arrow-up for high', () => {
      const cls = component.getPriorityIconClass('high');
      expect(cls).toContain('text-orange-500');
      expect(cls).toContain('pi-arrow-up');
    });

    it('should return yellow minus for medium', () => {
      const cls = component.getPriorityIconClass('medium');
      expect(cls).toContain('text-yellow-500');
      expect(cls).toContain('pi-minus');
    });

    it('should return blue arrow-down for low', () => {
      const cls = component.getPriorityIconClass('low');
      expect(cls).toContain('text-blue-400');
      expect(cls).toContain('pi-arrow-down');
    });

    it('should return gray minus for none/unknown', () => {
      const cls = component.getPriorityIconClass('none');
      expect(cls).toContain('text-gray-300');
    });
  });

  describe('getPriorityLabel (Requirement 4.5)', () => {
    it('should return Vietnamese labels for each priority', () => {
      expect(component.getPriorityLabel('urgent')).toBe('Khẩn cấp');
      expect(component.getPriorityLabel('high')).toBe('Cao');
      expect(component.getPriorityLabel('medium')).toBe('Trung bình');
      expect(component.getPriorityLabel('low')).toBe('Thấp');
      expect(component.getPriorityLabel('none')).toBe('Không');
    });
  });

  describe('component outputs', () => {
    it('should have itemClicked EventEmitter', () => {
      expect(component.itemClicked).toBeDefined();
      expect(component.itemClicked.emit).toBeDefined();
    });

    it('should have reordered EventEmitter', () => {
      expect(component.reordered).toBeDefined();
      expect(component.reordered.emit).toBeDefined();
    });
  });
});
