import { buildSprintSections, sortCompletedSprints } from './sprint-filter.helpers';
import { Sprint } from '../../../../projects/sprints/models/sprint.models';

const sprint = (over: Partial<Sprint>): Sprint => ({
  id: 'id', projectId: 'p', name: 'Sprint', goal: null,
  startDate: null, endDate: null, status: 'planning',
  targetCapacity: null, initialStoryPoints: null, initialTasksCount: null,
  completedAt: null, createdBy: 'u', createdAt: '', updatedAt: '', deletedAt: null,
  ...over,
});

describe('sortCompletedSprints', () => {
  it('lọc completed và sort completedAt giảm dần', () => {
    const result = sortCompletedSprints([
      sprint({ id: 'a', status: 'completed', completedAt: '2026-01-01' }),
      sprint({ id: 'b', status: 'active' }),
      sprint({ id: 'c', status: 'completed', completedAt: '2026-03-01' }),
    ]);
    expect(result.map((s) => s.id)).toEqual(['c', 'a']);
  });
});

describe('buildSprintSections', () => {
  const open = [
    sprint({ id: 'o1', name: 'Sprint 9', status: 'planning' }),
    sprint({ id: 'o2', name: 'Sprint 7', status: 'active' }),
  ];
  const completed = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].map((id, i) =>
    sprint({ id, name: `Sprint ${i + 1} done`, status: 'completed', completedAt: `2026-0${i + 1}-01` }),
  );

  it('open sprints: active có hậu tố (đang chạy)', () => {
    const s = buildSprintSections(open, [], '', false, null);
    expect(s.open).toEqual([
      { label: 'Sprint 9', value: 'o1' },
      { label: 'Sprint 7 (đang chạy)', value: 'o2' },
    ]);
  });

  it('completed: mặc định giới hạn 5, đếm số bị ẩn', () => {
    const s = buildSprintSections(open, completed, '', false, null);
    expect(s.completed).toHaveLength(5);
    expect(s.hiddenCompletedCount).toBe(2);
  });

  it('showAllCompleted=true → hiện tất cả, hidden=0', () => {
    const s = buildSprintSections(open, completed, '', true, null);
    expect(s.completed).toHaveLength(7);
    expect(s.hiddenCompletedCount).toBe(0);
  });

  it('sprint completed đang được chọn nằm ngoài giới hạn vẫn hiển thị', () => {
    const s = buildSprintSections(open, completed, '', false, 'c7');
    expect(s.completed.map((o) => o.value)).toContain('c7');
    expect(s.hiddenCompletedCount).toBe(1);
  });

  it('có query → lọc cả hai nhóm theo tên (case-insensitive), bỏ giới hạn', () => {
    const s = buildSprintSections(open, completed, 'DONE', false, null);
    expect(s.open).toHaveLength(0);
    expect(s.completed).toHaveLength(7);
    expect(s.hiddenCompletedCount).toBe(0);
  });
});
