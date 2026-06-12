import * as fs from 'fs';
import * as path from 'path';

/**
 * Spec: docs/superpowers/specs/2026-06-12-display-startdate-state-design.md
 * Toggle showStartDate/showState trong Display Properties phải được
 * task-row (List) và board-card (Board) render.
 */
const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('Display Properties: Start date và State được render', () => {
  const taskRow = read('./task-list/task-row.component.ts');
  const boardCard = read('./board/board-card.component.ts');
  const taskList = read('./task-list/task-list.component.ts');

  describe('task-row (List view)', () => {
    it('render start date theo toggle showStartDate', () => {
      expect(taskRow).toContain('displayProps.showStartDate && task.startDate');
    });
    it('render state qua app-state-dot theo toggle showState', () => {
      expect(taskRow).toContain('displayProps.showState && task.state');
      expect(taskRow).toContain('<app-state-dot');
    });
  });

  describe('board-card (Board view)', () => {
    it('render start date theo toggle showStartDate', () => {
      expect(boardCard).toContain('displayProps.showStartDate && task.startDate');
    });
    it('render state qua app-state-dot theo toggle showState', () => {
      expect(boardCard).toContain('displayProps.showState && task.state');
      expect(boardCard).toContain('<app-state-dot');
    });
  });

  describe('group header (task-list)', () => {
    it('dùng app-state-dot thay inline dot markup', () => {
      expect(taskList).toContain('<app-state-dot');
      expect(taskList).not.toContain('isFilledState');
    });
  });

  describe('column header (board-column)', () => {
    it('dùng app-state-dot thay inline dot markup', () => {
      const boardColumn = read('./board/board-column.component.ts');
      expect(boardColumn).toContain('<app-state-dot');
      expect(boardColumn).not.toContain('isFilledGroup');
    });
  });

  describe('orphan sub-items khi filter (spec 2026-06-12-filter-orphan-subitems)', () => {
    it('task-list dùng selectRootTasks thay filter !parentId', () => {
      expect(taskList).toContain('selectRootTasks(');
    });
    it('task-row render chip parent cho orphan row (depth 0 có parentId)', () => {
      expect(taskRow).toContain('depth === 0 && task.parentId && task.parent');
    });
  });
});
