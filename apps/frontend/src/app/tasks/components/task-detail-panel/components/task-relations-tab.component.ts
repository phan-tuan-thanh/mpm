import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import type { Task } from '@mpm/shared-types';

@Component({
  standalone: true,
  selector: 'app-task-relations-tab',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, PopoverModule],
  template: `
    <div class="p-2 space-y-4 text-sm">
      @for (group of relationGroups(); track group.type) {
        @if (group.relations.length > 0) {
          <div>
            <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">{{ group.label }}</h4>
            @for (rel of group.relations; track rel.id) {
              <div class="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-surface-800">
                <span class="font-mono text-xs text-gray-400">{{ rel.targetTask?.taskId }}</span>
                <span class="flex-1">{{ rel.targetTask?.title }}</span>
                <button pButton icon="pi pi-times" size="small" text severity="danger" (click)="deleteRelation.emit(rel.id)"></button>
              </div>
            }
          </div>
        }
      }
      <div class="border-t border-gray-100 pt-3">
        <h4 class="text-xs text-gray-500 mb-2">Thêm relation</h4>
        <div class="flex gap-2">
          <input pInputText class="flex-1 text-sm" placeholder="Task ID..." [(ngModel)]="newRelationTaskId" />
          <button
            type="button"
            (click)="relTypePop.toggle($event)"
            class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-surface-900 text-gray-800 dark:text-surface-100 font-semibold cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-all select-none"
          >
            <span class="truncate text-xs">{{ getRelationTypeLabel() }}</span>
            <i class="pi pi-chevron-down text-[10px] opacity-60 flex-shrink-0"></i>
          </button>
          <p-popover #relTypePop appendTo="body" styleClass="!p-0">
            <div class="pop-list w-36">
              @for (opt of relationTypeOptions; track opt.value) {
                <div
                  (click)="newRelationType = opt.value; relTypePop.hide()"
                  class="pop-item"
                  [class.selected]="newRelationType === opt.value"
                >
                  {{ opt.label }}
                </div>
              }
            </div>
          </p-popover>
          <button pButton label="Thêm" size="small" (click)="onAdd()" [disabled]="!newRelationTaskId.trim()"></button>
        </div>
      </div>
    </div>
  `,
})
export class TaskRelationsTabComponent {
  private readonly _task = signal<Task | null>(null);

  @Input() set task(v: Task | null) { this._task.set(v); }
  get task(): Task | null { return this._task(); }

  @Output() addRelation = new EventEmitter<{ targetTaskId: string; relationType: string }>();
  @Output() deleteRelation = new EventEmitter<string>();

  protected newRelationTaskId = '';
  protected newRelationType = 'relates_to';

  protected readonly relationTypeOptions = [
    { label: 'Blocking', value: 'blocking' },
    { label: 'Blocked by', value: 'blocked_by' },
    { label: 'Relates to', value: 'relates_to' },
    { label: 'Duplicate of', value: 'duplicate_of' },
  ];

  getRelationTypeLabel(): string {
    const found = this.relationTypeOptions.find((o) => o.value === this.newRelationType);
    return found ? found.label : 'Relates to';
  }

  protected readonly relationGroups = computed(() => {
    const t = this._task();
    if (!t) return [];
    const grouped: Record<string, any[]> = { blocking: [], blocked_by: [], relates_to: [], duplicate_of: [] };
    for (const r of t.relations ?? []) {
      if (grouped[r.relationType]) grouped[r.relationType].push(r);
    }
    return [
      { type: 'blocking', label: 'Blocking', relations: grouped['blocking'] },
      { type: 'blocked_by', label: 'Blocked by', relations: grouped['blocked_by'] },
      { type: 'relates_to', label: 'Relates to', relations: grouped['relates_to'] },
      { type: 'duplicate_of', label: 'Duplicate of', relations: grouped['duplicate_of'] },
    ];
  });

  protected onAdd(): void {
    if (this.newRelationTaskId.trim()) {
      this.addRelation.emit({
        targetTaskId: this.newRelationTaskId.trim(),
        relationType: this.newRelationType,
      });
      this.newRelationTaskId = '';
    }
  }
}
