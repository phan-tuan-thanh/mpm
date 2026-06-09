# Plan: Task 11.3 — Refactor TaskDetailPanelComponent as orchestrating container

## Task ID: 11.3

## Description
Refactor TaskDetailPanelComponent to serve as the orchestrating container with proper child component wiring, two-column/single-column layouts, sidebar toggle with 200ms animation, and session-persisted sidebar state.

## Current State Analysis
The component ALREADY has most of the required functionality:
- ✅ Two-column layout (full-page) with main content left + sidebar right (320px fixed)
- ✅ Single-column layout (drawer/popup) with ActivityPanel showing Properties tab
- ✅ Sidebar toggle button with 200ms CSS animation
- ✅ Sidebar toggle hidden in drawer/popup mode (Req 8.6)
- ✅ All child components wired with proper Input/Output bindings
- ✅ TaskDetailStateService provided at component level
- ✅ Sidebar expanded by default (Req 8.5)
- ✅ Data loading on init (sub-items tree, activity)

## Gap (to fix)
- ❌ **Req 8.7**: Sidebar expanded/collapsed state is NOT persisted to session storage
  - Currently, only `sectionCollapseState` (details/structure sections) is persisted
  - The `sidebarExpanded` signal always starts as `true` on fresh load
  - Need to persist and restore from sessionStorage

## Files to Modify
1. `apps/frontend/src/app/tasks/components/task-detail-panel/services/task-detail-state.service.ts`
   - Add sidebar state persistence to session storage
   - Restore on construction

## Acceptance Criteria
- Req 8.1: Full-page two-column layout — main content (left) + Properties Sidebar (right, fixed 320px width) ✅
- Req 8.2: Drawer mode single-column with "Properties" tab in Activity Panel ✅
- Req 8.3: Popup mode same as drawer ✅
- Req 8.4: Sidebar toggle animates over 200ms ✅
- Req 8.5: Sidebar expanded by default ✅
- Req 8.6: Hide sidebar toggle in drawer/popup ✅
- Req 8.7: Preserve sidebar collapsed/expanded state across navigation within session — **TO FIX**

## Dependencies
- 11.1 (TaskService methods) — done ✅
- 11.2 (TaskStore signals) — done ✅
