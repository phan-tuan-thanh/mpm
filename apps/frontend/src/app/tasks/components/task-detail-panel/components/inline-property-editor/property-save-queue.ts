/**
 * PropertySaveQueue — Debounced save queue for inline property editing
 *
 * Implements:
 * - Debounce 500ms: chỉ gọi save sau khi user ngừng edit 500ms
 * - Queue: nếu save đang in-progress và user edit lại → queue value mới
 * - After save completes/fails → gửi queued value (nếu có)
 *
 * Requirements: 6.2, 6.6
 */

export type SaveFn = (field: string, value: unknown) => Promise<boolean>;

interface FieldState {
  /** Timer cho debounce hiện tại */
  debounceTimer: ReturnType<typeof setTimeout> | null;
  /** Value đang chờ gửi lên server (queued) */
  queuedValue: unknown | undefined;
  /** Có đang trong quá trình save không */
  isSaving: boolean;
  /** Value trước khi edit — dùng để revert on error */
  previousValue: unknown;
}

export class PropertySaveQueue {
  private readonly fields = new Map<string, FieldState>();
  private readonly debounceMs: number;

  constructor(debounceMs = 500) {
    this.debounceMs = debounceMs;
  }

  /**
   * Enqueue a field value change.
   * - Nếu đang debounce → reset timer
   * - Nếu đang save → queue value mới, sẽ gửi sau khi save hiện tại hoàn thành
   */
  enqueue(
    field: string,
    value: unknown,
    previousValue: unknown,
    saveFn: SaveFn,
    onSaveStart: () => void,
    onSaveEnd: (success: boolean) => void,
  ): void {
    let state = this.fields.get(field);

    if (!state) {
      state = {
        debounceTimer: null,
        queuedValue: undefined,
        isSaving: false,
        previousValue,
      };
      this.fields.set(field, state);
    }

    // Nếu đang save → queue value mới, sẽ gửi sau khi save hoàn thành
    if (state.isSaving) {
      state.queuedValue = value;
      return;
    }

    // Clear debounce timer hiện tại
    if (state.debounceTimer !== null) {
      clearTimeout(state.debounceTimer);
    }

    // Lưu previous value (chỉ lưu nếu chưa có giá trị trước đó)
    state.previousValue = previousValue;

    // Set debounce timer mới
    state.debounceTimer = setTimeout(() => {
      state!.debounceTimer = null;
      this.executeSave(field, value, saveFn, onSaveStart, onSaveEnd);
    }, this.debounceMs);
  }

  /**
   * Execute save cho một field. Sau khi save xong, check queue.
   */
  private async executeSave(
    field: string,
    value: unknown,
    saveFn: SaveFn,
    onSaveStart: () => void,
    onSaveEnd: (success: boolean) => void,
  ): Promise<void> {
    const state = this.fields.get(field);
    if (!state) return;

    state.isSaving = true;
    state.queuedValue = undefined;
    onSaveStart();

    try {
      const success = await saveFn(field, value);
      onSaveEnd(success);

      if (success) {
        // Update previousValue thành value mới (đã save thành công)
        state.previousValue = value;
      }
    } catch {
      onSaveEnd(false);
    } finally {
      state.isSaving = false;

      // Check queued value — gửi nếu user đã edit trong lúc đang save
      if (state.queuedValue !== undefined) {
        const queuedVal = state.queuedValue;
        state.queuedValue = undefined;

        // Debounce ngắn để tránh spam
        state.debounceTimer = setTimeout(() => {
          state!.debounceTimer = null;
          this.executeSave(field, queuedVal, saveFn, onSaveStart, onSaveEnd);
        }, this.debounceMs);
      }
    }
  }

  /** Get previous value cho revert */
  getPreviousValue(field: string): unknown {
    return this.fields.get(field)?.previousValue;
  }

  /** Check if a field is currently saving */
  isSaving(field: string): boolean {
    return this.fields.get(field)?.isSaving ?? false;
  }

  /** Cleanup — clear all pending timers */
  destroy(): void {
    for (const [, state] of this.fields) {
      if (state.debounceTimer !== null) {
        clearTimeout(state.debounceTimer);
      }
    }
    this.fields.clear();
  }
}
