import * as fs from 'fs';
import * as path from 'path';

/**
 * Spec: 2026-06-12-state-icon-priority-emoji-sprint-filter-design.md — Phần 2.
 * Priority icon có thể là emoji (icon picker tab Emoji). Render bằng
 * `<i [class]="icon">` thì emoji bị nhét vào attribute class → không hiển thị.
 * Mọi nơi render priority icon phải dùng app-icon-display.
 */
const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('Priority icon render được emoji (dùng app-icon-display)', () => {
  it('task-row không còn <i [class] cho priority', () => {
    const src = read('./task-list/task-row.component.ts');
    expect(src).not.toMatch(/<i[^>]*\[class\]="priorityIcon/);
    expect(src).toMatch(/app-icon-display[^>]*\[icon\]="priorityIcon/);
  });

  it('board-card không còn <i [class] cho priority', () => {
    const src = read('./board/board-card.component.ts');
    expect(src).not.toMatch(/<i[^>]*\[class\]="priorityIcon/);
    expect(src).toMatch(/app-icon-display[^>]*\[icon\]="priorityIcon/);
  });

  it('task-detail-panel (pill + popover) không còn <i [class] cho priority', () => {
    const src = read('../../components/task-detail-panel/task-detail-panel.component.ts');
    expect(src).not.toMatch(/<i[^>]*\[class\]="selectedPriorityConfig\(\)\.icon/);
    expect(src).not.toMatch(/<i[^>]*\[class\]="p\.icon/);
    expect(src).toMatch(/app-icon-display[^>]*\[icon\]="selectedPriorityConfig\(\)\.icon/);
    expect(src).toMatch(/app-icon-display[^>]*\[icon\]="p\.icon/);
  });
});
