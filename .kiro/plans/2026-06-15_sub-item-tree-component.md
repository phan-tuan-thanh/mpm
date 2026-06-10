# Plan: Task 6.3 — Create SubItemTreeComponent

## Task ID: 6.3
## Task Name: Create SubItemTreeComponent standalone component

## Approach
Create a standalone Angular component that renders a hierarchical tree of sub-items with:
- Recursive template for tree rendering with indentation per level (max depth 5)
- Each row: state icon (colored dot), task ID (monospace), title (truncated), action icons
- Expand/collapse toggles per node (all expanded by default)
- Angular CDK DragDrop for reordering within the same level

## Files to Create/Modify
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-tree/sub-item-tree.component.ts` (new)
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-tree/sub-item-tree.component.spec.ts` (new)
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/sub-item-tree/index.ts` (new)
- `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (modified — add export)

## Acceptance Criteria (from Requirements)
- 4.3: Render sub-items as hierarchical tree with consistent indentation per nesting level, max depth 5
- 4.4: When a sub-item has children, display expand/collapse toggle arrow, all nodes expanded by default
- 4.5: Each sub-item row shows: state icon (colored dot), task ID, title (truncated with ellipsis), inline action icons
- 4.7: Support drag-and-drop reordering within same hierarchical level, show visual drop-position indicator

## Dependencies
- Task 6.1 (shared types — already done, SubItemTreeNode exists)
- Angular CDK DragDrop (already in project)
