import { Sprint } from '../../../../projects/sprints/models/sprint.models';

export interface SprintOption {
  label: string;
  value: string;
}

export interface SprintSections {
  open: SprintOption[];
  completed: SprintOption[];
  /** Số sprint completed bị ẩn bởi giới hạn — hiện nút "Xem thêm (n)" */
  hiddenCompletedCount: number;
}

export function sortCompletedSprints(sprints: Sprint[]): Sprint[] {
  return sprints
    .filter((s) => s.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export function buildSprintSections(
  openSprints: Sprint[],
  completedSprints: Sprint[],
  query: string,
  showAllCompleted: boolean,
  selectedId: string | null,
  limit = 5,
): SprintSections {
  const q = query.trim().toLowerCase();
  const matches = (s: Sprint) => !q || s.name.toLowerCase().includes(q);

  const open = openSprints.filter(matches).map((s) => ({
    label: s.status === 'active' ? `${s.name} (đang chạy)` : s.name,
    value: s.id,
  }));

  const matched = completedSprints.filter(matches);
  let visible = matched;
  let hidden = 0;
  if (!q && !showAllCompleted) {
    visible = matched.slice(0, limit);
    // sprint đang được chọn làm filter luôn hiển thị dù ngoài giới hạn
    if (selectedId && !visible.some((s) => s.id === selectedId)) {
      const selected = matched.find((s) => s.id === selectedId);
      if (selected) visible = [...visible, selected];
    }
    hidden = matched.length - visible.length;
  }

  return {
    open,
    completed: visible.map((s) => ({ label: s.name, value: s.id })),
    hiddenCompletedCount: hidden,
  };
}
