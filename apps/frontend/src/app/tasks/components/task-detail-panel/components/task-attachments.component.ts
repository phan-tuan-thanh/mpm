import {
  Component, Output, EventEmitter, inject, signal, computed, input, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AttachmentService } from '../../../services/attachment.service';
import type { TaskAttachment } from '@mpm/shared-types';
import { ProjectStore } from '../../../../projects/state/project.store';

interface DisplayGroup {
  key: string;    // 'g:Title' for real, 'p:Title' for pending
  title: string;
  isPending: boolean;
  items: TaskAttachment[];
}

interface DropPos {
  context: 'group-list' | 'group-files' | 'ungrouped' | 'ungroup-zone';
  groupKey?: string;
  index: number;
}

interface AttachmentUpdate {
  id: string;
  title?: string | null;
  sortOrder?: number;
}

@Component({
  standalone: true,
  selector: 'app-task-attachments',
  imports: [CommonModule, FormsModule, ButtonModule, TooltipModule],
  styles: [`
    .drop-line { height: 2px; border-radius: 9999px; transition: background-color 0.1s; background: transparent; }
    .drop-line.show { background: var(--p-primary-color); }
  `],
  template: `
    <div class="mt-4 px-2"
         (dragover)="!disabled() && $event.preventDefault()"
         (drop)="!disabled() && onDrop($event)">

       <!-- Header -->
      <div class="flex items-center gap-1 mb-2 cursor-pointer select-none group"
           (click)="collapsed.set(!collapsed())">
        <i class="pi text-[9px] text-gray-400 dark:text-surface-500 transition-transform duration-150"
           [class.pi-chevron-right]="collapsed()"
           [class.pi-chevron-down]="!collapsed()"></i>
        <span class="text-xs text-gray-500 dark:text-surface-400 uppercase tracking-wide font-semibold
                     group-hover:text-gray-700 dark:group-hover:text-surface-200 transition-colors">
          {{ t().attachments }} ({{ attachments().length }})
        </span>
      </div>

      @if (!collapsed()) {

      <!-- Drop line before first group -->
      @if (!disabled()) {
        <div class="drop-line my-px mx-1"
             [class.show]="isGroupLine(0)"></div>
      }

      <!-- Named groups -->
      @for (group of namedGroups(); let gi = $index; track group.key) {

        <div
          class="mb-0.5 rounded border transition-colors"
          [class.border-transparent]="!isFileDropOnGroup(group.key)"
          [class.border-indigo-200]="!disabled() && isFileDropOnGroup(group.key)"
          [class.dark:border-indigo-700]="!disabled() && isFileDropOnGroup(group.key)"
          [class.opacity-30]="dragItem()?.type === 'group' && dragItem()?.key === group.key"
          (dragover)="!disabled() && $event.preventDefault()"
          (drop)="!disabled() && onDrop($event)"
        >
          <!-- Group header — drag handle for group, drop zone for files -->
          <div
            class="flex items-center gap-1.5 px-1.5 py-1 text-xs font-semibold
                   text-gray-700 dark:text-surface-200 select-none rounded-t"
            [class.cursor-grab]="!disabled() && !group.isPending && dragItem()?.type !== 'file'"
            [class.cursor-default]="disabled() || group.isPending"
            [attr.draggable]="!disabled() && !group.isPending && dragItem()?.type !== 'file' ? 'true' : null"
            (dragstart)="onDragStartGroup($event, group)"
            (dragend)="clearDrag()"
            (dragover)="!disabled() && onDragOverGroupHeader($event, group, gi)"
            (drop)="!disabled() && onDrop($event)"
          >
            <i class="pi pi-folder text-xs text-gray-400 dark:text-surface-500 flex-shrink-0" [class.cursor-grab]="!disabled()"></i>
            <span class="flex-1 truncate">{{ group.title }}</span>
            <span class="text-[10px] font-normal text-gray-400 dark:text-surface-500 shrink-0">
              ({{ group.items.length }})
            </span>
            @if (!disabled()) {
              <button pButton icon="pi pi-plus" size="small" severity="secondary" text
                      [pTooltip]="t().addFileToGroup" tooltipPosition="top"
                      (click)="onAddFilesToGroup(group)"></button>
              <button pButton icon="pi pi-trash" size="small" severity="danger" text
                      [pTooltip]="t().deleteGroup" tooltipPosition="left"
                      (click)="onDeleteGroup(group)"></button>
            }
          </div>

          <!-- Files in group -->
          <div class="pl-2 pr-0.5 pb-0.5">
            @if (!disabled()) {
              <div class="drop-line my-px mx-1"
                   [class.show]="isFileLine(group.key, 0)"></div>
            }

            @for (att of group.items; let fi = $index; track att.id) {
              <div
                class="flex items-center gap-2 py-0.5 rounded transition-opacity"
                [class.opacity-30]="dragItem()?.type === 'file' && dragItem()?.key === att.id"
                [class.cursor-grab]="!disabled()"
                [class.cursor-default]="disabled()"
                [attr.draggable]="!disabled() ? 'true' : null"
                (dragstart)="onDragStartFile($event, att, group.key)"
                (dragend)="clearDrag()"
                (dragover)="!disabled() && onDragOverFile($event, group.key, fi)"
                (drop)="!disabled() && onDrop($event)"
              >
                <i class="pi pi-paperclip text-[10px] text-gray-400 dark:text-surface-500 flex-shrink-0"></i>
                <a [href]="attachmentService.getDownloadUrl(projectId(), taskId(), att.id)"
                   draggable="false"
                   class="flex-1 min-w-0 truncate text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                   (click)="$event.stopPropagation()">
                  {{ att.originalName }}
                </a>
                @if (duplicateNames().has(att.originalName)) {
                  <i class="pi pi-exclamation-triangle text-[10px] text-yellow-500 dark:text-yellow-400 flex-shrink-0"
                     [pTooltip]="t().duplicateWarningLabel" tooltipPosition="top"></i>
                }
                <span class="text-[10px] text-gray-400 dark:text-surface-500 shrink-0">{{ formatSize(att.sizeBytes) }}</span>
                @if (!disabled()) {
                  <button pButton icon="pi pi-times" size="small" severity="danger" text
                          (click)="delete.emit(att)"></button>
                }
              </div>

              @if (!disabled()) {
                <div class="drop-line my-px mx-1"
                     [class.show]="isFileLine(group.key, fi + 1)"></div>
              }
            }

            @if (group.isPending && group.items.length === 0 && !disabled()) {
              <div class="py-1 px-1 text-[10px] text-gray-400 dark:text-surface-500 italic">
                {{ t().addFileTip }}
              </div>
            }
          </div>
        </div>

        <!-- Drop line after group -->
        @if (!disabled()) {
          <div class="drop-line my-px mx-1"
               [class.show]="isGroupLine(gi + 1)"></div>
        }
      }

      <!-- Ungrouped files -->
      @if (ungroupedFiles().length > 0) {
        <div class="mt-0.5">
          @if (!disabled()) {
            <div class="drop-line my-px mx-1"
                 [class.show]="isUngroupedLine(0)"></div>
          }

          @for (att of ungroupedFiles(); let ui = $index; track att.id) {
            <div
              class="flex items-center gap-2 py-1 rounded transition-opacity"
              [class.opacity-30]="dragItem()?.type === 'file' && dragItem()?.key === att.id"
              [class.cursor-grab]="!disabled()"
              [class.cursor-default]="disabled()"
              [attr.draggable]="!disabled() ? 'true' : null"
              (dragstart)="onDragStartFile($event, att, '__ung__')"
              (dragend)="clearDrag()"
              (dragover)="!disabled() && onDragOverUngrouped($event, ui)"
              (drop)="!disabled() && onDrop($event)"
            >
              <i class="pi pi-paperclip text-xs text-gray-400 dark:text-surface-500 flex-shrink-0"></i>
              <a [href]="attachmentService.getDownloadUrl(projectId(), taskId(), att.id)"
                 class="flex-1 min-w-0 truncate text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                 (click)="$event.stopPropagation()">
                {{ att.originalName }}
              </a>
              @if (duplicateNames().has(att.originalName)) {
                <i class="pi pi-exclamation-triangle text-xs text-yellow-500 dark:text-yellow-400 flex-shrink-0"
                   [pTooltip]="t().duplicateWarningLabel" tooltipPosition="top"></i>
              }
              <span class="text-xs text-gray-400 dark:text-surface-500 shrink-0">{{ formatSize(att.sizeBytes) }}</span>
              @if (!disabled()) {
                <button pButton icon="pi pi-times" size="small" severity="danger" text
                        (click)="delete.emit(att)"></button>
              }
            </div>

            @if (!disabled()) {
              <div class="drop-line my-px mx-1"
                   [class.show]="isUngroupedLine(ui + 1)"></div>
            }
          }
        </div>
      }

      <!-- Ungroup drop zone: shown when dragging a titled file -->
      @if (!disabled() && isDraggingTitledFile()) {
        <div
          class="mt-1 flex items-center gap-1.5 py-1.5 px-2 rounded border border-dashed
                 text-xs transition-colors cursor-default"
          [class.border-orange-300]="dropPos()?.context === 'ungroup-zone'"
          [class.border-gray-200]="dropPos()?.context !== 'ungroup-zone'"
          [class.dark:border-surface-600]="dropPos()?.context !== 'ungroup-zone'"
          [class.bg-orange-50]="dropPos()?.context === 'ungroup-zone'"
          [class.dark:bg-orange-950]="dropPos()?.context === 'ungroup-zone'"
          [class.text-orange-500]="dropPos()?.context === 'ungroup-zone'"
          [class.text-gray-400]="dropPos()?.context !== 'ungroup-zone'"
          [class.dark:text-surface-500]="dropPos()?.context !== 'ungroup-zone'"
          (dragover)="$event.preventDefault(); dropPos.set({ context: 'ungroup-zone', index: 0 })"
          (dragleave)="onUngroupZoneDragLeave($event)"
          (drop)="onDrop($event)"
        >
          <i class="pi pi-times-circle text-xs"></i>
          <span>{{ t().ungroup }}</span>
        </div>
      }

      <!-- New group inline input -->
      @if (!disabled() && newGroupMode()) {
        <div class="flex items-center gap-1.5 mt-2">
          <i class="pi pi-folder text-xs text-indigo-400 flex-shrink-0"></i>
          <input
            #newGroupNameInput
            type="text"
            [(ngModel)]="newGroupTitle"
            [placeholder]="t().groupNamePlaceholder"
            class="flex-1 rounded border border-indigo-300 dark:border-indigo-600
                   bg-white dark:bg-surface-800 px-2 py-[4px] text-xs
                   text-gray-700 dark:text-surface-100
                   focus:outline-none focus:border-indigo-500"
            (keydown.enter)="confirmNewGroup()"
            (keydown.escape)="cancelNewGroup()"
          />
          <button pButton icon="pi pi-check" size="small" severity="success" text
                  (click)="confirmNewGroup()"></button>
          <button pButton icon="pi pi-times" size="small" severity="secondary" text
                  (click)="cancelNewGroup()"></button>
        </div>
      }

      <!-- Upload conflict warning -->
      @if (uploadWarnings().length) {
        <div class="flex items-start gap-1.5 mt-2 px-2 py-1.5 rounded
                    bg-yellow-50 dark:bg-yellow-950/40
                    border border-yellow-200 dark:border-yellow-800 text-xs">
          <i class="pi pi-exclamation-triangle text-yellow-500 dark:text-yellow-400 mt-px flex-shrink-0"></i>
          <span class="text-yellow-700 dark:text-yellow-300 flex-1">
            {{ t().fileAlreadyExists }}: <strong>{{ uploadWarnings().join(', ') }}</strong>
          </span>
          <button class="text-yellow-500 dark:text-yellow-400 hover:text-yellow-700 leading-none flex-shrink-0"
                  (click)="uploadWarnings.set([])">
            <i class="pi pi-times text-[10px]"></i>
          </button>
        </div>
      }

      <!-- Controls: create group + upload ungrouped -->
      @if (!disabled()) {
        <div class="flex items-center gap-2 mt-2 pt-1.5 border-t border-gray-100 dark:border-surface-700">
          @if (!newGroupMode()) {
            <button pButton [label]="t().createGroup" icon="pi pi-folder-plus" size="small"
                    severity="secondary" text [fluid]="false"
                    (click)="startNewGroup()"></button>
          }

          <label class="flex items-center gap-1 text-xs text-gray-500 dark:text-surface-400
                         hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
            <input #ungroupedInput type="file" class="hidden" multiple
                   (change)="onUngroupedFileChange($event)" />
            <i class="pi pi-upload text-[10px]"></i>
            <span>{{ t().upload }}</span>
          </label>
        </div>
      }

      <!-- Shared file input for per-group uploads -->
      <input #groupFileInput type="file" class="hidden" multiple
             (change)="onGroupFileChange($event)" />

      } <!-- end @if (!collapsed()) -->
    </div>
  `,
})
export class TaskAttachmentsComponent {
  @ViewChild('groupFileInput') private groupFileInputRef!: ElementRef<HTMLInputElement>;

  readonly attachmentService = inject(AttachmentService);
  private readonly projectStore = inject(ProjectStore);

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      attachments: 'Attachments',
      addFileToGroup: 'Add file to group',
      deleteGroup: 'Delete group',
      duplicateWarning: 'Trùng tên với file khác', // wait, let's keep original meaning "Trùng tên với file khác" -> "Duplicate filename"
      duplicateWarningLabel: 'Duplicate file name',
      addFileTip: 'Press + to add file',
      ungroup: 'Ungroup',
      groupNamePlaceholder: 'Group name...',
      fileAlreadyExists: 'File already exists',
      createGroup: 'Create group',
      upload: 'Upload file'
    } : {
      attachments: 'Tài liệu đính kèm',
      addFileToGroup: 'Thêm file vào nhóm',
      deleteGroup: 'Xóa nhóm',
      duplicateWarningLabel: 'Trùng tên với file khác',
      addFileTip: 'Nhấn + để thêm file',
      ungroup: 'Bỏ khỏi nhóm',
      groupNamePlaceholder: 'Tên nhóm...',
      fileAlreadyExists: 'File đã tồn tại',
      createGroup: 'Tạo nhóm',
      upload: 'Upload file'
    };
  });

  readonly projectId = input<string>('');
  readonly taskId = input<string>('');
  readonly attachments = input<TaskAttachment[]>([]);
  readonly disabled = input<boolean>(false);

  @Output() upload = new EventEmitter<{ files: FileList; title: string }>();
  @Output() delete = new EventEmitter<TaskAttachment>();
  @Output() deleteGroup = new EventEmitter<TaskAttachment[]>();
  @Output() batchUpdate = new EventEmitter<AttachmentUpdate[]>();

  // Collapsed state
  protected readonly collapsed = signal(false);

  // Group creation
  protected readonly pendingGroups = signal<string[]>([]);
  protected readonly newGroupMode = signal(false);
  protected newGroupTitle = '';

  // Per-group upload
  protected readonly activeGroupKey = signal<string | null>(null);

  // Duplicate / conflict warnings
  protected readonly uploadWarnings = signal<string[]>([]);

  // Drag state
  protected readonly dragItem = signal<{
    type: 'group' | 'file';
    key: string;
    fromGroupKey: string;
  } | null>(null);
  protected readonly dropPos = signal<DropPos | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────

  protected readonly namedGroups = computed<DisplayGroup[]>(() => {
    const atts = this.attachments();
    const pending = this.pendingGroups();

    const sorted = [...atts]
      .filter(a => a.title)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const groupMap = new Map<string, TaskAttachment[]>();
    const orderedTitles: string[] = [];

    for (const att of sorted) {
      if (att.title) {
        if (!groupMap.has(att.title)) orderedTitles.push(att.title);
        const list = groupMap.get(att.title) ?? [];
        list.push(att);
        groupMap.set(att.title, list);
      }
    }

    const result: DisplayGroup[] = orderedTitles.map(t => ({
      key: `g:${t}`, title: t, isPending: false, items: groupMap.get(t)!,
    }));

    for (const t of pending) {
      if (!groupMap.has(t)) {
        result.push({ key: `p:${t}`, title: t, isPending: true, items: [] });
      }
    }

    return result;
  });

  protected readonly ungroupedFiles = computed<TaskAttachment[]>(() =>
    [...this.attachments()]
      .filter(a => !a.title)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  );

  protected readonly isDraggingTitledFile = computed(() => {
    const item = this.dragItem();
    if (item?.type !== 'file') return false;
    return item.fromGroupKey !== '__ung__';
  });

  protected readonly duplicateNames = computed<Set<string>>(() => {
    const counts = new Map<string, number>();
    for (const a of this.attachments()) {
      counts.set(a.originalName, (counts.get(a.originalName) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n));
  });

  // ── Drop-line helpers (called from template) ───────────────────────────────

  protected isGroupLine(index: number): boolean {
    const pos = this.dropPos();
    return !!(pos && pos.context === 'group-list' && pos.index === index);
  }

  protected isFileLine(groupKey: string, index: number): boolean {
    const pos = this.dropPos();
    return !!(pos && pos.context === 'group-files' && pos.groupKey === groupKey && pos.index === index);
  }

  protected isUngroupedLine(index: number): boolean {
    const pos = this.dropPos();
    return !!(pos && pos.context === 'ungrouped' && pos.index === index);
  }

  protected isFileDropOnGroup(groupKey: string): boolean {
    const pos = this.dropPos();
    return !!(pos && pos.context === 'group-files' && pos.groupKey === groupKey
      && this.dragItem()?.fromGroupKey !== groupKey);
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  protected onDragStartGroup(event: DragEvent, group: DisplayGroup): void {
    if (this.disabled()) return;
    this.dragItem.set({ type: 'group', key: group.key, fromGroupKey: '' });
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', group.key);
    }
  }

  protected onDragStartFile(event: DragEvent, att: TaskAttachment, fromGroupKey: string): void {
    if (this.disabled()) return;
    this.dragItem.set({ type: 'file', key: att.id, fromGroupKey });
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', att.id);
    }
  }

  protected onDragOverGroupHeader(event: DragEvent, group: DisplayGroup, gi: number): void {
    if (this.disabled()) return;
    event.preventDefault();
    const item = this.dragItem();
    if (!item) return;

    if (item.type === 'group') {
      const half = this.getHalf(event);
      this.dropPos.set({ context: 'group-list', index: half === 'top' ? gi : gi + 1 });
    } else {
      // File dragged over group header → append to this group
      this.dropPos.set({ context: 'group-files', groupKey: group.key, index: group.items.length });
    }
  }

  protected onDragOverFile(event: DragEvent, groupKey: string, fi: number): void {
    if (this.disabled()) return;
    event.preventDefault();
    const item = this.dragItem();
    if (item?.type !== 'file') return;
    const half = this.getHalf(event);
    this.dropPos.set({ context: 'group-files', groupKey, index: half === 'top' ? fi : fi + 1 });
  }

  protected onDragOverUngrouped(event: DragEvent, ui: number): void {
    if (this.disabled()) return;
    event.preventDefault();
    const item = this.dragItem();
    if (item?.type !== 'file') return;
    const half = this.getHalf(event);
    this.dropPos.set({ context: 'ungrouped', index: half === 'top' ? ui : ui + 1 });
  }

  protected onUngroupZoneDragLeave(event: DragEvent): void {
    const el = event.currentTarget as Element;
    if (!el.contains(event.relatedTarget as Node)) {
      if (this.dropPos()?.context === 'ungroup-zone') this.dropPos.set(null);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const item = this.dragItem();
    const pos = this.dropPos();
    this.clearDrag();
    if (!item || !pos) return;
    this.executeReorder(item, pos);
  }

  protected clearDrag(): void {
    this.dragItem.set(null);
    this.dropPos.set(null);
  }

  // ── Reorder logic ─────────────────────────────────────────────────────────

  private executeReorder(
    item: NonNullable<ReturnType<typeof this.dragItem>>,
    pos: DropPos,
  ): void {
    // Deep-clone the mutable state
    const groups: DisplayGroup[] = this.namedGroups().map(g => ({
      ...g, items: [...g.items],
    }));
    const ungrouped = [...this.ungroupedFiles()];

    if (item.type === 'group') {
      if (pos.context !== 'group-list') return;
      const srcIdx = groups.findIndex(g => g.key === item.key);
      if (srcIdx < 0) return;
      const [src] = groups.splice(srcIdx, 1);
      // Adjust insertion index after removal
      const insertAt = srcIdx < pos.index ? pos.index - 1 : pos.index;
      groups.splice(insertAt, 0, src);

    } else {
      // File movement
      const att = this.attachments().find(a => a.id === item.key);
      if (!att) return;

      // Remove from source
      if (item.fromGroupKey === '__ung__') {
        const idx = ungrouped.findIndex(a => a.id === item.key);
        if (idx >= 0) ungrouped.splice(idx, 1);
      } else {
        const srcGroup = groups.find(g => g.key === item.fromGroupKey);
        if (srcGroup) srcGroup.items = srcGroup.items.filter(a => a.id !== item.key);
      }

      if (pos.context === 'group-files') {
        const tg = groups.find(g => g.key === pos.groupKey);
        if (!tg) return;
        // Adjust index: if moving within same group and src was before target
        let insertAt = pos.index;
        if (item.fromGroupKey === pos.groupKey) {
          const oldIdx = this.namedGroups()
            .find(g => g.key === pos.groupKey)?.items
            .findIndex(a => a.id === item.key) ?? -1;
          if (oldIdx >= 0 && oldIdx < pos.index) insertAt = pos.index - 1;
        }
        // No-op check
        if (item.fromGroupKey === pos.groupKey) {
          const origIdx = this.namedGroups()
            .find(g => g.key === pos.groupKey)?.items
            .findIndex(a => a.id === item.key) ?? -1;
          if (insertAt === origIdx) return;
        }
        tg.items.splice(Math.max(0, insertAt), 0, { ...att, title: tg.title });

      } else if (pos.context === 'ungrouped') {
        let insertAt = pos.index;
        if (item.fromGroupKey === '__ung__') {
          const oldIdx = this.ungroupedFiles().findIndex(a => a.id === item.key);
          if (oldIdx >= 0 && oldIdx < pos.index) insertAt = pos.index - 1;
          if (insertAt === oldIdx) return;
        }
        ungrouped.splice(Math.max(0, insertAt), 0, { ...att, title: null });

      } else if (pos.context === 'ungroup-zone') {
        ungrouped.push({ ...att, title: null });
      }
    }

    this.commitOrder(groups, ungrouped);
  }

  private commitOrder(groups: DisplayGroup[], ungrouped: TaskAttachment[]): void {
    const updates: AttachmentUpdate[] = [];
    let order = 0;

    for (const group of groups) {
      for (const att of group.items) {
        const newTitle = group.title || null;
        const newOrder = order++;
        if (att.sortOrder !== newOrder || att.title !== newTitle) {
          updates.push({ id: att.id, title: newTitle, sortOrder: newOrder });
        }
      }
    }
    for (const att of ungrouped) {
      const newOrder = order++;
      if (att.sortOrder !== newOrder || att.title !== null) {
        updates.push({ id: att.id, title: null, sortOrder: newOrder });
      }
    }

    if (updates.length) this.batchUpdate.emit(updates);
  }

  // ── Group creation ────────────────────────────────────────────────────────

  protected startNewGroup(): void {
    this.newGroupTitle = '';
    this.newGroupMode.set(true);
  }

  protected confirmNewGroup(): void {
    const t = this.newGroupTitle.trim();
    if (!t) { this.cancelNewGroup(); return; }
    const exists = this.namedGroups().some(g => g.title === t);
    if (!exists) {
      this.pendingGroups.update(prev => [...prev, t]);
    }
    this.cancelNewGroup();
  }

  protected cancelNewGroup(): void {
    this.newGroupMode.set(false);
    this.newGroupTitle = '';
  }

  protected onDeleteGroup(group: DisplayGroup): void {
    if (group.isPending) {
      this.pendingGroups.update(prev => prev.filter(t => t !== group.title));
    } else {
      this.deleteGroup.emit(group.items);
    }
  }

  // ── File upload ───────────────────────────────────────────────────────────

  protected onAddFilesToGroup(group: DisplayGroup): void {
    this.activeGroupKey.set(group.key);
    this.groupFileInputRef.nativeElement.value = '';
    this.groupFileInputRef.nativeElement.click();
  }

  protected onGroupFileChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    const key = this.activeGroupKey();
    this.activeGroupKey.set(null);
    if (!files?.length || !key) return;

    const group = this.namedGroups().find(g => g.key === key);
    if (!group) return;

    this.warnConflicts(files);
    this.upload.emit({ files, title: group.title });

    if (group.isPending) {
      this.pendingGroups.update(prev => prev.filter(t => t !== group.title));
    }
  }

  protected onUngroupedFileChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files?.length) return;
    this.warnConflicts(files);
    this.upload.emit({ files, title: '' });
    (event.target as HTMLInputElement).value = '';
  }

  private warnConflicts(files: FileList): void {
    const existing = new Set(this.attachments().map(a => a.originalName));
    const conflicts = Array.from(files).map(f => f.name).filter(n => existing.has(n));
    if (conflicts.length) {
      this.uploadWarnings.set(conflicts);
      setTimeout(() => this.uploadWarnings.set([]), 6000);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getHalf(event: DragEvent): 'top' | 'bottom' {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
