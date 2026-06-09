import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import type {
  Task,
  TaskListItem,
  SectionCollapseState,
  Label,
  ProjectModule,
} from '@mpm/shared-types';
import type { MemberResponse, ProjectState } from '@mpm/shared-types';
import type { PropertyFieldConfig } from '../inline-property-editor/inline-property-editor.component';

import { CollapsibleSectionComponent } from '../collapsible-section/collapsible-section.component';
import { InlinePropertyEditorComponent } from '../inline-property-editor/inline-property-editor.component';
import { MetadataFooterComponent } from '../metadata-footer/metadata-footer.component';
import { ParentNavigationComponent } from '../parent-navigation/parent-navigation.component';
import { buildDetailFields, buildStructureFields, getTaskFieldValue } from './properties-sidebar.helpers';

/**
 * PropertiesSidebarComponent — Container cho toàn bộ sidebar properties
 *
 * Nhóm thuộc tính thành 2 collapsible sections:
 * - "Chi tiết": State, Priority, Assignees, Start Date, Due Date, Estimate
 * - "Cấu trúc": Parent task, Labels, Modules
 *
 * Tích hợp MetadataFooterComponent ở cuối (ngoài sections).
 * Collapse state được điều khiển bởi parent qua Input/Output.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.5, 9.1, 10.1
 */
@Component({
  standalone: true,
  selector: 'app-properties-sidebar',
  imports: [
    CollapsibleSectionComponent,
    InlinePropertyEditorComponent,
    MetadataFooterComponent,
    ParentNavigationComponent,
  ],
  template: `
    <!-- ═══ Section "Chi tiết" (Req 3.1, 3.2) ═══ -->
    <app-collapsible-section
      title="Chi tiết"
      sectionKey="details"
      [expanded]="detailsExpanded()"
      (expandedChange)="onSectionToggled('details', $event)"
    >
      @for (field of detailFields(); track field.field) {
        <app-inline-property-editor
          [config]="field"
          [value]="getFieldValue(field.field)"
          [saveFn]="saveFn"
          (valueChanged)="onPropertyChanged($event)"
        />
      }
    </app-collapsible-section>

    <!-- ═══ Section "Cấu trúc" (Req 3.1, 3.3) ═══ -->
    <app-collapsible-section
      title="Cấu trúc"
      sectionKey="structure"
      [expanded]="structureExpanded()"
      (expandedChange)="onSectionToggled('structure', $event)"
    >
      <!-- Parent task (Req 10.1) -->
      <div class="px-3 py-1.5">
        <div class="flex items-center gap-2 min-h-[36px]">
          <span class="text-xs text-gray-500 dark:text-surface-400 w-[100px] shrink-0 uppercase tracking-wide">
            Parent
          </span>
          <div class="flex-1 min-w-0">
            <app-parent-navigation
              [parent]="task?.parent ?? null"
              [currentTaskType]="task?.type ?? 'task'"
              [availableTasks]="availableParentTasks"
              [currentTaskId]="task?.id ?? ''"
              (parentClicked)="parentClicked.emit($event)"
              (parentChanged)="parentChanged.emit($event)"
            />
          </div>
        </div>
      </div>

      <!-- Labels, Modules (Req 3.3) -->
      @for (field of structureFields(); track field.field) {
        <app-inline-property-editor
          [config]="field"
          [value]="getFieldValue(field.field)"
          [saveFn]="saveFn"
          (valueChanged)="onPropertyChanged($event)"
        />
      }
    </app-collapsible-section>

    <!-- ═══ Metadata Footer (Req 9.1, 6.5) ═══ -->
    <app-metadata-footer
      [createdAt]="task?.createdAt ?? null"
      [updatedAt]="task?.updatedAt ?? null"
      [creatorName]="task?.reporter?.displayName ?? null"
    />
  `,
})
export class PropertiesSidebarComponent implements OnChanges {
  // ─── Inputs ──────────────────────────────────────────────────────────────

  /** Task hiện tại */
  @Input() task: Task | null = null;

  /** Danh sách states cho dropdown */
  @Input() states: ProjectState[] = [];

  /** Danh sách members cho multi-select assignees */
  @Input() members: MemberResponse[] = [];

  /** Danh sách labels */
  @Input() labels: Label[] = [];

  /** Danh sách modules */
  @Input() modules: ProjectModule[] = [];

  /** Danh sách tasks có thể chọn làm parent */
  @Input() availableParentTasks: TaskListItem[] = [];

  /** Collapse state — controlled by parent/service */
  @Input() collapseState: SectionCollapseState = { details: true, structure: true };

  /** Save function từ parent — dùng cho InlinePropertyEditor */
  @Input() saveFn?: (field: string, value: unknown) => Promise<boolean>;

  // ─── Outputs ─────────────────────────────────────────────────────────────

  /** Emit khi property thay đổi */
  @Output() propertyChanged = new EventEmitter<{ field: string; value: unknown }>();

  /** Emit khi parent thay đổi */
  @Output() parentChanged = new EventEmitter<string | null>();

  /** Emit khi click vào parent link → navigate */
  @Output() parentClicked = new EventEmitter<string>();

  /** Emit khi section collapse state thay đổi */
  @Output() sectionToggled = new EventEmitter<{ key: string; expanded: boolean }>();

  // ─── Internal signals ────────────────────────────────────────────────────

  private readonly _collapseState = signal<SectionCollapseState>({ details: true, structure: true });
  private readonly _states = signal<ProjectState[]>([]);
  private readonly _members = signal<MemberResponse[]>([]);
  private readonly _labels = signal<Label[]>([]);
  private readonly _modules = signal<ProjectModule[]>([]);

  /** "Chi tiết" section expanded state */
  readonly detailsExpanded = computed(() => this._collapseState()['details'] !== false);

  /** "Cấu trúc" section expanded state */
  readonly structureExpanded = computed(() => this._collapseState()['structure'] !== false);

  /** PropertyFieldConfig array cho section "Chi tiết" (Req 3.2) */
  readonly detailFields = computed<PropertyFieldConfig[]>(() => {
    return buildDetailFields(this._states(), this._members());
  });

  /** PropertyFieldConfig array cho section "Cấu trúc" (Labels, Modules — Req 3.3) */
  readonly structureFields = computed<PropertyFieldConfig[]>(() => {
    return buildStructureFields(this._labels(), this._modules());
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collapseState']) {
      this._collapseState.set(this.collapseState);
    }
    if (changes['states']) {
      this._states.set(this.states);
    }
    if (changes['members']) {
      this._members.set(this.members);
    }
    if (changes['labels']) {
      this._labels.set(this.labels);
    }
    if (changes['modules']) {
      this._modules.set(this.modules);
    }
  }

  // ─── Public methods ──────────────────────────────────────────────────────

  /** Lấy giá trị field từ task hiện tại */
  getFieldValue(field: string): unknown {
    return getTaskFieldValue(this.task, field);
  }

  /** Handle property value changed — relay to parent */
  onPropertyChanged(event: { field: string; value: unknown }): void {
    this.propertyChanged.emit(event);
  }

  /** Handle section toggle — emit event for parent to persist */
  onSectionToggled(key: string, expanded: boolean): void {
    this._collapseState.update((state) => ({ ...state, [key]: expanded }));
    this.sectionToggled.emit({ key, expanded });
  }
}
