# Theme System: Full Light/Dark + Color Presets

**Nguồn tham chiếu:** `gui/sakai-ng/src/app/layout/`  
**Target:** `apps/frontend/src/app/layout/`

## Hiện trạng

| Tính năng | sakai-ng | apps/frontend |
|---|---|---|
| Dark mode toggle | ✅ `.app-dark` | ✅ `.dark` |
| **Tailwind `dark:` variant đúng** | ✅ | ❌ **BUG** |
| Preset (Aura/Lara/Nora) | ✅ | ❌ |
| Primary color picker | ✅ | ❌ |
| Surface color picker | ✅ | ❌ |
| Menu Mode Static/Overlay | ✅ | ❌ |
| Palette button topbar | ✅ | ❌ |
| Persist to localStorage | ✅ | chỉ có dark_mode |

**Điểm khác biệt quan trọng:** `apps/frontend` dùng `.dark` (Tailwind standard), `main.ts` đã có `darkModeSelector: '.dark'` → không cần đổi.

---

## BUG QUAN TRỌNG: Tailwind dark mode không hoạt động

### Triệu chứng

Trong `apps/frontend`, khi user click nút toggle dark mode:
- ✅ PrimeNG components chuyển sang dark (vì `darkModeSelector: '.dark'` trong `main.ts`)
- ❌ Tailwind `dark:` classes (54 trong layout, 117 trong tasks) **không phản ứng** với `.dark` class

### Nguyên nhân gốc rễ

**Tailwind v4 mặc định dùng `@media (prefers-color-scheme: dark)` cho variant `dark:`**, không phải class-based. `styles.css` thiếu khai báo custom variant:

```css
/* THIẾU dòng này trong styles.css */
@custom-variant dark (&:where(.dark, .dark *));
```

Hệ quả: toàn bộ `dark:bg-*`, `dark:text-*`, `dark:border-*` trong app phản ứng theo **OS setting**, không theo nút toggle của app.

### Fix

Thêm vào **đầu** `apps/frontend/src/styles.css`, ngay sau `@import "tailwindcss"`:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));  ← THÊM DÒNG NÀY
```

Đây là **bước đầu tiên phải làm** trước tất cả các bước khác.

---

## Các file cần thay đổi

### 1. `apps/frontend/src/app/layout/services/layout.service.ts` — Cập nhật

Thêm vào interface config:
```ts
preset: 'Aura' | 'Lara' | 'Nora'   // default: 'Aura'
primary: string                      // default: 'emerald'
surface: string | null               // default: null
menuMode: 'static' | 'overlay'      // default: 'static'
```

- Load tất cả từ `localStorage` khi khởi tạo
- Dùng `effect()` để gọi `$t().preset(preset).preset(getPresetExt()).surfacePalette(surfacePalette).use({ useDefaultOptions: true })` khi preset/color thay đổi
- Giữ nguyên: `isDarkMode`, `isCollapsed`, `fullBleed`, `getAdaptiveColor()`, `getTextColor()`

**API imports cần thêm:**
```ts
import { $t, updatePreset, updateSurfacePalette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
```

---

### 2. `apps/frontend/src/app/layout/theme-config/theme-config.component.ts` — Tạo mới

Port từ `gui/sakai-ng/src/app/layout/component/app.configurator.ts`:

**UI sections:**
- **Primary** — 17 circles: noir + 16 màu (emerald → rose). Click → `updatePreset(getPresetExt())`
- **Surface** — 8 circles: slate, gray, zinc, neutral, stone, soho, viva, ocean. Click → `updateSurfacePalette(palette)`
- **Presets** — SelectButton: Aura | Lara | Nora. Change → `$t().preset().use()`
- **Menu Mode** — SelectButton: Static | Overlay. Change → `layoutService.menuMode.set(...)`

**Host class:** absolute dropdown panel, `hidden` by default (controlled via `pStyleClass`)

---

### 3. `apps/frontend/src/app/layout/app-shell/topbar/topbar.component.ts` — Cập nhật

Thêm sau nút dark mode:
```html
<div class="relative">
  <p-button
    icon="pi pi-palette"
    pStyleClass="@next"
    enterFromClass="hidden"
    enterActiveClass="animate-scalein"
    leaveToClass="hidden"
    leaveActiveClass="animate-fadeout"
    [hideOnOutsideClick]="true"
    [rounded]="true"
    severity="secondary"
  />
  <app-theme-config />
</div>
```

Import thêm: `StyleClassModule`, `ThemeConfigComponent`

---

### 4. `apps/frontend/src/app/layout/app-shell/app-shell.component.ts` — Cập nhật

Phản ứng với `menuMode` signal:

```ts
containerClass = computed(() => ({
  'menu-overlay': layoutService.menuMode() === 'overlay',
  'menu-static':  layoutService.menuMode() === 'static',
  'overlay-active': layoutService.isOverlayActive(),   // new signal
}))
```

- `menu-static` → sidebar là flex-child, đẩy content (hành vi hiện tại)
- `menu-overlay` → sidebar là `absolute left-0 top-0 z-50 h-full` + backdrop mask
- Click backdrop → `layoutService.closeOverlayMenu()`

---

### 5. `apps/frontend/src/app/layout/app-shell/sidebar/sidebar.component.ts` — Cập nhật nhỏ

Thêm signal/input phản ứng với `menuMode`:
- Overlay mode: sidebar có `fixed` positioning + animation slide-in

---

## Thứ tự implementation

1. **[BUG FIX]** `styles.css` — thêm `@custom-variant dark` → fix Tailwind dark mode
2. Nâng cấp `LayoutService` — thêm signals + theme apply logic
3. Tạo `ThemeConfigComponent`
4. Cập nhật `TopbarComponent` — thêm palette button
5. Cập nhật `AppShellComponent` + `SidebarComponent` — menu mode behavior
6. Kiểm tra dark mode + all presets hoạt động đúng

---

## Lưu ý kỹ thuật

- `getPresetExt()` — hàm tính semantic extension dựa trên preset + màu primary. Cần port nguyên vẹn từ sakai-ng (3 variant: noir, Nora, và còn lại).
- `getAdaptiveColor()` trong `LayoutService` hiện tại dùng cho label colors, không liên quan đến preset — giữ nguyên.
- PrimeNG `SelectButtonModule` cần import từ `primeng/selectbutton`.
