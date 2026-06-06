import { Component, forwardRef, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TiptapEditorDirective } from 'ngx-tiptap';

export type TiptapDoc = Record<string, any>;

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TiptapEditorDirective],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => RichTextEditorComponent),
    multi: true,
  }],
  styleUrls: ['./rich-text-editor.component.css'],
  template: `
    <div class="rte-wrapper"
         [class.rte-disabled]="isDisabled">
      <div class="rte-toolbar">
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBold().run()"
                [class.rte-active]="editor.isActive('bold')" title="Bold"><b>B</b></button>
        <button type="button" class="rte-btn rte-italic" (click)="editor.chain().focus().toggleItalic().run()"
                [class.rte-active]="editor.isActive('italic')" title="Italic">I</button>
        <button type="button" class="rte-btn rte-underline" (click)="editor.chain().focus().toggleUnderline().run()"
                [class.rte-active]="editor.isActive('underline')" title="Underline">U</button>
        <div class="rte-sep"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 1 }).run()"
                [class.rte-active]="editor.isActive('heading', { level: 1 })">H1</button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                [class.rte-active]="editor.isActive('heading', { level: 2 })">H2</button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                [class.rte-active]="editor.isActive('heading', { level: 3 })">H3</button>
        <div class="rte-sep"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBulletList().run()"
                [class.rte-active]="editor.isActive('bulletList')" title="Bullet list">
          <i class="pi pi-list" style="font-size:11px"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleOrderedList().run()"
                [class.rte-active]="editor.isActive('orderedList')" title="Numbered list">
          <i class="pi pi-sort-amount-down" style="font-size:11px"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleTaskList().run()"
                [class.rte-active]="editor.isActive('taskList')" title="Checklist">
          <i class="pi pi-check-square" style="font-size:11px"></i>
        </button>
        <div class="rte-sep"></div>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleBlockquote().run()"
                [class.rte-active]="editor.isActive('blockquote')" title="Blockquote">
          <i class="pi pi-comment" style="font-size:11px"></i>
        </button>
        <button type="button" class="rte-btn" (click)="editor.chain().focus().toggleCodeBlock().run()"
                [class.rte-active]="editor.isActive('codeBlock')" title="Code block">
          <i class="pi pi-code" style="font-size:11px"></i>
        </button>
        <button type="button" class="rte-btn" (click)="insertTable()" title="Insert table">
          <i class="pi pi-table" style="font-size:11px"></i>
        </button>
      </div>
      <tiptap-editor [editor]="editor" class="rte-content"></tiptap-editor>
    </div>
  `,
})
export class RichTextEditorComponent implements ControlValueAccessor, OnDestroy {
  @Input() placeholder = 'Nhập nội dung...';
  @Output() blurEditor = new EventEmitter<void>();

  isDisabled = false;
  private onChange: (val: TiptapDoc | null) => void = () => {};
  private onTouched: () => void = () => {};

  editor = new Editor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: this.placeholder }),
    ],
    onUpdate: ({ editor }) => {
      this.onChange(editor.isEmpty ? null : editor.getJSON());
    },
    onBlur: () => { this.onTouched(); this.blurEditor.emit(); },
  });

  writeValue(value: TiptapDoc | string | null): void {
    if (value && typeof value === 'object') {
      this.editor.commands.setContent(value, { emitUpdate: false });
    } else if (typeof value === 'string' && value) {
      this.editor.commands.setContent(
        { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] },
        { emitUpdate: false },
      );
    } else {
      this.editor.commands.clearContent(false);
    }
  }

  registerOnChange(fn: (val: TiptapDoc | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.isDisabled = isDisabled; }

  insertTable(): void {
    this.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  ngOnDestroy(): void { this.editor.destroy(); }
}
