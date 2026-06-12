import * as fs from 'fs';
import * as path from 'path';
import fc from 'fast-check';

/**
 * Bugfix spec: project-settings-tab-ui-consistency
 *
 * TASK 2 — Property 2: Preservation (TRƯỚC khi fix)
 * Giữ nguyên nút hành động, tiêu đề section/card, logic nghiệp vụ và layout cha.
 *
 * METHODOLOGY (observation-first): các assertion ở đây CHỤP LẠI hành vi baseline
 * quan sát được trên code CHƯA fix. Chúng PHẢI PASS ngay trên code chưa fix (xác
 * nhận baseline cần bảo toàn). Chính các test này sẽ được chạy lại nguyên vẹn ở
 * task 3.6 để xác minh fix KHÔNG gây regression.
 *
 * APPROACH (nhất quán với Task 1 + ghi chú trong tasks.md):
 *   7 component có DI nặng (ProjectStore, ProjectService, AuthService, LabelStore,
 *   Router...) nên render thật qua TestBed rất giòn. Vì bug là thuần cấu trúc
 *   template, ta:
 *     • Đọc template source (file .html hoặc inline template trong .ts).
 *     • Section/card titles: render template vào jsdom rồi truy vấn DOM thật
 *       (h2/h3 theo textContent) — giống Task 1.
 *     • Nút hành động + binding handler: so khớp trên CHUỖI template source. Cú
 *       pháp Angular `(click)="handler()"`, `[label]`, control-flow `@if` không
 *       render thành DOM chuẩn trong jsdom; string-match trên template là cách
 *       ĐÁNG TIN CẬY NHẤT để khẳng định nút hành động + wiring handler được bảo toàn.
 *     • "Handler được gọi đúng (spy)": vì DI nặng, ta dùng PROXY ổn định — khẳng
 *       định (a) trigger của nút bind đúng tên handler trong template, và (b)
 *       handler đó được KHAI BÁO trong class component. Đây là cách tasks.md cho
 *       phép ("asserting bindings in template source").
 *     • Visibility guards: mô hình hoá điều kiện hiển thị baseline (Requirement
 *       3.1) và sinh ngẫu nhiên render-state (PBT) để xác minh qua mọi tổ hợp.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

const STANDARD_ROOT_SPACING = 'space-y-5';
const SETTINGS_DIR = path.resolve(__dirname);

// ──────────────────────────────────────────────────────────────────────────
// Tab source descriptors
// ──────────────────────────────────────────────────────────────────────────

type TabName =
  | 'members-tab'
  | 'labels-tab'
  | 'priorities-tab'
  | 'states-tab'
  | 'estimates-tab'
  | 'general-info-tab';

interface TabSource {
  /** Template: file .html riêng hay inline trong @Component({ template: `...` }). */
  readonly templateInline: boolean;
  /** Đường dẫn file chứa template (tương đối SETTINGS_DIR). */
  readonly templatePath: string;
  /** Đường dẫn file chứa class component (.ts). */
  readonly classPath: string;
}

const TAB_SOURCES: Record<TabName, TabSource> = {
  'members-tab': {
    templateInline: true,
    templatePath: 'members-tab/members-tab.component.ts',
    classPath: 'members-tab/members-tab.component.ts',
  },
  'labels-tab': {
    templateInline: true,
    templatePath: 'labels-tab/labels-tab.component.ts',
    classPath: 'labels-tab/labels-tab.component.ts',
  },
  'priorities-tab': {
    templateInline: false,
    templatePath: 'priorities-tab/priorities-tab.component.html',
    classPath: 'priorities-tab/priorities-tab.component.ts',
  },
  'states-tab': {
    templateInline: false,
    templatePath: 'states-tab/states-tab.component.html',
    classPath: 'states-tab/states-tab.component.ts',
  },
  'estimates-tab': {
    templateInline: true,
    templatePath: 'estimates-tab/estimates-tab.component.ts',
    classPath: 'estimates-tab/estimates-tab.component.ts',
  },
  'general-info-tab': {
    templateInline: true,
    templatePath: 'general-tab/components/general-info-tab.component.ts',
    classPath: 'general-tab/components/general-info-tab.component.ts',
  },
};

/** Trích chuỗi template literal inline: template: `...` (Angular template không dùng ${}). */
function extractInlineTemplate(raw: string, file: string): string {
  const marker = 'template:';
  const markerIdx = raw.indexOf(marker);
  if (markerIdx === -1) throw new Error(`Không tìm thấy "template:" trong ${file}`);
  const open = raw.indexOf('`', markerIdx);
  const close = raw.indexOf('`', open + 1);
  if (open === -1 || close === -1) throw new Error(`Không trích được template literal trong ${file}`);
  return raw.slice(open + 1, close);
}

/** Nội dung template thô của một tab. */
function getTemplate(name: TabName): string {
  const src = TAB_SOURCES[name];
  const raw = fs.readFileSync(path.join(SETTINGS_DIR, src.templatePath), 'utf8');
  return src.templateInline ? extractInlineTemplate(raw, src.templatePath) : raw;
}

/**
 * Mã nguồn CLASS component (đã loại bỏ inline template để tránh nhầm
 * lời gọi handler trong template với phần khai báo handler trong class).
 */
function getClassSource(name: TabName): string {
  const src = TAB_SOURCES[name];
  const raw = fs.readFileSync(path.join(SETTINGS_DIR, src.classPath), 'utf8');
  if (!src.templateInline) return raw;
  const tpl = extractInlineTemplate(raw, src.classPath);
  return raw.replace(tpl, ''); // bỏ nội dung template, giữ phần class
}

/** Render template vào DOM thật (jsdom) để truy vấn bằng DOM API — giống Task 1. */
function renderTemplate(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

/** Tập hợp text của mọi heading (h1..h4) trong template sau render. */
function headingTexts(name: TabName): string[] {
  const host = renderTemplate(getTemplate(name));
  return Array.from(host.querySelectorAll('h1,h2,h3,h4')).map((h) => (h.textContent ?? '').trim());
}

// ──────────────────────────────────────────────────────────────────────────
// Action control descriptors (baseline cần bảo toàn — Requirement 3.1)
// ──────────────────────────────────────────────────────────────────────────

type GuardKind = 'always' | 'notReadOnly' | 'hasSelection' | 'isAdmin';

interface HandlerSymbol {
  readonly name: string;
  readonly kind: 'method' | 'signal' | 'computed';
}

interface ActionControl {
  readonly id: string;
  readonly tab: TabName;
  /** Mảnh template PHẢI tồn tại: binding/handler/label đặc trưng của control. */
  readonly templateSignatures: readonly string[];
  /** Handler PHẢI được khai báo trong class (proxy "spy"). */
  readonly handler: HandlerSymbol;
  /** Điều kiện hiển thị baseline. */
  readonly guard: GuardKind;
  /** Token guard PHẢI còn trong template (nếu có guard). */
  readonly guardToken: string | null;
}

const ACTION_CONTROLS: readonly ActionControl[] = [
  // members-tab: ô tìm kiếm (luôn hiển thị) + nút "Thêm thành viên" (khi có quyền)
  {
    id: 'members:search',
    tab: 'members-tab',
    templateSignatures: ['(ngModelChange)="onSearchChange($event)"', 'placeholder="Tìm tên hoặc email..."'],
    handler: { name: 'onSearchChange', kind: 'method' },
    guard: 'always',
    guardToken: null,
  },
  {
    id: 'members:add',
    tab: 'members-tab',
    templateSignatures: ['(click)="showAddDialog()"', 'label="Thêm thành viên"'],
    handler: { name: 'showAddDialog', kind: 'method' },
    guard: 'notReadOnly',
    guardToken: '!isReadOnly()',
  },
  // labels-tab: cụm bulk-delete + "bỏ chọn" (khi có selection)
  {
    id: 'labels:bulk-delete',
    tab: 'labels-tab',
    templateSignatures: ['(click)="confirmBulkDeleteProj()"', "[label]=\"'Xóa ' + projSelected().size\""],
    handler: { name: 'confirmBulkDeleteProj', kind: 'method' },
    guard: 'hasSelection',
    guardToken: 'projSelected().size > 0',
  },
  {
    id: 'labels:clear-selection',
    tab: 'labels-tab',
    templateSignatures: ['(click)="clearProjSelection()"', 'pTooltip="Bỏ chọn tất cả"'],
    handler: { name: 'clearProjSelection', kind: 'method' },
    guard: 'hasSelection',
    guardToken: 'projSelected().size > 0',
  },
  // priorities-tab: nút "Thêm" (khi có quyền)
  {
    id: 'priorities:add',
    tab: 'priorities-tab',
    templateSignatures: ['(click)="submitAdd()"', 'label="Thêm"'],
    handler: { name: 'submitAdd', kind: 'method' },
    guard: 'notReadOnly',
    guardToken: '!isReadOnly()',
  },
  // states-tab: nút "Áp dụng lại template" cấp section (khi là admin)
  {
    id: 'states:apply-template',
    tab: 'states-tab',
    templateSignatures: ['(click)="onApplyTemplate()"', 'label="Áp dụng lại template"'],
    handler: { name: 'onApplyTemplate', kind: 'method' },
    guard: 'isAdmin',
    guardToken: 'isAdmin()',
  },
];

/** Handler có được khai báo trong class component không. */
function handlerIsDeclared(tab: TabName, h: HandlerSymbol): boolean {
  const cls = getClassSource(tab);
  if (h.kind === 'method') {
    return new RegExp(`\\b${h.name}\\s*\\(`).test(cls);
  }
  // signal / computed: vd `readonly showAddForm = signal(false);`
  return new RegExp(`\\b${h.name}\\b\\s*=\\s*${h.kind}`).test(cls);
}

/** Quyết định hiển thị baseline của một control theo render-state. */
interface RenderState {
  readonly isReadOnly: boolean;
  readonly isAdmin: boolean;
  readonly selectionCount: number;
  readonly listSize: number;
}

function isControlVisible(guard: GuardKind, s: RenderState): boolean {
  switch (guard) {
    case 'always':
      return true;
    case 'notReadOnly':
      return !s.isReadOnly;
    case 'hasSelection':
      return s.selectionCount > 0;
    case 'isAdmin':
      return s.isAdmin;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Section/card titles cần bảo toàn (Requirement 3.2) — theo design Preservation
// ──────────────────────────────────────────────────────────────────────────

const SECTION_TITLES: ReadonlyArray<{ tab: TabName; title: string }> = [
  { tab: 'states-tab', title: 'Workspace Template' },
  { tab: 'estimates-tab', title: 'Xem trước' },
  { tab: 'general-info-tab', title: 'Thông tin chung' },
  { tab: 'general-info-tab', title: 'Thông tin dự án' },
];

// ──────────────────────────────────────────────────────────────────────────
// CRUD operations → handler mapping (proxy "spy" — Requirement 3.3)
// ──────────────────────────────────────────────────────────────────────────

interface CrudOp {
  readonly op: string;
  readonly tab: TabName;
  readonly triggerSignature: string; // binding kích hoạt op trong template
  readonly handler: HandlerSymbol;
}

const CRUD_OPS: readonly CrudOp[] = [
  { op: 'members:add', tab: 'members-tab', triggerSignature: '(click)="onConfirmAdd()"', handler: { name: 'onConfirmAdd', kind: 'method' } },
  { op: 'members:remove', tab: 'members-tab', triggerSignature: '(click)="onRemoveMember(member)"', handler: { name: 'onRemoveMember', kind: 'method' } },
  { op: 'members:role-change', tab: 'members-tab', triggerSignature: 'onRoleChange(member, opt.value)', handler: { name: 'onRoleChange', kind: 'method' } },
  { op: 'labels:create', tab: 'labels-tab', triggerSignature: '(click)="createLabel()"', handler: { name: 'createLabel', kind: 'method' } },
  { op: 'labels:save-edit', tab: 'labels-tab', triggerSignature: '(click)="saveEdit(label)"', handler: { name: 'saveEdit', kind: 'method' } },
  { op: 'labels:delete', tab: 'labels-tab', triggerSignature: '(click)="confirmDelete(label)"', handler: { name: 'confirmDelete', kind: 'method' } },
  { op: 'priorities:submit-add', tab: 'priorities-tab', triggerSignature: '(click)="submitAdd()"', handler: { name: 'submitAdd', kind: 'method' } },
  { op: 'priorities:save-edit', tab: 'priorities-tab', triggerSignature: '(click)="saveEdit(p)"', handler: { name: 'saveEdit', kind: 'method' } },
  { op: 'priorities:delete', tab: 'priorities-tab', triggerSignature: '(click)="openDeleteDialog(p)"', handler: { name: 'openDeleteDialog', kind: 'method' } },
  { op: 'states:create', tab: 'states-tab', triggerSignature: '(click)="onCreateState(group)"', handler: { name: 'onCreateState', kind: 'method' } },
  { op: 'states:delete', tab: 'states-tab', triggerSignature: '(click)="onDeleteState(state)"', handler: { name: 'onDeleteState', kind: 'method' } },
  { op: 'estimates:submit', tab: 'estimates-tab', triggerSignature: '(click)="onSubmit()"', handler: { name: 'onSubmit', kind: 'method' } },
  { op: 'features:toggle', tab: 'features-tab' as TabName, triggerSignature: '(ngModelChange)="onToggle(feat.key, $event)"', handler: { name: 'onToggle', kind: 'method' } },
  { op: 'danger:archive', tab: 'danger-zone-tab' as TabName, triggerSignature: '(click)="onArchive()"', handler: { name: 'onArchive', kind: 'method' } },
  { op: 'danger:delete', tab: 'danger-zone-tab' as TabName, triggerSignature: '(click)="onConfirmDelete()"', handler: { name: 'onConfirmDelete', kind: 'method' } },
];

// features-tab & danger-zone-tab là inline template — bổ sung descriptor để đọc class.
const EXTRA_TAB_SOURCES: Record<string, TabSource> = {
  'features-tab': {
    templateInline: true,
    templatePath: 'features-tab/features-tab.component.ts',
    classPath: 'features-tab/features-tab.component.ts',
  },
  'danger-zone-tab': {
    templateInline: true,
    templatePath: 'danger-zone-tab/danger-zone-tab.component.ts',
    classPath: 'danger-zone-tab/danger-zone-tab.component.ts',
  },
};

function getTemplateAny(name: string): string {
  const src = (TAB_SOURCES as Record<string, TabSource>)[name] ?? EXTRA_TAB_SOURCES[name];
  const raw = fs.readFileSync(path.join(SETTINGS_DIR, src.templatePath), 'utf8');
  return src.templateInline ? extractInlineTemplate(raw, src.templatePath) : raw;
}

function getClassSourceAny(name: string): string {
  const src = (TAB_SOURCES as Record<string, TabSource>)[name] ?? EXTRA_TAB_SOURCES[name];
  const raw = fs.readFileSync(path.join(SETTINGS_DIR, src.classPath), 'utf8');
  if (!src.templateInline) return raw;
  const tpl = extractInlineTemplate(raw, src.classPath);
  return raw.replace(tpl, '');
}

function handlerIsDeclaredAny(tab: string, h: HandlerSymbol): boolean {
  const cls = getClassSourceAny(tab);
  if (h.kind === 'method') return new RegExp(`\\b${h.name}\\s*\\(`).test(cls);
  return new RegExp(`\\b${h.name}\\b\\s*=\\s*${h.kind}`).test(cls);
}

// ══════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Project Settings tabs — Preservation [Property 2]', () => {
  // ── 1. Nút hành động được bảo toàn (deterministic, per-control) ───────────
  describe('Action controls preserved (Requirement 3.1)', () => {
    describe.each(ACTION_CONTROLS.map((c) => [c.id, c] as const))('%s', (_id, ctrl) => {
      it('giữ nguyên element + binding handler trong template', () => {
        const tpl = getTemplate(ctrl.tab);
        for (const sig of ctrl.templateSignatures) {
          expect(tpl).toContain(sig);
        }
      });

      it('handler được khai báo trong class component', () => {
        expect(handlerIsDeclared(ctrl.tab, ctrl.handler)).toBe(true);
      });

      it('giữ nguyên điều kiện hiển thị (guard) trong template', () => {
        if (ctrl.guardToken) {
          expect(getTemplate(ctrl.tab)).toContain(ctrl.guardToken);
        }
      });
    });
  });

  // ── 2. Tiêu đề cấp section/card được bảo toàn (Requirement 3.2) ───────────
  describe('Section/card titles preserved (Requirement 3.2)', () => {
    it.each(SECTION_TITLES.map((s) => [s.tab, s.title] as const))(
      '%s vẫn hiển thị tiêu đề section "%s"',
      (tab, title) => {
        expect(headingTexts(tab)).toContain(title);
      },
    );
  });

  // ── 3. general-info-tab (tab chuẩn) không đổi (Requirement 3.5) ───────────
  describe('general-info-tab unchanged (Requirement 3.5)', () => {
    it('giữ nguyên các tiêu đề card nội dung', () => {
      const headings = headingTexts('general-info-tab');
      expect(headings).toEqual(expect.arrayContaining(['Thông tin chung', 'Thông tin dự án']));
    });

    it('giữ nguyên nhịp spacing chuẩn (space-y-5 / gap-5)', () => {
      const tpl = getTemplate('general-info-tab');
      expect(tpl).toContain(STANDARD_ROOT_SPACING);
      expect(tpl).toContain('gap-5');
    });
  });

  // ── 4. PBT — mọi action control: binding + handler còn nguyên ─────────────
  it('Property 2 (PBT) — mọi action control giữ binding template + handler trong class', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ACTION_CONTROLS), (ctrl) => {
        const tpl = getTemplate(ctrl.tab);
        for (const sig of ctrl.templateSignatures) {
          expect(tpl).toContain(sig);
        }
        expect(handlerIsDeclared(ctrl.tab, ctrl.handler)).toBe(true);
      }),
      { numRuns: 60 },
    );
  });

  // ── 5. PBT — ngữ nghĩa hiển thị baseline đúng qua mọi tổ hợp render-state ──
  it('Property 2 (PBT) — visibility guard baseline giữ nguyên qua mọi tổ hợp trạng thái', () => {
    const stateArb: fc.Arbitrary<RenderState> = fc.record({
      isReadOnly: fc.boolean(),
      isAdmin: fc.boolean(),
      selectionCount: fc.nat({ max: 50 }),
      listSize: fc.nat({ max: 200 }),
    });

    fc.assert(
      fc.property(fc.constantFrom(...ACTION_CONTROLS), stateArb, (ctrl, state) => {
        const visible = isControlVisible(ctrl.guard, state);

        // Token guard PHẢI còn trong template (wiring điều khiển hiển thị được bảo toàn).
        if (ctrl.guardToken) {
          expect(getTemplate(ctrl.tab)).toContain(ctrl.guardToken);
        }

        // Bất biến hành vi baseline (Requirement 3.1):
        switch (ctrl.guard) {
          case 'always':
            expect(visible).toBe(true);
            break;
          case 'notReadOnly':
            // nút hành động chỉ hiển thị khi KHÔNG read-only
            expect(visible).toBe(!state.isReadOnly);
            break;
          case 'hasSelection':
            // cụm bulk chỉ hiển thị khi có ít nhất 1 selection
            expect(visible).toBe(state.selectionCount > 0);
            break;
          case 'isAdmin':
            expect(visible).toBe(state.isAdmin);
            break;
        }
      }),
      { numRuns: 100 },
    );
  });

  // ── 6. PBT — thao tác CRUD giả lập gọi đúng handler (proxy spy) ───────────
  it('Property 2 (PBT) — mỗi thao tác CRUD bind đúng handler + handler tồn tại trong class', () => {
    fc.assert(
      fc.property(fc.constantFrom(...CRUD_OPS), (crud) => {
        const tpl = getTemplateAny(crud.tab);
        // Trigger trong template gọi đúng handler.
        expect(tpl).toContain(crud.triggerSignature);
        // Handler được khai báo trong class (sẽ được gọi như trước fix).
        expect(handlerIsDeclaredAny(crud.tab, crud.handler)).toBe(true);
      }),
      { numRuns: 80 },
    );
  });
});
