# Plan: Task 5 — Display Properties Panel

## Task ID
5. Display Properties Panel — component mới

## Approach
Tạo standalone Angular 21 component sử dụng PrimeNG ToggleSwitch, RadioButton, InputNumber, và Select. Component nhận `displayProps` input và emit `Partial<DisplayProperties>` qua EventEmitter mỗi khi user thay đổi setting.

## Files tạo/sửa
- **Tạo:** `apps/frontend/src/app/tasks/pages/backlog/backlog-toolbar/display-properties-panel.component.ts`

## Acceptance Criteria (từ Requirements 3.1–3.5)
- 3.1: Nút "Display" trên Backlog toolbar; click mở popover Display_Properties Panel
- 3.2: Toggle bật/tắt cho từng thuộc tính: Assignee, Priority, Due date, Start date, Labels, Estimate, Sub-item count, State
- 3.3: Khi Labels toggle bật: sub-options Label Mode (badge/dot), Max labels (1–4), Always show
- 3.4: Khi Modules toggle bật: sub-option Max modules (1–3)
- 3.5: Group by và Order by selectors

## Dependencies
- Task 1.1 (shared types DisplayProperties) — ✅ done
- Task 4 (conditional render) — in progress nhưng task 5 không phụ thuộc trực tiếp

## Implementation Details
- Standalone component, inline template
- PrimeNG imports: ToggleSwitchModule, RadioButtonModule, InputNumberModule, SelectModule
- @Input displayProps: DisplayProperties
- @Input selectedGroupBy: string
- @Input selectedOrderBy: string
- @Output displayPropsChange: EventEmitter<Partial<DisplayProperties>>
- @Output groupByChange: EventEmitter<string>
- @Output orderByChange: EventEmitter<string>
- Toggle thay đổi → emit ngay (immediate apply)
- Sub-options disabled khi toggle parent off
