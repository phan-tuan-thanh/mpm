# MPM Project — Claude Instructions

## Drag & Drop (BẮT BUỘC)

> Tài liệu đầy đủ: `docs/plans/2026-06-10-dnd-standard.md`
> **Mọi tính năng DnD phải tuân thủ 100% checklist dưới đây. Không được bỏ qua bất kỳ mục nào.**

### Quy tắc cứng (vi phạm = sai)

| Quy tắc | Chi tiết |
|---------|---------|
| Không dùng `cdkDragHandle` | Toàn bộ item là vùng kéo. Xóa `cdkDragHandle` nếu thấy. |
| `[cdkDropListSortingDisabled]="true"` | Bắt buộc trên mọi `cdkDropList`. Items không tự di chuyển khi kéo. |
| Ghost ngoài `cdkDrag` | `@if (draggedId === item.id)` + `opacity-70 pointer-events-none bg-gray-50/50 dark:bg-surface-800/20` (giữ màu nền hover) đặt **trước** `<div cdkDrag>`. |
| Line indicator trong `cdkDrag` | `h-0.5 bg-indigo-600 dark:bg-indigo-500 absolute top-0 left-0 right-0 z-20 rounded-full`, hiện khi `draggedId && hoveredId === item.id && draggedId !== item.id`. |
| `*cdkDragPreview` | Clone bám theo con trỏ (hỗ trợ `[matchSize]="true"`, giới hạn `max-width: 320px` để tương tự item gốc), bên trong `cdkDrag`. |
| `*cdkDragPlaceholder` | `<div *cdkDragPlaceholder></div>` rỗng, bên trong `cdkDrag`. |
| End drop zone | Div sau vòng lặp item, `(mouseenter)="hoveredId='end'"`, có line indicator khi hover. |
| `(mouseleave)` trên `cdkDrag` | `hoveredId === item.id ? hoveredId = null : null` — bắt buộc để clear state. |
| `cursor-grab active:cursor-grabbing` | Trên element `cdkDrag`. |
| `(pointerdown)="$event.stopPropagation()"` | Trên **mọi** button, input, color picker bên trong `cdkDrag`. |
| CSS transition | `::ng-deep .cdk-drop-list-dragging .cdk-drag { transition: none !important; }` trong component CSS. |

### Checklist khi implement DnD mới

```
- [ ] cdkDropList có [cdkDropListSortingDisabled]="true"
- [ ] KHÔNG có cdkDragHandle ở bất kỳ đâu
- [ ] Ghost div (opacity-70, giữ màu nền hover) đặt NGOÀI cdkDrag, trước nó
- [ ] Line indicator (h-0.5 bg-indigo-600) TRONG cdkDrag, position absolute top-0
- [ ] *cdkDragPreview bên trong cdkDrag (sử dụng matchSize và max-width giới hạn nếu cần)
- [ ] <div *cdkDragPlaceholder></div> rỗng bên trong cdkDrag
- [ ] End zone div sau @for loop với hoveredId='end' và line indicator
- [ ] (mouseenter) và (mouseleave) trên cdkDrag để track hoveredId
- [ ] cursor-grab active:cursor-grabbing trên cdkDrag
- [ ] (pointerdown)="$event.stopPropagation()" trên mọi button/input trong item
- [ ] CSS: transition: none !important cho .cdk-drop-list-dragging .cdk-drag
```

### Pattern onDrop chuẩn (hover-based, không dùng event.currentIndex)

```typescript
protected draggedId: string | null = null;
protected hoveredId: string | null = null;

onDragStart(id: string): void { this.draggedId = id; }
onDragEnd(): void { setTimeout(() => { this.draggedId = null; this.hoveredId = null; }, 100); }

onDrop(event: CdkDragDrop<Item[]>): void {
  const dragId = this.draggedId;
  const hoverId = this.hoveredId;
  this.draggedId = null;
  this.hoveredId = null;
  if (!dragId || !hoverId || dragId === hoverId) return;
  // tính toán vị trí mới dựa trên hoverId ('end' → append cuối)
}
```

---

## UI Conventions

### Dark mode
Mọi class màu Tailwind phải có `dark:` variant. Xem `memory/feedback_darkmode_colors.md`.

**Popover/overlay content:** KHÔNG dùng `:host-context(.dark)` cho hover/selected trong popover — fail khi overlay bị portal ra body. Dùng PrimeNG tokens: `var(--p-content-hover-background)`, `var(--p-highlight-background)`, `var(--p-highlight-color)`.

### Icon picker (kho dùng chung)
KHÔNG tự khai báo danh sách icon trong component. Mọi nơi cần chọn icon (priority, sprint, project...) dùng `app-icon-picker-panel` (shared/components/icon-picker-panel) với input `context` để lọc nhóm phù hợp. Kho icon ở `icon-picker.constants.ts` — chỉ PrimeIcons (bundled, MIT). KHÔNG nhúng icon từ Flaticon/nguồn ngoài (license không cho phép redistribute).

### Primary color theo theme configurator (Sakai)
Màu primary do user chọn ở theme configurator (topbar). KHÔNG hardcode hex indigo (`#6366f1`, `#4f46e5`, `#818cf8`...) trong style/template — dùng `var(--p-primary-color)` / `var(--p-primary-500)` v.v. Class Tailwind `indigo-*` đã được remap sang token primary trong `styles.css` nên vẫn dùng được, nhưng code mới ưu tiên utilities của `tailwindcss-primeui`: `bg-primary`, `text-primary`, `text-primary-contrast`, `bg-highlight`. Chart.js (canvas) là ngoại lệ duy nhất được dùng hex.

### Button sizing
Buttons fit nội dung, không dùng `flex-1`/fluid trừ form submit. Dùng `[fluid]="false"` cho pButton. Xem `memory/feedback_button_sizing.md`.

### Page layout
`flex flex-col h-full` + compact toolbar + scrollable content. KHÔNG dùng `max-w-* mx-auto p-6` bao ngoài. Xem `memory/feedback_page_layout.md`.

### Overlay trong dialog (BẮT BUỘC)
Mọi PrimeNG overlay component (`p-select`, `p-multiselect`, `p-datepicker`, `p-autocomplete`, `p-treeselect`...) đặt trong `p-dialog` hoặc container có overflow PHẢI có `appendTo="body"`. Nếu không, panel sẽ bị dialog che/cắt. Xem `memory/feedback_overlay_appendto.md`.

### Dropdowns / Select (BẮT BUỘC)
KHÔNG sử dụng component select truyền thống (`<select>` mặc định hoặc `<p-select>`) cho các lựa chọn thông thường trong toàn bộ UI của ứng dụng. Bắt buộc phải thiết kế Dropdown theo hình thức: một Button/Pill hiển thị giá trị hiện tại kèm icon chevron xuống (`pi-chevron-down`), khi click sẽ hiển thị một `p-popover` chứa danh sách các lựa chọn (`.pop-list` và `.pop-item`) để đảm bảo trải nghiệm thống nhất (giống như trong Cấu hình Task Detail, Backlog Toolbar và Display Properties).

### Sliders / InputNumber (BẮT BUỘC)
KHÔNG sử dụng component nhập số thông thường (`<input type="number">` mặc định hoặc `<p-inputnumber>`) cho các cấu hình số lượng, giới hạn trong UI. Bắt buộc phải thiết kế dạng thanh trượt `<p-slider>` kết hợp một nhãn hiển thị số lượng hiện tại bên phải để người dùng dễ thao tác trực quan (giống như trong Display Properties).

### Segment Switchers / Toggle Buttons (BẮT BUỘC)
Đối với các cấu hình lựa chọn 1 trong 2 (hoặc tối đa 3) tùy chọn loại trừ lẫn nhau (ví dụ: Terminology, Capacity Mode, Theme Presets...), KHÔNG sử dụng dropdown hay các nút bấm rời rạc. Bắt buộc phải sử dụng bộ chuyển đổi phân đoạn `<p-selectbutton>` (`SelectButtonModule`) hiển thị các tùy chọn sát nhau trên một hàng ngang để tối ưu giao diện và đem lại trải nghiệm tương tác mượt mà.

### Localization / Text hiển thị (BẮT BUỘC)

> **Mọi text hiển thị trong giao diện PHẢI đi qua `CustomTranslationService.t()`. Không được hardcode chuỗi vi/en trực tiếp trong template hoặc computed.**

#### Quy tắc cứng

| Quy tắc | Chi tiết |
|---------|---------|
| KHÔNG hardcode string UI | Không viết `'Thêm task'`, `'Add task'`, `'Cancel'`, `'Hủy'`... trực tiếp trong template hay method. |
| Bắt buộc dùng `ct.t(key, default)` | Mọi label, placeholder, tooltip, toast message, confirm text đều phải dùng `CustomTranslationService.t()`. |
| Đăng ký key vào `DEFAULT_TRANSLATIONS` | Mọi key mới phải được thêm vào mảng `DEFAULT_TRANSLATIONS` trong `custom-translation.service.ts` với đầy đủ `vi` và `en`. |
| Đặt trong `computed()` | Gọi `ct.t()` bên trong `computed(() => { const isEn = ...; const ct = this.customTrans; return { ... }; })` để reactivity hoạt động đúng khi ngôn ngữ thay đổi. |
| Chuỗi động giữ inline | Chuỗi có tham số động (count, tên...) vẫn dùng arrow function inline trong computed: `confirmMsg: (count: number) => isEn ? \`Delete \${count} items?\` : \`Xóa \${count} mục?\`` |

#### Pattern chuẩn

```typescript
import { CustomTranslationService } from '...shared/services/custom-translation.service';

private readonly customTrans = inject(CustomTranslationService);

readonly t = computed(() => {
  const isEn = this.projectStore.projectLanguage() === 'en';
  const ct = this.customTrans;
  return {
    addBtn:      ct.t('feature.addBtn',      isEn ? 'Add'    : 'Thêm'),
    cancelBtn:   ct.t('feature.cancelBtn',   isEn ? 'Cancel' : 'Hủy'),
    placeholder: ct.t('feature.placeholder', isEn ? 'Search...' : 'Tìm kiếm...'),
    // Chuỗi động — không dùng ct.t():
    deleteConfirm: (count: number) => isEn ? `Delete ${count} items?` : `Xóa ${count} mục?`,
  };
});
```

#### Checklist khi thêm text mới vào component

```
- [ ] Thêm key vào DEFAULT_TRANSLATIONS (cả vi lẫn en)
- [ ] inject CustomTranslationService vào component
- [ ] Đặt ct.t() trong computed() — KHÔNG gọi ngoài computed
- [ ] Template dùng t().key thay vì hardcode string
- [ ] Chuỗi có tham số động → arrow function trong computed, không dùng ct.t()
- [ ] Key đặt theo namespace: 'feature.actionName' (ví dụ: 'backlog.addBtn', 'task-detail.cancelBtn')
```


