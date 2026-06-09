# Plan: Task 9.7 — Create PropertiesSidebarComponent

## Task ID: 9.7
## Task Name: Create `PropertiesSidebarComponent` container component

## Approach
Create a container component that orchestrates all sidebar child components:
- Wraps properties in CollapsibleSectionComponent ("Chi tiết" + "Cấu trúc")
- Uses InlinePropertyEditorComponent for each property field
- Integrates ParentNavigationComponent for parent task
- Displays MetadataFooterComponent at bottom (outside collapsible sections)
- Uses controlled collapse state from parent/service via Input/Output

## Files to Create/Modify
1. **Create**: `apps/frontend/src/app/tasks/components/task-detail-panel/components/properties-sidebar/properties-sidebar.component.ts`
2. **Create**: `apps/frontend/src/app/tasks/components/task-detail-panel/components/properties-sidebar/index.ts`
3. **Modify**: `apps/frontend/src/app/tasks/components/task-detail-panel/components/index.ts` (add export)

## Acceptance Criteria (from requirements)
- 3.1: Group properties into "Chi tiết" and "Cấu trúc" collapsible sections
- 3.2: "Chi tiết" contains: State, Priority, Assignees, Start Date, Due Date, Estimate
- 3.3: "Cấu trúc" contains: Parent task, Labels, Modules
- 3.4-3.7: Collapsible section behavior with session storage persistence
- 6.5: Display timestamps at bottom in dd/MM/yyyy HH:mm
- 9.1: Metadata footer with creation timestamp and creator name
- 10.1: Parent field in "Cấu trúc" section

## Dependencies (completed)
- 4.4: CollapsibleSectionComponent ✓
- 9.1: InlinePropertyEditorComponent ✓
- 9.3: MetadataFooterComponent ✓
- 9.5: ParentNavigationComponent ✓
- 4.3: TaskDetailStateService ✓
