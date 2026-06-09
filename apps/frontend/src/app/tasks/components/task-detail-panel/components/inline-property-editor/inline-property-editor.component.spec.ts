import { PropertySaveQueue } from './property-save-queue';
import type { PropertyFieldConfig } from './inline-property-editor.component';

/**
 * Unit tests for InlinePropertyEditorComponent logic (PropertySaveQueue)
 *
 * Tests the save queue business logic directly without TestBed since PrimeNG modules
 * require the Angular JIT compiler which is not configured in jest-preset-angular CJS mode.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6
 */
describe('PropertySaveQueue', () => {
  let queue: PropertySaveQueue;

  beforeEach(() => {
    jest.useFakeTimers();
    queue = new PropertySaveQueue(500);
  });

  afterEach(() => {
    queue.destroy();
    jest.useRealTimers();
  });

  describe('debounce behavior (Requirement 6.2)', () => {
    it('should not call saveFn before 500ms', () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(499);

      expect(saveFn).not.toHaveBeenCalled();
    });

    it('should call saveFn after 500ms debounce', () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);

      expect(saveFn).toHaveBeenCalledWith('priority', 'high');
    });

    it('should reset debounce when new value arrives within 500ms', () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(300);

      queue.enqueue('priority', 'urgent', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(300);

      // Should NOT have been called yet (only 300ms since second enqueue)
      expect(saveFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(200);
      // Now 500ms since second enqueue → should fire
      expect(saveFn).toHaveBeenCalledWith('priority', 'urgent');
      expect(saveFn).toHaveBeenCalledTimes(1);
    });

    it('should only send ONE API call with the last value for rapid edits within debounce', () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      // Simulate rapid edits within 500ms window
      queue.enqueue('priority', 'high', 'none', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(100);
      queue.enqueue('priority', 'medium', 'none', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(100);
      queue.enqueue('priority', 'urgent', 'none', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);

      // Should have called ONLY with 'urgent' (the last value)
      expect(saveFn).toHaveBeenCalledTimes(1);
      expect(saveFn).toHaveBeenCalledWith('priority', 'urgent');
    });
  });

  describe('save queue for rapid edits while save in progress (Requirement 6.6)', () => {
    it('should queue value if save is in progress', async () => {
      let resolveFirst!: (value: boolean) => void;
      const firstSave = new Promise<boolean>((r) => { resolveFirst = r; });
      const saveFn = jest.fn().mockReturnValueOnce(firstSave).mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      // First edit — triggers after 500ms
      queue.enqueue('stateId', 'state-1', 'state-0', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);

      expect(saveFn).toHaveBeenCalledWith('stateId', 'state-1');
      expect(queue.isSaving('stateId')).toBe(true);

      // Second edit while first save is in progress → queued
      queue.enqueue('stateId', 'state-2', 'state-0', saveFn, onStart, onEnd);

      // Resolve first save
      resolveFirst(true);
      await Promise.resolve(); // flush microtasks

      // After first save, queued value should be scheduled (debounced)
      jest.advanceTimersByTime(500);

      expect(saveFn).toHaveBeenCalledWith('stateId', 'state-2');
      expect(saveFn).toHaveBeenCalledTimes(2);
    });

    it('should only send last queued value, not intermediate ones', async () => {
      let resolveFirst!: (value: boolean) => void;
      const firstSave = new Promise<boolean>((r) => { resolveFirst = r; });
      const saveFn = jest.fn().mockReturnValueOnce(firstSave).mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'none', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);

      // While saving, enqueue multiple values
      queue.enqueue('priority', 'medium', 'none', saveFn, onStart, onEnd);
      queue.enqueue('priority', 'urgent', 'none', saveFn, onStart, onEnd);

      resolveFirst(true);
      await Promise.resolve();

      jest.advanceTimersByTime(500);

      // Should have called with 'urgent' (last queued), not 'medium'
      expect(saveFn).toHaveBeenCalledTimes(2);
      expect(saveFn).toHaveBeenLastCalledWith('priority', 'urgent');
    });

    it('should handle multiple fields independently', () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'none', saveFn, onStart, onEnd);
      queue.enqueue('stateId', 'state-1', 'state-0', saveFn, onStart, onEnd);

      jest.advanceTimersByTime(500);

      expect(saveFn).toHaveBeenCalledWith('priority', 'high');
      expect(saveFn).toHaveBeenCalledWith('stateId', 'state-1');
      expect(saveFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('callbacks (Requirement 6.3)', () => {
    it('should call onSaveStart when save begins', () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onSaveEnd with true on success', async () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(onEnd).toHaveBeenCalledWith(true);
    });

    it('should call onSaveEnd with false on failure (Requirement 6.4)', async () => {
      const saveFn = jest.fn().mockResolvedValue(false);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(onEnd).toHaveBeenCalledWith(false);
    });

    it('should call onSaveEnd with false when saveFn throws', async () => {
      const saveFn = jest.fn().mockRejectedValue(new Error('network error'));
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve(); // extra tick for catch

      expect(onEnd).toHaveBeenCalledWith(false);
    });
  });

  describe('isSaving state', () => {
    it('should return false initially', () => {
      expect(queue.isSaving('priority')).toBe(false);
    });

    it('should return true while save is in progress', () => {
      const saveFn = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);

      expect(queue.isSaving('priority')).toBe(true);
    });

    it('should return false after save completes', async () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      const onStart = jest.fn();
      const onEnd = jest.fn();

      queue.enqueue('priority', 'high', 'low', saveFn, onStart, onEnd);
      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(queue.isSaving('priority')).toBe(false);
    });
  });

  describe('previousValue tracking', () => {
    it('should store previousValue on first enqueue', () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      queue.enqueue('priority', 'high', 'low', saveFn, jest.fn(), jest.fn());

      expect(queue.getPreviousValue('priority')).toBe('low');
    });

    it('should update previousValue after successful save', async () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      queue.enqueue('priority', 'high', 'low', saveFn, jest.fn(), jest.fn());
      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(queue.getPreviousValue('priority')).toBe('high');
    });

    it('should NOT update previousValue after failed save', async () => {
      const saveFn = jest.fn().mockResolvedValue(false);
      queue.enqueue('priority', 'high', 'low', saveFn, jest.fn(), jest.fn());
      jest.advanceTimersByTime(500);
      await Promise.resolve();

      expect(queue.getPreviousValue('priority')).toBe('low');
    });
  });

  describe('destroy', () => {
    it('should clear pending timers', () => {
      const saveFn = jest.fn().mockResolvedValue(true);
      queue.enqueue('priority', 'high', 'low', saveFn, jest.fn(), jest.fn());
      queue.destroy();
      jest.advanceTimersByTime(1000);

      expect(saveFn).not.toHaveBeenCalled();
    });
  });
});

describe('PropertyFieldConfig types', () => {
  it('should accept dropdown config', () => {
    const config: PropertyFieldConfig = {
      field: 'priority',
      label: 'Priority',
      type: 'dropdown',
      options: [{ label: 'High', value: 'high' }],
    };
    expect(config.type).toBe('dropdown');
  });

  it('should accept multi-select config', () => {
    const config: PropertyFieldConfig = {
      field: 'assigneeIds',
      label: 'Assignees',
      type: 'multi-select',
      options: [{ label: 'User A', value: 'user-a' }],
    };
    expect(config.type).toBe('multi-select');
  });

  it('should accept date config', () => {
    const config: PropertyFieldConfig = {
      field: 'startDate',
      label: 'Start Date',
      type: 'date',
    };
    expect(config.type).toBe('date');
  });

  it('should accept number config with min/max/step (Requirement 6.1)', () => {
    const config: PropertyFieldConfig = {
      field: 'estimateValue',
      label: 'Estimate',
      type: 'number',
      min: 0.5,
      max: 100,
      step: 0.5,
    };
    expect(config.min).toBe(0.5);
    expect(config.max).toBe(100);
    expect(config.step).toBe(0.5);
  });
});
