# MPM Project — Claude Instructions

## Drag & Drop (BẮT BUỘC)

> Tài liệu đầy đủ: `docs/plans/2026-06-10-dnd-standard.md`
> **Mọi tính năng DnD phải tuân thủ 100% checklist dưới đây. Không được bỏ qua bất kỳ mục nào.**

### Quy tắc cứng (vi phạm = sai)

| Quy tắc | Chi tiết |
|---------|---------|
| Không dùng `cdkDragHandle` | Toàn bộ item là vùng kéo. Xóa `cdkDragHandle` nếu thấy. |
| `[cdkDropListSortingDisabled]="true"` | Bắt buộc trên mọi `cdkDropList`. Items không tự di chuyển khi kéo. |
| Ghost ngoài `cdkDrag` | `@if (draggedId === item.id)` + `opacity-25 pointer-events-none` đặt **trước** `<div cdkDrag>`. |
| Line indicator trong `cdkDrag` | `h-0.5 bg-indigo-600 dark:bg-indigo-500 absolute top-0 left-0 right-0 z-20 rounded-full`, hiện khi `draggedId && hoveredId === item.id && draggedId !== item.id`. |
| `*cdkDragPreview` | Clone compact bám theo con trỏ, bên trong `cdkDrag`. |
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
- [ ] Ghost div (opacity-25) đặt NGOÀI cdkDrag, trước nó
- [ ] Line indicator (h-0.5 bg-indigo-600) TRONG cdkDrag, position absolute top-0
- [ ] *cdkDragPreview compact (ID + title) bên trong cdkDrag
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

### Button sizing
Buttons fit nội dung, không dùng `flex-1`/fluid trừ form submit. Dùng `[fluid]="false"` cho pButton. Xem `memory/feedback_button_sizing.md`.

### Page layout
`flex flex-col h-full` + compact toolbar + scrollable content. KHÔNG dùng `max-w-* mx-auto p-6` bao ngoài. Xem `memory/feedback_page_layout.md`.
