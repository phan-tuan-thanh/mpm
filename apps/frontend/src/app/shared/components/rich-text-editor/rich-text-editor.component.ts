import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  forwardRef,
  NgZone,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TiptapEditorDirective } from 'ngx-tiptap';
import { Editor } from '@tiptap/core';
import { Observable, take } from 'rxjs';
import type { TiptapDoc } from '@mpm/shared-types';
import { type RteFeatures, type ToolbarMode, RTE_FULL } from './rte-features';
import { buildExtensions } from './rte-extensions';
import type { MentionItem } from './rte-mention';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TiptapEditorDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
})
export class RichTextEditorComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() placeholder = '';
  @Input() toolbarMode: ToolbarMode = 'full';
  @Input() features: RteFeatures = RTE_FULL;
  @Input() uploadImage?: (file: File) => Observable<string>;
  @Input() mentionSearch?: (query: string) => Promise<MentionItem[]>;
  @Output() blurEditor = new EventEmitter<void>();

  editor!: Editor;

  protected readonly hasSelection = signal(false);
  protected readonly bubbleTop = signal(0);
  protected readonly bubbleLeft = signal(0);
  protected readonly showFloating = signal(false);
  protected readonly floatingTop = signal(0);
  protected readonly floatingLeft = signal(0);
  protected readonly showOverflow = signal(false);

  private onChange: (v: TiptapDoc | null) => void = () => {};
  protected onTouched: () => void = () => {};
  private pendingValue: TiptapDoc | null = null;

  private readonly zone = inject(NgZone);

  ngOnInit(): void {
    this.editor = new Editor({
      extensions: buildExtensions(this.features, this.placeholder, this.mentionSearch),
      editorProps: {
        handleDrop: this.features.image ? this.handleDrop.bind(this) : undefined,
        handlePaste: this.features.image ? this.handlePaste.bind(this) : undefined,
      },
      onUpdate: ({ editor }) => {
        const val = editor.isEmpty ? null : (editor.getJSON() as TiptapDoc);
        this.zone.run(() => this.onChange(val));
      },
      onBlur: () => {
        this.zone.run(() => {
          this.onTouched();
          this.blurEditor.emit();
        });
      },
      onSelectionUpdate: ({ editor }) => {
        const { from, to } = editor.state.selection;
        const sel = from !== to;
        this.zone.run(() => {
          this.hasSelection.set(sel);
          if (sel) {
            const dom = editor.view.dom.getBoundingClientRect();
            this.bubbleTop.set(dom.top - 44);
            this.bubbleLeft.set(dom.left);
          }
          // Floating menu: empty paragraph
          const node = editor.state.selection.$anchor.parent;
          const empty = node.childCount === 0 && node.type.name === 'paragraph';
          this.showFloating.set(empty);
          if (empty) {
            try {
              const coords = editor.view.coordsAtPos(editor.state.selection.from);
              this.floatingTop.set(coords.top);
              this.floatingLeft.set(coords.left);
            } catch {}
          }
        });
      },
    });

    if (this.pendingValue !== null) {
      this.editor.commands.setContent(this.pendingValue, { emitUpdate: false });
      this.pendingValue = null;
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  writeValue(value: TiptapDoc | null): void {
    if (!this.editor) {
      this.pendingValue = value;
      return;
    }
    const current = this.editor.isEmpty ? null : (this.editor.getJSON() as TiptapDoc);
    if (JSON.stringify(value) !== JSON.stringify(current)) {
      this.editor.commands.setContent(value ?? '', { emitUpdate: false });
    }
  }

  registerOnChange(fn: (v: TiptapDoc | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    disabled ? this.editor?.setEditable(false) : this.editor?.setEditable(true);
  }

  // ── Toolbar commands ──────────────────────────────────────────────

  toggleBold(): void { this.editor.chain().focus().toggleBold().run(); }
  toggleItalic(): void { this.editor.chain().focus().toggleItalic().run(); }
  toggleUnderline(): void { this.editor.chain().focus().toggleUnderline().run(); }
  toggleStrike(): void { this.editor.chain().focus().toggleStrike().run(); }
  toggleHighlight(): void { (this.editor.chain().focus() as any).toggleHighlight().run(); }
  toggleSubscript(): void { (this.editor.chain().focus() as any).toggleSubscript().run(); }
  toggleSuperscript(): void { (this.editor.chain().focus() as any).toggleSuperscript().run(); }
  setHeading(level: 1 | 2 | 3): void { this.editor.chain().focus().toggleHeading({ level }).run(); }
  toggleBulletList(): void { this.editor.chain().focus().toggleBulletList().run(); }
  toggleOrderedList(): void { this.editor.chain().focus().toggleOrderedList().run(); }
  toggleTaskList(): void { (this.editor.chain().focus() as any).toggleTaskList().run(); }
  toggleBlockquote(): void { this.editor.chain().focus().toggleBlockquote().run(); }
  toggleCodeBlock(): void { this.editor.chain().focus().toggleCodeBlock().run(); }
  setTextAlign(align: 'left' | 'center' | 'right' | 'justify'): void {
    (this.editor.chain().focus() as any).setTextAlign(align).run();
  }
  undo(): void { this.editor.chain().focus().undo().run(); }
  redo(): void { this.editor.chain().focus().redo().run(); }

  toggleOverflow(): void { this.showOverflow.update(v => !v); }

  onInsertImage(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.handleImageFile(file);
    };
    input.click();
  }

  // ── Image upload ──────────────────────────────────────────────────

  private handleDrop(view: any, event: DragEvent): boolean {
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) {
      event.preventDefault();
      this.handleImageFile(file);
      return true;
    }
    return false;
  }

  private handlePaste(view: any, event: ClipboardEvent): boolean {
    const item = Array.from(event.clipboardData?.items ?? []).find(i =>
      i.type.startsWith('image/'),
    );
    if (item) {
      const file = item.getAsFile();
      if (file) { this.handleImageFile(file); return true; }
    }
    return false;
  }

  private handleImageFile(file: File): void {
    if (this.uploadImage) {
      this.uploadImage(file)
        .pipe(take(1))
        .subscribe(url => this.editor.chain().focus().setImage({ src: url }).run());
    } else {
      const url = URL.createObjectURL(file);
      this.editor.chain().focus().setImage({ src: url }).run();
    }
  }
}
