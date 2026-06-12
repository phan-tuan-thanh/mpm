import { StateDotComponent } from './state-dot.component';

describe('StateDotComponent', () => {
  let component: StateDotComponent;

  beforeEach(() => {
    component = new StateDotComponent();
  });

  describe('isFilled — dot tô đặc theo group', () => {
    it.each(['started', 'completed'])('group %s → filled', (group) => {
      component.state = { name: 'X', color: '#10B981', group };
      expect(component.isFilled).toBe(true);
    });

    it.each(['backlog', 'unstarted', 'cancelled'])('group %s → chỉ viền', (group) => {
      component.state = { name: 'X', color: '#10B981', group };
      expect(component.isFilled).toBe(false);
    });
  });

  describe('iconColor — pi icon tô màu state, emoji giữ màu gốc', () => {
    it('pi icon → màu state', () => {
      component.state = { name: 'Done', color: '#10B981', group: 'completed', icon: 'pi pi-check-circle' };
      expect(component.iconColor).toBe('#10B981');
    });

    it('icon dạng "pi-..." (thiếu prefix "pi ") vẫn là pi icon', () => {
      component.state = { name: 'Done', color: '#10B981', group: 'completed', icon: 'pi-check-circle' };
      expect(component.iconColor).toBe('#10B981');
    });

    it('emoji → null (không override màu)', () => {
      component.state = { name: 'Done', color: '#10B981', group: 'completed', icon: '✅' };
      expect(component.iconColor).toBeNull();
    });

    it('không có icon → null', () => {
      component.state = { name: 'Todo', color: '#9CA3AF', group: 'unstarted' };
      expect(component.iconColor).toBeNull();
    });
  });

  it('size mặc định 14', () => {
    expect(component.size).toBe(14);
  });
});
