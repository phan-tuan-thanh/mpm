# Drag & Drop Standard — MPM Frontend

> **Phạm vi:** Toàn bộ tính năng drag-and-drop trong `apps/frontend/`
> **Ngày:** 2026-06-10

---

## 1. Nguyên tắc bắt buộc

| # | Quy tắc | Lý do |
|---|---------|-------|
| 1 | **Không dùng nút/icon riêng để drag.** Toàn bộ item đều là vùng kéo. | Vùng bắt kéo rộng, trực quan hơn, nhất quán với các tool hiện đại (Linear, Plane). |
| 2 | **Line indicator** hiển thị vị trí sẽ drop. | Rõ ràng hơn shadow hoặc placeholder lấp đầy khoảng trống. |
| 3 | **Item gốc đứng yên** (ghost mờ) trong suốt quá trình drag. | User biết item đang được kéo từ đâu, không mất phương hướng. |
| 4 | **Clone** (preview) bám theo con trỏ. | Phản hồi trực tiếp, user thấy mình đang "cầm" gì. |
| 5 | **Dùng chung component** khi có thể, ưu tiên pattern nhất quán nếu component riêng. | Giảm phân kỳ UX giữa các trang. |

---

## 2. UX Behavior

### 2.1 Khi bắt đầu drag

- Item gốc chuyển thành **ghost**: opacity giảm xuống ~70% (để giữ độ rõ nét) và giữ màu nền hover (`bg-gray-50/50` / `dark:bg-surface-800/20`), `pointer-events: none`.
- Clone (drag preview) xuất hiện ngay tại vị trí item, bám theo con trỏ.
- Cursor chuyển thành `grabbing`.
- Các items còn lại **không di chuyển** (CDK `sortingDisabled = true`).

### 2.2 Trong khi drag

- Khi con trỏ hover lên một item, **line indicator** (`h-0.5 bg-indigo-600`) xuất hiện ở **cạnh trên** của item đó — đây là vị trí item sẽ được chèn vào.
- Khi con trỏ vào vùng cuối danh sách (end zone), line indicator xuất hiện ở **cuối danh sách** — item sẽ được đặt sau cùng.
- Line indicator biến mất khi con trỏ rời khỏi item.

### 2.3 Khi drop

- Item gốc di chuyển đến đúng vị trí indicator đang chỉ.
- Ghost biến mất.
- Clone biến mất.
- Nếu không hover lên bất kỳ vị trí hợp lệ nào → không thay đổi (no-op).

---

## 3. Visual Specification

### Line indicator (danh sách phẳng)

```html
<div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 z-20 rounded-full"></div>
```

Điều kiện hiển thị: `draggedId && hoveredId === item.id && draggedId !== item.id`

### Line indicator (danh sách phân cấp — Sub-Item Tree)

```html
<!-- Dùng dot + line để thể hiện độ sâu -->
<div class="flex items-center py-0.5" [style.padding-left.px]="depth * 20 + 8">
  <div class="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></div>
  <div class="flex-1 h-0.5 bg-indigo-500 ml-0.5"></div>
</div>
```

### Ghost (item gốc đứng yên)

```html
@if (draggedId === item.id) {
  <div class="opacity-70 bg-gray-50/50 dark:bg-surface-800/20 pointer-events-none rounded-lg">
    <!-- Phiên bản giữ nguyên layout hoặc cấu trúc chính của item, cùng class và paddings -->
  </div>
}
```

**Lưu ý:** Ghost phải nằm **ngoài** `cdkDrag` element để CDK không di chuyển nó.

### Drag preview (clone bám theo con trỏ)

```html
<div *cdkDragPreview [matchSize]="true"
  class="flex items-center gap-2 bg-white dark:bg-surface-800
         border border-surface-200 dark:border-surface-700
         shadow-xl rounded-lg px-3 pointer-events-none select-none"
  style="max-width: 320px; width: 100%; box-sizing: border-box;">
  <!-- Hiển thị ID + title của item hoặc cấu trúc của item gốc -->
</div>
```

### Empty CDK placeholder

```html
<div *cdkDragPlaceholder></div>
```

CDK cần placeholder để tính toán nội bộ. Để trống để không hiển thị gì.

### End drop zone

```html
<div class="relative" style="min-height: 16px;"
     (mouseenter)="hoveredId = 'end'"
     (mouseleave)="hoveredId === 'end' ? hoveredId = null : null">
  @if (draggedId && hoveredId === 'end') {
    <div class="h-0.5 bg-indigo-600 dark:bg-indigo-500 w-full absolute top-0 left-0 right-0 rounded-full"></div>
  }
</div>
```

---

## 4. Cấu hình CDK

```typescript
// Drop list
cdkDropList
[cdkDropListSortingDisabled]="true"   // Bắt buộc — items không tự di chuyển
(cdkDropListDropped)="onDrop($event)"

// Draggable item
cdkDrag
[cdkDragData]="item"
class="... cursor-grab active:cursor-grabbing relative"
(cdkDragStarted)="onDragStart(item.id)"
(cdkDragEnded)="onDragEnd()"
(mouseenter)="hoveredId = item.id"
(mouseleave)="hoveredId === item.id ? hoveredId = null : null"
```

CSS bắt buộc trong component:

```css
::ng-deep .cdk-drop-list-dragging .cdk-drag {
  transition: none !important;  /* Items không nhảy quanh khi drag */
}

::ng-deep .cdk-drag-animating {
  transition: transform 150ms cubic-bezier(0, 0, 0.2, 1);
}
```

---

## 5. Pattern onDrop (hover-based)

Thay vì dùng `event.currentIndex` từ CDK, xác định vị trí drop qua `hoveredId`:

```typescript
protected draggedId: string | null = null;
protected hoveredId: string | null = null;

onDragStart(id: string): void {
  this.draggedId = id;
}

onDragEnd(): void {
  setTimeout(() => {
    this.draggedId = null;
    this.hoveredId = null;
  }, 100);
}

onDrop(event: CdkDragDrop<Item[]>): void {
  const draggedId = this.draggedId;
  const hoveredId = this.hoveredId;

  this.draggedId = null;
  this.hoveredId = null;

  if (!draggedId || !hoveredId || draggedId === hoveredId) return;

  // Tính toán vị trí mới dựa trên hoveredId
  // Xem từng component để biết cách tính order (fractional hoặc index)
}
```

### Fractional ordering (Board, Task List)

Dùng khi item có trường `backlogOrder: number`:

```typescript
const prevTask = destTasks[targetIdx - 1];
const nextTask = destTasks[targetIdx];
const prevOrder = prevTask ? prevTask.backlogOrder : nextTask.backlogOrder - 2000;
const nextOrder = nextTask.backlogOrder;
newOrder = (prevOrder + nextOrder) / 2;
```

### Index ordering (States Tab)

Dùng khi item chỉ cần thứ tự nguyên (order 1, 2, 3...):

```typescript
const [dragged] = currentList.splice(draggedIdx, 1);
const targetIdx = currentList.findIndex(s => s.id === hoveredId);
currentList.splice(targetIdx === -1 ? currentList.length : targetIdx, 0, dragged);
const reorderItems = currentList.map((s, i) => ({ id: s.id, order: i + 1 }));
```

---

## 6. Danh sách implementation hiện tại

| Component | File | Loại DnD | Tính năng |
|-----------|------|----------|-----------|
| **Board Column** | `board/board-column.component.ts` | CDK | Cross-column drag, fractional order |
| **Task List** | `backlog/task-list/task-list.component.ts` | CDK | Same/cross-state, hierarchical (root only), fractional order |
| **States Tab** | `project-settings/states-tab/` | CDK | Reorder within group, index order |
| **Sub-item Tree** | `task-detail-panel/.../sub-item-tree.component.ts` | Custom (PointerEvents) | Hierarchical drag, parent/sibling drop |

### Điểm khác biệt của Sub-item Tree

Sub-item Tree dùng **Pointer Events API tùy chỉnh** thay vì CDK vì:
- Cần phân biệt "drop as child" vs "drop as sibling" dựa trên vị trí Y trong row (top 30% / middle / bottom 70%).
- CDK không hỗ trợ natively việc này cho nested tree.
- Drag threshold 5px để phân biệt click vs drag.

Sub-item Tree vẫn tuân theo cùng UX rules: ghost mờ, line indicator `bg-indigo-500`, clone bám con trỏ.

---

## 7. Buttons và inputs trong draggable item

Buttons, color picker, input text trong một `cdkDrag` có thể gây ra drag không mong muốn. Thêm `(pointerdown)="$event.stopPropagation()"` để ngăn:

```html
<input type="color" (pointerdown)="$event.stopPropagation()" ... />
<input type="text"  (pointerdown)="$event.stopPropagation()" ... />
<button (pointerdown)="$event.stopPropagation()" (click)="onAction()" ...></button>
```

---

## 8. Checklist khi thêm DnD vào trang mới

- [ ] `[cdkDropListSortingDisabled]="true"` trên `cdkDropList`
- [ ] `(cdkDragStarted)` / `(cdkDragEnded)` để track `draggedId`
- [ ] `(mouseenter)` / `(mouseleave)` để track `hoveredId`
- [ ] Ghost div (faded) **ngoài** `cdkDrag`
- [ ] Line indicator **trong** `cdkDrag`, position `absolute top-0`
- [ ] End zone div sau vòng lặp item
- [ ] `<div *cdkDragPlaceholder></div>` empty
- [ ] `<div *cdkDragPreview>` compact (ID + title)
- [ ] `transition: none !important` cho `.cdk-drop-list-dragging .cdk-drag` trong CSS
- [ ] `cursor-grab active:cursor-grabbing` trên `cdkDrag` wrapper
- [ ] `(pointerdown)="$event.stopPropagation()"` trên buttons/inputs trong item
