import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import type { TiptapDoc } from '@mpm/shared-types';
import { RichTextViewerComponent } from '../../../../../shared/components/rich-text-viewer/rich-text-viewer.component';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { isDocEmpty } from '../../../../../shared/components/rich-text-viewer/rte-render';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Mô tả task: mặc định chế độ đọc (viewer tĩnh), click/bút chì → edit với Lưu/Hủy.
 * Design: docs/plans/2026-06-11-task-read-mode-design.md
 */
@Component({
  standalone: true,
  selector: 'app-task-description-section',
  imports: [FormsModule, ButtonModule, RichTextViewerComponent, RichTextEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!editing()) {
      <div
        data-testid="description-read"
        class="group relative -mx-2 px-2 py-1 rounded-lg cursor-text transition-colors hover:bg-gray-50 dark:hover:bg-surface-800"
      >
        <button
          pButton type="button" icon="pi pi-pencil" [text]="true" size="small"
          data-testid="description-edit-btn"
          class="!absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100"
          (click)="enterEdit()"
        ></button>
        @if (isEmpty()) {
          <p
            data-testid="description-placeholder"
            class="text-sm italic text-gray-400 dark:text-surface-500 min-h-[2.5rem] flex items-center"
            (click)="enterEdit()"
          >Thêm mô tả…</p>
        } @else {
          <app-rich-text-viewer
            [doc]="docSignal()"
            (editRequested)="enterEdit()"
            (checkboxToggled)="checkboxToggled.emit($event)"
          />
        }
      </div>
    } @else {
      <div data-testid="description-edit" (keydown.escape)="onEscape($event)" (keydown.control.enter)="save()">
        <app-rich-text-editor
          [ngModel]="draft()"
          (ngModelChange)="draft.set($event)"
          [autofocus]="true"
          placeholder="Thêm mô tả..."
        />
        <div class="flex justify-end gap-2 mt-2">
          <button pButton type="button" label="Hủy" [text]="true" size="small" severity="secondary"
                  data-testid="description-cancel" (click)="cancel()"></button>
          <button pButton type="button" label="Lưu" size="small" [loading]="statusSignal() === 'saving'"
                  data-testid="description-save" (click)="save()"></button>
        </div>
      </div>
    }
  `,
})
export class TaskDescriptionSectionComponent {
  private readonly confirmService = inject(ConfirmationService);

  protected readonly docSignal = signal<TiptapDoc | null>(null);
  protected readonly statusSignal = signal<SaveStatus>('idle');

  @Input() set doc(v: TiptapDoc | null | undefined) { this.docSignal.set(v ?? null); }
  @Input() set saveStatus(v: SaveStatus) { this.statusSignal.set(v); }

  @Output() saveRequested = new EventEmitter<TiptapDoc | null>();
  @Output() checkboxToggled = new EventEmitter<TiptapDoc>();
  @Output() editingChange = new EventEmitter<boolean>();

  readonly editing = signal(false);
  readonly draft = signal<TiptapDoc | null>(null);
  protected readonly isEmpty = computed(() => isDocEmpty(this.docSignal()));
  private awaitingSave = false;

  constructor() {
    // Lưu thành công → về chế độ đọc. Lỗi → giữ edit + draft (US-2).
    effect(() => {
      const status = this.statusSignal();
      if (!this.awaitingSave) return;
      if (status === 'saved') {
        this.awaitingSave = false;
        this.exitEdit();
      } else if (status === 'error') {
        this.awaitingSave = false;
      }
    });
  }

  get dirty(): boolean {
    const draft = this.draft();
    const current = this.docSignal();
    if (isDocEmpty(draft) && isDocEmpty(current)) return false;
    return JSON.stringify(draft) !== JSON.stringify(current);
  }

  enterEdit(): void {
    const doc = this.docSignal();
    this.draft.set(doc ? JSON.parse(JSON.stringify(doc)) : null);
    this.editing.set(true);
    this.editingChange.emit(true);
  }

  protected save(): void {
    this.awaitingSave = true;
    this.saveRequested.emit(this.draft());
  }

  protected cancel(): void {
    if (!this.dirty) {
      this.exitEdit();
      return;
    }
    this.confirmService.confirm({
      message: 'Bỏ thay đổi chưa lưu?',
      header: 'Xác nhận',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Bỏ thay đổi',
      rejectLabel: 'Tiếp tục sửa',
      accept: () => this.exitEdit(),
    });
  }

  protected onEscape(event: Event): void {
    event.stopPropagation(); // không cho Esc lan lên drawer/dialog
    this.cancel();
  }

  private exitEdit(): void {
    this.editing.set(false);
    this.editingChange.emit(false);
  }
}
