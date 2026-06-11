import * as fs from 'fs';
import * as path from 'path';
import fc from 'fast-check';

/**
 * Bugfix spec: project-settings-tab-ui-consistency
 *
 * TASK 1 — Property 1: Bug Condition (TRƯỚC khi fix)
 * Loại bỏ header cấp trang lặp & đồng nhất root spacing.
 *
 * CRITICAL: Các assertion ở đây mã hoá HÀNH VI ĐÚNG KỲ VỌNG (Expected Behavior
 * Property 1 trong design). Trên code CHƯA fix chúng PHẢI FAIL — fail xác nhận
 * bug tồn tại. Chính test này sẽ được chạy lại ở task 3.5 để validate fix.
 *
 * Cách kiểm thử: bug là thuần cấu trúc template Angular (sự hiện diện của khối
 * `<h2>` tiêu đề cấp trang ở đầu template + token `space-y-*` của container ngoài
 * cùng). Ta lấy template của từng affected tab (file .html hoặc template inline
 * trong .ts), render vào DOM (jsdom), rồi truy vấn DOM bằng DOM API thật.
 *
 * Chuẩn tham chiếu: general-info-tab với STANDARD_ROOT_SPACING = 'space-y-5'.
 *
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2
 */

const STANDARD_ROOT_SPACING = 'space-y-5';

const SETTINGS_DIR = path.resolve(__dirname);

/** Mô tả render-state của một tab con (theo design: ChildTabRender). */
interface AffectedTab {
  /** Tên tab (khớp isBugCondition(tab)). */
  readonly name: string;
  /** Đường dẫn tới file chứa template (tương đối SETTINGS_DIR). */
  readonly sourceFile: string;
  /** Template nằm inline trong @Component({ template: `...` }) hay file .html riêng. */
  readonly inline: boolean;
  /** Tiêu đề cấp trang (page-level) hiện đang bị render lặp — kỳ vọng: bị loại bỏ. */
  readonly pageLevelTitle: string;
  /** Token space-y-* gốc hiện tại trên code chưa fix (để ghi nhận counterexample). */
  readonly currentRootSpacing: string;
}

/**
 * 7 affected tabs theo design. Chuẩn tham chiếu (general-info-tab) KHÔNG nằm ở đây
 * vì isBugCondition('general-info-tab') == false.
 */
const AFFECTED_TABS: readonly AffectedTab[] = [
  {
    name: 'states-tab',
    sourceFile: 'states-tab/states-tab.component.html',
    inline: false,
    pageLevelTitle: 'Trạng thái (States)',
    currentRootSpacing: 'space-y-6',
  },
  {
    name: 'priorities-tab',
    sourceFile: 'priorities-tab/priorities-tab.component.html',
    inline: false,
    pageLevelTitle: 'Mức ưu tiên',
    currentRootSpacing: 'space-y-6',
  },
  {
    name: 'estimates-tab',
    sourceFile: 'estimates-tab/estimates-tab.component.ts',
    inline: true,
    pageLevelTitle: 'Ước lượng (Estimates)',
    currentRootSpacing: 'space-y-5',
  },
  {
    name: 'features-tab',
    sourceFile: 'features-tab/features-tab.component.ts',
    inline: true,
    pageLevelTitle: 'Tính năng (Feature Flags)',
    currentRootSpacing: 'space-y-4',
  },
  {
    name: 'labels-tab',
    sourceFile: 'labels-tab/labels-tab.component.ts',
    inline: true,
    pageLevelTitle: 'Labels',
    currentRootSpacing: 'space-y-6',
  },
  {
    name: 'members-tab',
    sourceFile: 'members-tab/members-tab.component.ts',
    inline: true,
    pageLevelTitle: 'Thành viên dự án',
    currentRootSpacing: 'space-y-4',
  },
  {
    name: 'danger-zone-tab',
    sourceFile: 'danger-zone-tab/danger-zone-tab.component.ts',
    inline: true,
    pageLevelTitle: 'Danger Zone',
    currentRootSpacing: 'space-y-4',
  },
];

/** Đọc nội dung template thô của một tab (file .html hoặc inline trong .ts). */
function readTemplateSource(tab: AffectedTab): string {
  const full = path.join(SETTINGS_DIR, tab.sourceFile);
  const raw = fs.readFileSync(full, 'utf8');

  if (!tab.inline) {
    return raw;
  }

  // Trích chuỗi template literal inline: template: `...`
  // (Angular template không dùng ${} nên không có backtick lồng nhau.)
  const marker = 'template:';
  const markerIdx = raw.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error(`Không tìm thấy "template:" trong ${tab.sourceFile}`);
  }
  const open = raw.indexOf('`', markerIdx);
  const close = raw.indexOf('`', open + 1);
  if (open === -1 || close === -1) {
    throw new Error(`Không trích được template literal trong ${tab.sourceFile}`);
  }
  return raw.slice(open + 1, close);
}

/** Render template vào một DOM element thật (jsdom) để truy vấn bằng DOM API. */
function renderTemplate(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

/** Kết quả phân tích DOM của một tab sau render. */
interface RenderResult {
  /** Có còn render khối tiêu đề cấp trang (h2 chứa pageLevelTitle) hay không. */
  hasDuplicatePageHeader: boolean;
  /** Token space-y-* của container ngoài cùng. */
  rootSpacingToken: string | null;
}

function analyzeTab(tab: AffectedTab): RenderResult {
  const host = renderTemplate(readTemplateSource(tab));

  // (a) Phát hiện header cấp trang: bất kỳ <h2> nào chứa đúng tiêu đề tab.
  const h2s = Array.from(host.querySelectorAll('h2'));
  const hasDuplicatePageHeader = h2s.some(
    (h) => (h.textContent ?? '').trim() === tab.pageLevelTitle,
  );

  // (b) Token root spacing: trên container ngoài cùng.
  // LƯU Ý (jsdom custom-element parsing): KHÔNG dùng `host.firstElementChild` để
  // định vị root. jsdom (HTML parser của nó) chỉ coi các thẻ void/SVG là tự đóng;
  // custom element tự đóng như `<p-toast />`, `<p-confirmDialog />` ở đầu một số
  // template (vd labels-tab inline) KHÔNG được coi là self-closing → chúng trở
  // thành wrapper bọc toàn bộ phần nội dung sau nó, khiến `firstElementChild` trỏ
  // vào `<p-toast>` (không mang class `space-y-*`) và trả về null sai.
  // Thay vào đó tìm phần tử ĐẦU TIÊN theo document order có class `space-y-*`.
  // Vì root container là ancestor của nội dung bên trong nên nó luôn xuất hiện
  // trước trong document order → được chọn đúng cho cả 7 affected tab.
  const root = host.querySelector('[class*="space-y-"]') as HTMLElement | null;
  const rootSpacingToken =
    Array.from(root?.classList ?? []).find((c) => /^space-y-\d+$/.test(c)) ?? null;

  return { hasDuplicatePageHeader, rootSpacingToken };
}

describe('Project Settings tabs — UI consistency [Bug Condition / Property 1]', () => {
  // ── Per-tab deterministic cases (scoped, ổn định để tái lập counterexample) ──
  describe.each(AFFECTED_TABS.map((t) => [t.name, t] as const))(
    '%s',
    (_name, tab) => {
      it(`KHÔNG còn render header cấp trang "${tab.pageLevelTitle}" ở đầu template`, () => {
        const { hasDuplicatePageHeader } = analyzeTab(tab);
        // Expected Behavior Property 1: không header cấp trang lặp.
        expect(hasDuplicatePageHeader).toBe(false);
      });

      it(`root spacing token == '${STANDARD_ROOT_SPACING}' (đồng nhất với general-info-tab)`, () => {
        const { rootSpacingToken } = analyzeTab(tab);
        // Expected Behavior Property 1: spacing gốc đồng nhất == space-y-5.
        expect(rootSpacingToken).toBe(STANDARD_ROOT_SPACING);
      });
    },
  );

  // ── Scoped property-based test: iterate qua tập 7 affected tabs ──
  it('Property 1 — mọi affected tab: không header cấp trang lặp + root spacing chuẩn', () => {
    fc.assert(
      fc.property(fc.constantFrom(...AFFECTED_TABS), (tab) => {
        const result = analyzeTab(tab);
        // For all tab WHERE isBugCondition(tab): sau fix
        //   ASSERT NOT result.hasDuplicatePageHeader
        //   ASSERT result.rootSpacingToken == STANDARD_ROOT_SPACING
        expect(result.hasDuplicatePageHeader).toBe(false);
        expect(result.rootSpacingToken).toBe(STANDARD_ROOT_SPACING);
      }),
      { numRuns: 50 },
    );
  });
});
