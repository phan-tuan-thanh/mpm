import {
  getPriorityBadgeClasses,
  getPriorityLabel,
  copyToClipboard,
  SAVE_STATUS_DURATIONS,
  PRIORITY_COLORS,
} from './task-header.helpers';
import type { TaskPriority } from '@mpm/shared-types';

/**
 * Unit tests for TaskHeaderComponent helpers and logic
 *
 * Tests the component's business logic without TestBed since PrimeNG modules
 * require the Angular JIT compiler which is not configured in jest-preset-angular CJS mode.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9
 */
describe('TaskHeaderComponent — Helpers', () => {
  describe('getPriorityBadgeClasses (Req 1.5)', () => {
    it('should return red classes for urgent priority', () => {
      const result = getPriorityBadgeClasses('urgent');
      expect(result).toContain('bg-red-100');
      expect(result).toContain('text-red-700');
    });

    it('should return orange classes for high priority', () => {
      const result = getPriorityBadgeClasses('high');
      expect(result).toContain('bg-orange-100');
      expect(result).toContain('text-orange-700');
    });

    it('should return yellow classes for medium priority', () => {
      const result = getPriorityBadgeClasses('medium');
      expect(result).toContain('bg-yellow-100');
      expect(result).toContain('text-yellow-700');
    });

    it('should return blue classes for low priority', () => {
      const result = getPriorityBadgeClasses('low');
      expect(result).toContain('bg-blue-100');
      expect(result).toContain('text-blue-700');
    });

    it('should return gray classes for none priority', () => {
      const result = getPriorityBadgeClasses('none');
      expect(result).toContain('bg-gray-100');
      expect(result).toContain('text-gray-600');
    });

    it('should include dark mode classes for all priorities', () => {
      const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none'];
      for (const p of priorities) {
        const result = getPriorityBadgeClasses(p);
        expect(result).toContain('dark:');
      }
    });
  });

  describe('getPriorityLabel (Req 1.5)', () => {
    it('should return "Urgent" for urgent', () => {
      expect(getPriorityLabel('urgent')).toBe('Urgent');
    });

    it('should return "High" for high', () => {
      expect(getPriorityLabel('high')).toBe('High');
    });

    it('should return "Medium" for medium', () => {
      expect(getPriorityLabel('medium')).toBe('Medium');
    });

    it('should return "Low" for low', () => {
      expect(getPriorityLabel('low')).toBe('Low');
    });

    it('should return "None" for none', () => {
      expect(getPriorityLabel('none')).toBe('None');
    });

    it('should map all defined priority levels', () => {
      const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none'];
      const labels = priorities.map(getPriorityLabel);
      expect(labels).toEqual(['Urgent', 'High', 'Medium', 'Low', 'None']);
    });
  });

  describe('copyToClipboard (Req 1.2, 1.3)', () => {
    it('should return true when clipboard write succeeds', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
      });

      const result = await copyToClipboard('PROJ-6');
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('PROJ-6');
    });

    it('should return false when clipboard write fails', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
      });

      const result = await copyToClipboard('PROJ-6');
      expect(result).toBe(false);
    });

    it('should pass the exact text to clipboard', async () => {
      const writeTextSpy = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText: writeTextSpy } });

      await copyToClipboard('MY-PROJECT-123');
      expect(writeTextSpy).toHaveBeenCalledWith('MY-PROJECT-123');
    });
  });

  describe('SAVE_STATUS_DURATIONS (Req 1.7, 1.8)', () => {
    it('should have saved duration of 2000ms', () => {
      expect(SAVE_STATUS_DURATIONS.saved).toBe(2000);
    });

    it('should have error duration of 3000ms', () => {
      expect(SAVE_STATUS_DURATIONS.error).toBe(3000);
    });
  });

  describe('PRIORITY_COLORS configuration', () => {
    it('should define colors for all 5 priority levels', () => {
      const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none'];
      for (const p of priorities) {
        expect(PRIORITY_COLORS[p]).toBeDefined();
        expect(PRIORITY_COLORS[p].bg).toBeTruthy();
        expect(PRIORITY_COLORS[p].text).toBeTruthy();
        expect(PRIORITY_COLORS[p].label).toBeTruthy();
      }
    });

    it('should have unique labels for each priority', () => {
      const labels = Object.values(PRIORITY_COLORS).map((c) => c.label);
      const unique = new Set(labels);
      expect(unique.size).toBe(labels.length);
    });

    it('should use distinct color schemes for each priority', () => {
      const bgClasses = Object.values(PRIORITY_COLORS).map((c) => c.bg);
      const unique = new Set(bgClasses);
      expect(unique.size).toBe(bgClasses.length);
    });
  });
});
