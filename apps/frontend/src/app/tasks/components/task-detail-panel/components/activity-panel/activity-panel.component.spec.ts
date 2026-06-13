import {
  buildActivityTabs,
  getEmptyStateConfig,
  getActiveTabLabel,
  EMPTY_STATE_MAP,
  ActivityTab,
} from './activity-panel.helpers';

/**
 * Unit tests for ActivityPanelComponent logic (helpers)
 *
 * Tests the component's business logic without TestBed since PrimeNG modules
 * require the Angular JIT compiler which is not configured in jest-preset-angular CJS mode.
 */
describe('ActivityPanelComponent (helpers)', () => {
  describe('buildActivityTabs', () => {
    it('should return 3 base tabs when showPropertiesTab is false (all, activity, history)', () => {
      const tabs = buildActivityTabs(false);
      expect(tabs.length).toBe(3);
    });

    it('should have "Tất cả" as first tab with value "all"', () => {
      const tabs = buildActivityTabs(false);
      expect(tabs[0].label).toBe('Tất cả');
      expect(tabs[0].value).toBe('all');
      expect(tabs[0].icon).toBe('pi pi-list');
    });

    it('should have "Hoạt động" as second tab with value "activity"', () => {
      const tabs = buildActivityTabs(false);
      expect(tabs[1].label).toBe('Hoạt động');
      expect(tabs[1].value).toBe('activity');
      expect(tabs[1].icon).toBe('pi pi-bolt');
    });

    it('should have "Lịch sử" as third tab with value "history"', () => {
      const tabs = buildActivityTabs(false);
      expect(tabs[2].label).toBe('Lịch sử');
      expect(tabs[2].value).toBe('history');
      expect(tabs[2].icon).toBe('pi pi-history');
    });

    it('should include "Thuộc tính" tab when showPropertiesTab is true', () => {
      const tabs = buildActivityTabs(true);
      expect(tabs.length).toBe(4);
      expect(tabs[3].label).toBe('Thuộc tính');
      expect(tabs[3].value).toBe('properties');
      expect(tabs[3].icon).toBe('pi pi-cog');
    });

    it('should not include Properties tab when showPropertiesTab is false', () => {
      const tabs = buildActivityTabs(false);
      const hasProperties = tabs.some((t) => t.value === 'properties');
      expect(hasProperties).toBe(false);
    });

    it('should return a new array each call (no mutation)', () => {
      const tabs1 = buildActivityTabs(false);
      const tabs2 = buildActivityTabs(false);
      expect(tabs1).not.toBe(tabs2);
      expect(tabs1).toEqual(tabs2);
    });
  });

  describe('getEmptyStateConfig', () => {
    it('should return correct config for "all" tab', () => {
      const config = getEmptyStateConfig('all');
      expect(config.icon).toBe('pi pi-clock');
      expect(config.message).toBe('Chưa có hoạt động nào.');
    });

    it('should return correct config for "activity" tab', () => {
      const config = getEmptyStateConfig('activity');
      expect(config.icon).toBe('pi pi-bolt');
      expect(config.message).toBe('Chưa có hoạt động hệ thống nào.');
    });

    it('should return correct config for "comments" tab', () => {
      const config = getEmptyStateConfig('comments');
      expect(config.icon).toBe('pi pi-comments');
      expect(config.message).toBe('Chưa có bình luận nào.');
    });

    it('should return correct config for "history" tab', () => {
      const config = getEmptyStateConfig('history');
      expect(config.icon).toBe('pi pi-history');
      expect(config.message).toBe('Chưa có lịch sử chuyển trạng thái.');
    });

    it('should fallback to "all" config for "properties" tab', () => {
      const config = getEmptyStateConfig('properties');
      expect(config.icon).toBe('pi pi-clock');
      expect(config.message).toBe('Chưa có hoạt động nào.');
    });
  });

  describe('getActiveTabLabel', () => {
    const baseTabs = buildActivityTabs(false);
    const fullTabs = buildActivityTabs(true);

    it('should return "Tất cả" for "all" filter', () => {
      expect(getActiveTabLabel(baseTabs, 'all')).toBe('Tất cả');
    });

    it('should return "Hoạt động" for "activity" filter', () => {
      expect(getActiveTabLabel(baseTabs, 'activity')).toBe('Hoạt động');
    });

    it('should return "Lịch sử" for "history" filter', () => {
      expect(getActiveTabLabel(baseTabs, 'history')).toBe('Lịch sử');
    });

    it('should return "Thuộc tính" for "properties" when tab exists', () => {
      expect(getActiveTabLabel(fullTabs, 'properties')).toBe('Thuộc tính');
    });

    it('should fallback to "Tất cả" when filter is not found in tabs', () => {
      expect(getActiveTabLabel(baseTabs, 'properties')).toBe('Tất cả');
    });

    it('should fallback to "Tất cả" for empty tabs array', () => {
      expect(getActiveTabLabel([], 'all')).toBe('Tất cả');
    });
  });

  describe('EMPTY_STATE_MAP', () => {
    it('should have entries for all, activity, comments, and history', () => {
      expect(EMPTY_STATE_MAP['all']).toBeDefined();
      expect(EMPTY_STATE_MAP['activity']).toBeDefined();
      expect(EMPTY_STATE_MAP['comments']).toBeDefined();
      expect(EMPTY_STATE_MAP['history']).toBeDefined();
    });

    it('should have icon and message for each entry', () => {
      for (const key of ['all', 'activity', 'comments', 'history']) {
        expect(EMPTY_STATE_MAP[key].icon).toBeTruthy();
        expect(EMPTY_STATE_MAP[key].message).toBeTruthy();
      }
    });

    it('should use PrimeIcons format (pi pi-*)', () => {
      for (const key of ['all', 'activity', 'comments', 'history']) {
        expect(EMPTY_STATE_MAP[key].icon).toMatch(/^pi pi-/);
      }
    });
  });

  describe('tab configuration for different view modes', () => {
    it('full-page mode: should have 3 tabs (no Properties)', () => {
      const tabs = buildActivityTabs(false);
      expect(tabs.length).toBe(3);
      expect(tabs.map((t) => t.value)).toEqual(['all', 'activity', 'history']);
    });

    it('drawer/popup mode: should have 4 tabs including Properties', () => {
      const tabs = buildActivityTabs(true);
      expect(tabs.length).toBe(4);
      expect(tabs.map((t) => t.value)).toEqual([
        'all',
        'activity',
        'history',
        'properties',
      ]);
    });
  });

  describe('ActivityTab interface', () => {
    it('should have label, value, and icon properties', () => {
      const tab: ActivityTab = { label: 'Test', value: 'all', icon: 'pi pi-check' };
      expect(tab.label).toBe('Test');
      expect(tab.value).toBe('all');
      expect(tab.icon).toBe('pi pi-check');
    });

    it('should accept "properties" as a valid value', () => {
      const tab: ActivityTab = { label: 'Props', value: 'properties', icon: 'pi pi-cog' };
      expect(tab.value).toBe('properties');
    });
  });
});
