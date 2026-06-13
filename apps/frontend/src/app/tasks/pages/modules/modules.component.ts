import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { PopoverModule, Popover } from 'primeng/popover';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { ModuleStore } from '../../state/module.store';
import { ProjectStore } from '../../../projects/state/project.store';
import { AuthStore } from '../../../auth/state/auth.store';
import { ModuleCardComponent } from './module-card.component';
import { ModuleFormComponent, ModuleFormData } from './module-form.component';
import type { ProjectModule, ModuleLifecycleStatus, MemberResponse } from '@mpm/shared-types';
import { ModuleStatusBadgeComponent } from './module-status-badge.component';

@Component({
  standalone: true,
  selector: 'app-modules-page',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    SkeletonModule,
    ConfirmDialogModule,
    ToastModule,
    PopoverModule,
    SelectButtonModule,
    InputTextModule,
    TooltipModule,
    ModuleCardComponent,
    ModuleFormComponent,
    ModuleStatusBadgeComponent,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="flex flex-col h-full bg-white dark:bg-surface-900 select-none">

      <!-- Toolbar -->
      <div class="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-surface-700 flex-shrink-0 flex-wrap">
        <h1 class="text-base font-semibold text-gray-800 dark:text-surface-100 mr-2">{{ t().title }}</h1>
        
        <!-- Status Filters (Mockup style) -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <!-- All Pill -->
          <button
            type="button"
            (click)="toggleStatusFilter(null)"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer"
            [class]="statusFilter().length === 0
              ? 'bg-gray-800 text-white border-gray-700 dark:bg-surface-800 dark:border-surface-750'
              : 'bg-transparent text-gray-500 border-gray-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'"
          >
            {{ t().all }}
          </button>
          
          <!-- Planning Pill -->
          <button
            type="button"
            (click)="toggleStatusFilter('planning')"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5"
            [class]="statusFilter().includes('planning')
              ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800'
              : 'bg-transparent text-gray-500 border-gray-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            {{ t().planning }}
          </button>

          <!-- Active Pill -->
          <button
            type="button"
            (click)="toggleStatusFilter('active')"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5"
            [class]="statusFilter().includes('active')
              ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
              : 'bg-transparent text-gray-500 border-gray-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {{ t().active }}
          </button>

          <!-- Maintenance Pill -->
          <button
            type="button"
            (click)="toggleStatusFilter('maintenance')"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5"
            [class]="statusFilter().includes('maintenance')
              ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
              : 'bg-transparent text-gray-500 border-gray-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {{ t().maintenance }}
          </button>

          <!-- Suspended Pill -->
          <button
            type="button"
            (click)="toggleStatusFilter('suspended')"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5"
            [class]="statusFilter().includes('suspended')
              ? 'bg-red-100 text-red-700 border-red-300 dark:bg-rose-950/40 dark:text-red-400 dark:border-rose-800'
              : 'bg-transparent text-gray-500 border-gray-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {{ t().suspended }}
          </button>
        </div>

        <div class="flex-1"></div>

        <!-- Search Input -->
        <div class="relative max-w-xs shrink-0">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pi pi-search"></span>
          <input
            pInputText
            class="pl-7 pr-2 py-1.5 w-full text-xs"
            [placeholder]="t().searchPlaceholder"
            [ngModel]="searchText()"
            (ngModelChange)="searchText.set($event)"
          />
        </div>

        <!-- Sort Popover Trigger -->
        <button
          type="button"
          (click)="sortPop.toggle($event)"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-surface-200 dark:border-surface-700 rounded bg-white dark:bg-surface-900 text-gray-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all cursor-pointer"
        >
          <i class="pi pi-sort-alt text-[10px]"></i>
          <span>{{ getSortLabel() }}</span>
          <i class="pi pi-chevron-down text-[9px] opacity-50"></i>
        </button>
        <p-popover #sortPop appendTo="body" styleClass="!p-0">
          <div class="pop-list w-52">
            @for (opt of sortOptions(); track opt.value) {
              <div
                (click)="sortBy.set(opt.value); sortPop.hide()"
                class="pop-item justify-between"
                [class.selected]="sortBy() === opt.value"
              >
                <span>{{ opt.label }}</span>
                @if (sortBy() === opt.value) {
                  <i class="pi pi-check text-xs"></i>
                }
              </div>
            }
          </div>
        </p-popover>

        <!-- View Switcher (Grid vs List vs Timeline) -->
        <p-selectbutton
          [options]="viewOptions()"
          [ngModel]="viewMode()"
          (ngModelChange)="viewMode.set($event)"
          [allowEmpty]="false"
          styleClass="text-xs"
        />

        <!-- Add Button -->
        <button
          pButton
          [label]="t().createModule"
          icon="pi pi-plus"
          size="small"
          class="!bg-teal-500 !border-teal-500 hover:!bg-teal-600 hover:!border-teal-600 !text-white font-semibold cursor-pointer"
          (click)="openCreateForm()"
        ></button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 pt-4 pb-12">

        <!-- Loading state -->
        @if (moduleStore.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (i of skeletonItems; track i) {
              <div class="border border-gray-200 dark:border-surface-700 rounded-lg p-4">
                <p-skeleton width="60%" height="1.25rem" styleClass="mb-3" />
                <p-skeleton width="30%" height="1rem" styleClass="mb-3" />
                <p-skeleton width="100%" height="0.5rem" styleClass="mb-3" />
                <p-skeleton width="40%" height="1rem" />
              </div>
            }
          </div>
        } @else {

          <!-- 1. SIMPLIFIED CARD GRID VIEW -->
          @if (viewMode() === 'grid') {
            
            <!-- Workspace Modules -->
            @if (sortedWorkspaceModules().length > 0) {
              <section class="mb-6">
                <h2 class="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wider mb-3">
                  <i class="pi pi-globe text-primary-500 text-xs"></i>
                  {{ t().workspaceModules }}
                  <span class="font-normal normal-case tracking-normal">({{ sortedWorkspaceModules().length }})</span>
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  @for (mod of sortedWorkspaceModules(); track mod.id) {
                    <app-module-card
                      [module]="mod"
                      (edit)="openEditForm($event)"
                      (menuClick)="openActionMenu($event)"
                    />
                  }
                </div>
              </section>
            }

            <!-- Project Modules -->
            <section>
              <h2 class="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wider mb-3">
                <i class="pi pi-folder text-teal-500 text-xs"></i>
                {{ t().projectModules }}
                <span class="font-normal normal-case tracking-normal">({{ sortedProjectModules().length }})</span>
              </h2>
              @if (sortedProjectModules().length > 0) {
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  @for (mod of sortedProjectModules(); track mod.id) {
                    <app-module-card
                      [module]="mod"
                      (edit)="openEditForm($event)"
                      (menuClick)="openActionMenu($event)"
                    />
                  }
                </div>
              } @else {
                <!-- Empty state -->
                <div class="flex flex-col items-center justify-center py-16 text-center">
                  <i class="pi pi-inbox text-4xl text-gray-300 dark:text-surface-600 mb-3"></i>
                  <p class="text-sm text-gray-500 dark:text-surface-400 mb-3">{{ t().noModulesFilter }}</p>
                </div>
              }
            </section>
          }

          <!-- 2. TABLE LIST VIEW -->
          @if (viewMode() === 'list') {
            <div class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden bg-white dark:bg-surface-800">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700 text-gray-500 dark:text-surface-400 font-semibold uppercase tracking-wider select-none">
                    <th class="py-3 px-4 w-[30%] cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors" (click)="toggleSort('name')">
                      {{ t().colName }}
                    </th>
                    <th class="py-3 px-4 w-[15%]">{{ t().colScope }}</th>
                    <th class="py-3 px-4 w-[15%]">{{ t().colStatus }}</th>
                    <th class="py-3 px-4 w-[20%] cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors" (click)="toggleSort('progress')">
                      {{ t().colProgress }}
                    </th>
                    <th class="py-3 px-4 w-[10%]">{{ t().colTasks }}</th>
                    <th class="py-3 px-4 w-[15%] cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors" (click)="toggleSort('date')">
                      {{ t().colDueDate }}
                    </th>
                    <th class="py-3 px-4 w-[5%] text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-100 dark:divide-surface-700/50 text-gray-700 dark:text-surface-200">
                  @let allList = getCombinedModules();
                  @if (allList.length === 0) {
                    <tr>
                      <td colspan="7" class="py-10 text-center text-gray-400">{{ t().noModulesFound }}</td>
                    </tr>
                  }
                  @for (m of allList; track m.id) {
                    <tr class="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors cursor-pointer" (click)="openEditForm(m)">
                      <td class="py-3.5 px-4 font-semibold text-gray-900 dark:text-surface-0">
                        <div class="flex items-center gap-2">
                          <i [class]="m.scope === 'workspace' ? 'pi pi-globe text-primary-500' : 'pi pi-folder text-teal-500'"></i>
                          <span class="truncate max-w-[200px]">{{ m.name }}</span>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-gray-500">
                        {{ m.scope === 'workspace' ? 'Workspace' : 'Project' }}
                      </td>
                      <td class="py-3.5 px-4">
                        <app-module-status-badge [status]="m.status" />
                      </td>
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-2">
                          <div class="w-24 h-1.5 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden shrink-0">
                            <div class="h-full rounded-full" [style.width.%]="m.progress" [style.background-color]="getProgressColor(m)"></div>
                          </div>
                          <span class="font-medium text-gray-900 dark:text-surface-100">{{ m.progress }}%</span>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-gray-500">
                        {{ m.completedCount }}/{{ m.taskCount }}
                      </td>
                      <td class="py-3.5 px-4 text-gray-500 font-medium">
                        @if (m.startDate || m.endDate) {
                          <span class="text-[11px]">
                            {{ m.startDate ? (m.startDate | date:'dd/MM') : '?' }} → {{ m.endDate ? (m.endDate | date:'dd/MM/yyyy') : '?' }}
                          </span>
                        } @else {
                          <span class="text-gray-400 font-normal">-</span>
                        }
                      </td>
                      <td class="py-3.5 px-4 text-right" (click)="$event.stopPropagation()">
                        <button
                          pButton
                          icon="pi pi-ellipsis-v"
                          [rounded]="true"
                          [text]="true"
                          severity="secondary"
                          size="small"
                          (click)="openActionMenu({ event: $event, module: m })"
                        ></button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 3. TIMELINE (GANTT) VIEW -->
          @if (viewMode() === 'timeline') {
            @if (scheduledModules().length > 0) {
              <div class="flex border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 shadow-sm mb-6">
                
                <!-- Left Sidebar (Frozen) -->
                <div class="w-[200px] flex-shrink-0 border-r border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/40 flex flex-col">
                  <!-- Sidebar Header -->
                  <div class="h-[60px] border-b border-surface-200 dark:border-surface-700 px-4 flex flex-col justify-center bg-surface-50 dark:bg-surface-800/50 flex-shrink-0 select-none">
                    <span class="text-xs font-semibold text-gray-400 dark:text-surface-500 uppercase tracking-wider">{{ t().projects }}</span>
                    <span class="text-[10px] text-gray-500 dark:text-surface-400">{{ t().current }}</span>
                  </div>
                  <!-- Sidebar Rows -->
                  <div class="flex flex-col divide-y divide-surface-100 dark:divide-surface-700/50">
                    @for (m of scheduledModules(); track m.id) {
                      <div class="h-[90px] px-4 flex flex-col justify-center relative hover:bg-surface-50/50 dark:hover:bg-surface-800/30 group transition-colors">
                        <!-- Left Status Accent Bar -->
                        <div class="absolute left-0 top-0 bottom-0 w-1" [style.background-color]="getProgressColor(m)"></div>
                        <div class="flex items-center justify-between gap-2 min-w-0">
                          <span class="font-bold text-xs text-gray-800 dark:text-surface-100 truncate cursor-pointer hover:text-primary-500" (click)="openEditForm(m)">
                            {{ m.name }}
                          </span>
                          <button
                            pButton
                            icon="pi pi-ellipsis-v"
                            [rounded]="true"
                            [text]="true"
                            severity="secondary"
                            size="small"
                            class="opacity-0 group-hover:opacity-100 transition-opacity !w-6 !h-6 flex-shrink-0"
                            (click)="openActionMenu({ event: $event, module: m })"
                          ></button>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Right Scrollable Area Wrapper (to absolute float Zoom Control) -->
                <div class="flex-1 relative overflow-hidden flex flex-col">
                  <!-- Right Scrollable Area -->
                  <div class="flex-1 overflow-x-auto relative">
                    <!-- Width wrapper for timeline spacing -->
                    <div [style.width.px]="timelineWidth()" class="flex flex-col">
                      
                      <!-- Timeline Header (2 levels: months + day ticks) -->
                      <div class="h-[60px] border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 relative flex-shrink-0 select-none">
                        <!-- Level 1: Month segments -->
                        <div class="absolute top-0 left-6 right-6 h-[30px]">
                          <div class="relative w-full h-full">
                            @for (seg of monthSegments(); track seg.key) {
                              <div
                                class="absolute top-0 bottom-0 flex items-center overflow-hidden border-l border-surface-200 dark:border-surface-700"
                                [style.left.%]="seg.left"
                                [style.width.%]="seg.width"
                              >
                                <span class="pl-2.5 text-[10px] font-bold text-gray-500 dark:text-surface-400 uppercase tracking-wider whitespace-nowrap">
                                  {{ seg.label }}
                                </span>
                              </div>
                            }
                          </div>
                        </div>
                        <!-- Level 2: Day number ticks -->
                        <div class="absolute bottom-0 left-6 right-6 h-[30px] border-t border-surface-200/60 dark:border-surface-700/60">
                          <div class="relative w-full h-full">
                            @for (tick of dayTicks(); track tick.time) {
                              <span
                                class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[10px] font-medium"
                                [class]="tick.isToday
                                  ? 'text-primary font-bold'
                                  : tick.isWeekStart
                                    ? 'text-gray-500 dark:text-surface-300 font-semibold'
                                    : 'text-gray-400 dark:text-surface-500'"
                                [style.left.%]="tick.left"
                              >
                                {{ tick.day }}
                              </span>
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Timeline Rows Body -->
                      <div class="divide-y divide-surface-100 dark:divide-surface-700/50 relative flex flex-col">
                        
                        <!-- Vertical grid lines background (days dashed, week starts solid) -->
                        <div class="absolute inset-y-0 left-6 right-6 pointer-events-none z-0">
                          <div class="relative w-full h-full">
                            @for (tick of dayTicks(); track tick.time) {
                              <div
                                class="absolute top-0 bottom-0 w-px border-l"
                                [class]="tick.isWeekStart
                                  ? 'border-solid border-gray-200/80 dark:border-surface-700/60'
                                  : 'border-dashed border-gray-200/40 dark:border-surface-700/30'"
                                [style.left.%]="tick.left"
                              ></div>
                            }
                            <!-- Today indicator line -->
                            @if (todayLeft() !== null) {
                              <div class="absolute top-0 bottom-0 w-px bg-primary z-10" [style.left.%]="todayLeft()">
                                <div class="absolute -top-0.5 -translate-x-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-primary"></div>
                              </div>
                            }
                          </div>
                        </div>

                        <!-- Scheduled Gantt Rows -->
                        @for (m of scheduledModules(); track m.id) {
                          <div class="h-[90px] relative flex items-center z-10">
                            <div class="absolute inset-y-0 left-6 right-6">
                              @if (getModuleTimelineStyle(m); as style) {
                                <!-- Gantt Card (solid gradient, mockup style) -->
                                <div
                                  class="absolute top-1/2 -translate-y-1/2 h-[76px] rounded-xl transition-shadow shadow-md hover:shadow-xl overflow-hidden select-none cursor-pointer ring-1 ring-black/10 dark:ring-white/10"
                                  [style.left]="style.left"
                                  [style.width]="style.width"
                                  [style.min-width]="'210px'"
                                  [style.background]="getCardGradient(m)"
                                  (click)="openEditForm(m)"
                                >
                                  <!-- Card Content -->
                                  <div class="px-3.5 py-2 h-full flex flex-col justify-between min-w-0 text-white relative">
                                    
                                    <!-- Overlapping Member Avatars (absolute layout to avoid trigger collision) -->
                                    <div class="absolute top-2 right-3.5 flex -space-x-1.5 overflow-hidden shrink-0 z-20">
                                      @for (member of getModuleMembers(m).slice(0, 3); track member.userId) {
                                        @if (member.avatarUrl) {
                                          <img
                                            [src]="member.avatarUrl"
                                            [alt]="member.displayName"
                                            class="inline-block h-5 w-5 rounded-full ring-2 ring-white/50 object-cover"
                                            [pTooltip]="member.displayName"
                                          />
                                        } @else {
                                          <span
                                            class="inline-flex h-5 w-5 rounded-full bg-white/30 backdrop-blur-sm text-white text-[8px] font-bold items-center justify-center ring-2 ring-white/50"
                                            [pTooltip]="member.displayName"
                                          >
                                            {{ member.displayName.charAt(0).toUpperCase() }}
                                          </span>
                                        }
                                      }
                                    </div>

                                    <!-- Main details hoverable zone (triggers card timeline tooltip) -->
                                    <div 
                                      class="h-full flex flex-col justify-between min-w-0 pr-16"
                                      [pTooltip]="m.name + ': ' + (m.startDate | date:'dd/MM/yyyy') + ' → ' + (m.endDate | date:'dd/MM/yyyy') + ' (' + m.progress + '%)'"
                                    >
                                      <!-- Top Row: Name + Duration subtitle -->
                                      <div class="min-w-0">
                                        <div class="font-bold text-xs leading-4 truncate drop-shadow-sm">
                                          {{ m.name }}
                                        </div>
                                        <div class="text-[10px] leading-4 text-white/80 truncate">
                                          {{ getDurationLabel(m) }}, {{ m.startDate | date:'MMM d' }} – {{ m.endDate | date:'MMM d' }}
                                        </div>
                                      </div>

                                      <!-- Middle Row: Progress Bar -->
                                      <div class="flex items-center gap-2">
                                        <div class="flex-1 h-1.5 bg-black/25 rounded-full overflow-hidden">
                                          <div
                                            class="h-full rounded-full bg-white/95 transition-all duration-300"
                                            [style.width.%]="m.progress"
                                          ></div>
                                        </div>
                                        <span class="text-[10px] font-bold shrink-0">
                                          {{ m.progress }}%
                                        </span>
                                      </div>

                                      <!-- Bottom Row: bullet meta (tasks + status) -->
                                      <div class="flex items-center gap-3 text-[9px] text-white/80 min-w-0">
                                        <span class="flex items-center gap-1 shrink-0">
                                          <span class="w-1 h-1 rounded-full bg-white/70"></span>
                                          {{ t().colTasks }}: {{ m.completedCount }}/{{ m.taskCount }}
                                        </span>
                                        <span class="flex items-center gap-1 truncate font-semibold">
                                          <span class="w-1 h-1 rounded-full bg-white/70 shrink-0"></span>
                                          {{ getStatusLabel(m.status) }}
                                        </span>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Zoom Floating Controls -->
                  <div class="absolute bottom-4 right-4 flex items-center gap-2 bg-gray-900/90 text-white rounded-lg px-3 py-1.5 shadow-lg border border-gray-700/50 backdrop-blur z-20 text-xs font-semibold select-none">
                    <i class="pi pi-search-plus text-xs opacity-75"></i>
                    <span class="opacity-75">Zoom:</span>
                    <button (click)="adjustZoom(-0.25)" class="hover:bg-white/10 rounded-md w-5 h-5 flex items-center justify-center cursor-pointer transition-colors" [disabled]="zoomLevel() <= 0.75">
                      <i class="pi pi-minus text-[8px]"></i>
                    </button>
                    <span class="w-10 text-center font-bold text-[10px]">{{ zoomPercent() }}%</span>
                    <button (click)="adjustZoom(0.25)" class="hover:bg-white/10 rounded-md w-5 h-5 flex items-center justify-center cursor-pointer transition-colors" [disabled]="zoomLevel() >= 3.0">
                      <i class="pi pi-plus text-[8px]"></i>
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <!-- Empty state timeline -->
              <div class="flex flex-col items-center justify-center py-20 border border-dashed border-surface-200 dark:border-surface-700 rounded-lg">
                <i class="pi pi-calendar-times text-4xl text-gray-300 dark:text-surface-600 mb-3"></i>
                <p class="text-sm text-gray-500 dark:text-surface-400">{{ t().noScheduled }}</p>
                <p class="text-xs text-gray-400 mt-1 mb-4">{{ t().ganttHelp }}</p>
              </div>
            }

            <!-- Unscheduled list below Gantt timeline -->
            @if (unscheduledModules().length > 0) {
              <div class="mt-8">
                <h3 class="text-xs font-bold text-gray-400 dark:text-surface-500 uppercase tracking-wider mb-3">{{ t().unscheduled }} ({{ unscheduledModules().length }})</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  @for (m of unscheduledModules(); track m.id) {
                    <div
                      class="border border-dashed border-surface-300 dark:border-surface-700 rounded-lg p-3 bg-surface-50/50 dark:bg-surface-800/10 hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer flex items-center justify-between group"
                      (click)="openEditForm(m)"
                    >
                      <div class="flex items-center gap-2 min-w-0">
                        <i class="pi pi-calendar-plus text-gray-400 group-hover:text-primary-500 transition-colors"></i>
                        <span class="font-semibold text-xs text-gray-700 dark:text-surface-300 truncate">{{ m.name }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] text-gray-400 group-hover:text-primary-500 transition-colors">{{ t().setDate }}</span>
                        <button
                          pButton
                          icon="pi pi-ellipsis-v"
                          [rounded]="true"
                          [text]="true"
                          severity="secondary"
                          size="small"
                          class="opacity-0 group-hover:opacity-100 transition-opacity !w-6 !h-6"
                          (click)="$event.stopPropagation(); openActionMenu({ event: $event, module: m })"
                        ></button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        }
      </div>
    </div>

    <!-- Actions Popover Menu -->
    <p-popover #actionMenu appendTo="body" styleClass="!p-0">
      @if (activeModule(); as mod) {
        <div class="pop-list w-40">
          <div (click)="viewTasks(mod); actionMenu.hide()" class="pop-item flex items-center gap-2">
            <i class="pi pi-eye text-xs"></i>
            <span>{{ t().viewTasksLabel }}</span>
          </div>
          <div (click)="openEditForm(mod); actionMenu.hide()" class="pop-item flex items-center gap-2">
            <i class="pi pi-pencil text-xs"></i>
            <span>{{ t().edit }}</span>
          </div>
          <div (click)="confirmDelete(mod); actionMenu.hide()" class="pop-item flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400">
            <i class="pi pi-trash text-xs text-red-500"></i>
            <span>{{ t().deleteBtn }}</span>
          </div>
        </div>
      }
    </p-popover>

    <!-- Create/Edit Dialog -->
    <app-module-form
      [(visible)]="formVisible"
      [editModule]="editingModule()"
      (save)="onFormSave($event)"
      (cancel)="onFormCancel()"
    />

    <p-confirmDialog appendTo="body" />
    <p-toast />
  `,
})
export class ModulesComponent implements OnInit {
  readonly moduleStore = inject(ModuleStore);
  private readonly projectStore = inject(ProjectStore);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @ViewChild('actionMenu') actionMenu!: Popover;

  protected formVisible = false;
  protected editingModule = signal<ProjectModule | null>(null);
  protected statusFilter = signal<ModuleLifecycleStatus[]>([]);
  protected searchText = signal<string>('');
  protected sortBy = signal<string>('name_asc');
  protected viewMode = signal<'grid' | 'list' | 'timeline'>('grid');
  protected activeModule = signal<ProjectModule | null>(null);
  protected zoomLevel = signal<number>(1.0);
  protected readonly zoomPercent = computed(() => Math.round(this.zoomLevel() * 100));

  protected readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  private projectId = '';
  private workspaceId = '';

  readonly t = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? {
      title: 'Modules',
      all: 'All',
      planning: 'Planning',
      active: 'In Progress',
      maintenance: 'Review',
      suspended: 'Blocked',
      searchPlaceholder: 'Search module...',
      sortByLabel: 'Sort by',
      createModule: 'Create Module',
      noModulesFilter: 'No modules matching current filters.',
      colName: 'Module Name',
      colScope: 'Scope',
      colStatus: 'Status',
      colProgress: 'Progress',
      colTasks: 'Tasks',
      colDueDate: 'Due Date',
      noModulesFound: 'No modules found',
      workspaceModules: 'Workspace Modules',
      projectModules: 'Project Modules',
      edit: 'Edit',
      deleteBtn: 'Delete Module',
      noScheduled: 'No scheduled modules.',
      ganttHelp: 'Set start and end dates for modules to display them here.',
      unscheduled: 'Unscheduled',
      setDate: 'Set Date',
      viewTasksLabel: 'View Tasks',
      toastWarnNoPermission: 'No Permission',
      toastWarnEditWorkspaceAdmin: 'Only Workspace Admins can edit workspace modules.',
      toastWarnDeleteWorkspaceAdmin: 'Only Workspace Admins can delete workspace modules.',
      confirmDeleteHeader: 'Confirm Delete',
      confirmDeleteMessage: (name: string) => `Are you sure you want to delete module "${name}"? All task associations will be removed.`,
      toastSuccessDeletedHeader: 'Deleted',
      toastSuccessDeletedDetail: (name: string) => `Module "${name}" has been deleted.`,
      toastErrorHeader: 'Error',
      toastErrorInvalidTransition: 'Invalid transition',
      toastErrorCurrentStatus: (status: string, allowed: string) => `Current status: ${status}. Allowed: ${allowed}`,
      toastWarnConflict: 'Update conflict',
      toastSuccessUpdated: 'Updated',
      toastSuccessUpdatedDetail: (name: string) => `Module "${name}" has been updated.`,
      toastSuccessCreated: 'Created',
      toastSuccessCreatedDetail: (name: string) => `Module "${name}" has been created.`,
      cancel: 'Cancel',
      projects: 'Projects',
      current: 'Current',
      deleteLabel: 'Delete',
    } : {
      title: 'Modules',
      all: 'Tất cả',
      planning: 'Lập kế hoạch',
      active: 'Đang chạy',
      maintenance: 'Review',
      suspended: 'Blocked',
      searchPlaceholder: 'Tìm module...',
      sortByLabel: 'Sắp xếp',
      createModule: 'Tạo Module',
      noModulesFilter: 'Không có module nào khớp với điều kiện lọc',
      colName: 'Tên module',
      colScope: 'Phạm vi',
      colStatus: 'Trạng thái',
      colProgress: 'Tiến độ',
      colTasks: 'Tasks',
      colDueDate: 'Thời hạn',
      noModulesFound: 'Không tìm thấy module nào',
      workspaceModules: 'Workspace Modules',
      projectModules: 'Project Modules',
      edit: 'Chỉnh sửa',
      deleteBtn: 'Xóa Module',
      noScheduled: 'Không có module nào được lên lịch thời hạn.',
      ganttHelp: 'Hãy thiết lập ngày bắt đầu và kết thúc cho các module để chúng hiển thị tại đây.',
      unscheduled: 'Chưa lập lịch',
      setDate: 'Thiết lập ngày',
      viewTasksLabel: 'Xem Tasks',
      toastWarnNoPermission: 'Không có quyền',
      toastWarnEditWorkspaceAdmin: 'Chỉ Workspace Admin mới có thể sửa workspace module.',
      toastWarnDeleteWorkspaceAdmin: 'Chỉ Workspace Admin mới có thể xóa workspace module.',
      confirmDeleteHeader: 'Xác nhận xóa',
      confirmDeleteMessage: (name: string) => `Bạn có chắc muốn xóa module "${name}"? Tất cả liên kết task sẽ bị gỡ.`,
      toastSuccessDeletedHeader: 'Đã xóa',
      toastSuccessDeletedDetail: (name: string) => `Module "${name}" đã được xóa`,
      toastErrorHeader: 'Lỗi',
      toastErrorInvalidTransition: 'Transition không hợp lệ',
      toastErrorCurrentStatus: (status: string, allowed: string) => `Trạng thái hiện tại: ${status}. Cho phép: ${allowed}`,
      toastWarnConflict: 'Xung đột cập nhật',
      toastSuccessUpdated: 'Đã cập nhật',
      toastSuccessUpdatedDetail: (name: string) => `Module "${name}" đã được cập nhật`,
      toastSuccessCreated: 'Đã tạo',
      toastSuccessCreatedDetail: (name: string) => `Module "${name}" đã được tạo`,
      cancel: 'Hủy',
      projects: 'Dự án',
      current: 'Hiện tại',
      deleteLabel: 'Xóa',
    };
  });

  readonly viewOptions = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return [
      { label: isEn ? 'Grid' : 'Lưới', value: 'grid' },
      { label: isEn ? 'List' : 'Danh sách', value: 'list' },
      { label: isEn ? 'Timeline' : 'Timeline', value: 'timeline' },
    ];
  });

  readonly sortOptions = computed(() => {
    const isEn = this.projectStore.projectLanguage() === 'en';
    return isEn ? [
      { label: 'Name (A-Z)', value: 'name_asc' },
      { label: 'Name (Z-A)', value: 'name_desc' },
      { label: 'Progress (High → Low)', value: 'progress_desc' },
      { label: 'Progress (Low → High)', value: 'progress_asc' },
      { label: 'Due Date (Earliest)', value: 'date_asc' },
      { label: 'Due Date (Latest)', value: 'date_desc' },
    ] : [
      { label: 'Tên (A-Z)', value: 'name_asc' },
      { label: 'Tên (Z-A)', value: 'name_desc' },
      { label: 'Tiến độ (Cao → Thấp)', value: 'progress_desc' },
      { label: 'Tiến độ (Thấp → Cao)', value: 'progress_asc' },
      { label: 'Hạn chót (Sớm nhất)', value: 'date_asc' },
      { label: 'Hạn chót (Muộn nhất)', value: 'date_desc' },
    ];
  });

  readonly workspaceModules = computed(() =>
    this.moduleStore.modules().filter((m) => m.scope === 'workspace'),
  );

  readonly projectModules = computed(() =>
    this.moduleStore.modules().filter((m) => m.scope === 'project'),
  );

  readonly sortedWorkspaceModules = computed(() => {
    return this.filterAndSortModules(this.workspaceModules());
  });

  readonly sortedProjectModules = computed(() => {
    return this.filterAndSortModules(this.projectModules());
  });

  // Gantt timeline calculations
  readonly timelineRange = computed(() => {
    const list = [...this.workspaceModules(), ...this.projectModules()].filter(
      (m) => m.startDate || m.endDate
    );
    if (list.length === 0) return null;

    const times = list.flatMap((m) => {
      const res = [];
      if (m.startDate) res.push(new Date(m.startDate).getTime());
      if (m.endDate) res.push(new Date(m.endDate).getTime());
      return res;
    });

    let min = Math.min(...times);
    let max = Math.max(...times);

    // Padding span by 7 days to start and end
    const padding = 7 * 24 * 60 * 60 * 1000;
    min = min - padding;
    max = max + padding;

    return { min, max, span: max - min };
  });

  readonly timelineWidth = computed(() => {
    const range = this.timelineRange();
    if (!range) return 1200;
    const days = range.span / (24 * 60 * 60 * 1000);
    return Math.max(1200, Math.round(days * 80 * this.zoomLevel()));
  });

  // Month segments for header level 1 (label positioned at each month start)
  readonly monthSegments = computed(() => {
    const range = this.timelineRange();
    if (!range) return [];

    const isEn = this.projectStore.projectLanguage() === 'en';
    const segs: { key: number; label: string; left: number; width: number }[] = [];
    const cursor = new Date(range.min);
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);

    while (cursor.getTime() <= range.max) {
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + 1);
      const startMs = Math.max(cursor.getTime(), range.min);
      const endMs = Math.min(next.getTime(), range.max);
      segs.push({
        key: cursor.getTime(),
        label: isEn ? `Month ${cursor.getMonth() + 1}, ${cursor.getFullYear()}` : `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`,
        left: ((startMs - range.min) / range.span) * 100,
        width: ((endMs - startMs) / range.span) * 100,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return segs;
  });

  // Day ticks for header level 2 + body grid lines; step adapts to zoom density
  readonly dayTicks = computed(() => {
    const range = this.timelineRange();
    if (!range) return [];

    const msPerDay = 24 * 60 * 60 * 1000;
    const pxPerDay = this.timelineWidth() / (range.span / msPerDay);
    const step = pxPerDay >= 28 ? 1 : pxPerDay >= 14 ? 2 : 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ticks: { time: number; day: number; left: number; isWeekStart: boolean; isToday: boolean }[] = [];
    const cursor = new Date(range.min);
    cursor.setHours(0, 0, 0, 0);
    if (cursor.getTime() < range.min) cursor.setDate(cursor.getDate() + 1);

    let i = 0;
    while (cursor.getTime() <= range.max) {
      const isWeekStart = cursor.getDay() === 1;
      if ((step === 7 ? isWeekStart : i % step === 0)) {
        ticks.push({
          time: cursor.getTime(),
          day: cursor.getDate(),
          left: ((cursor.getTime() - range.min) / range.span) * 100,
          isWeekStart,
          isToday: cursor.getTime() === today.getTime(),
        });
      }
      cursor.setDate(cursor.getDate() + 1);
      i++;
    }

    return ticks;
  });

  // Position (%) of the today line, null when outside visible range
  readonly todayLeft = computed(() => {
    const range = this.timelineRange();
    if (!range) return null;
    const now = Date.now();
    if (now < range.min || now > range.max) return null;
    return ((now - range.min) / range.span) * 100;
  });

  readonly scheduledModules = computed(() => {
    const list = [...this.sortedWorkspaceModules(), ...this.sortedProjectModules()];
    return list.filter((m) => m.startDate || m.endDate);
  });

  readonly unscheduledModules = computed(() => {
    const list = [...this.sortedWorkspaceModules(), ...this.sortedProjectModules()];
    return list.filter((m) => !m.startDate && !m.endDate);
  });

  ngOnInit(): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.projectId = project.id;
      this.workspaceId = project.workspaceId ?? '';
      this.moduleStore.loadModules(this.projectId);
      this.projectStore.loadMembers(this.projectId);
    }
  }

  filterAndSortModules(list: ProjectModule[]): ProjectModule[] {
    const statuses = this.statusFilter();
    let res = statuses.length === 0
      ? list
      : list.filter((m) => statuses.includes(m.status));

    const search = this.searchText().trim().toLowerCase();
    if (search) {
      res = res.filter((m) => m.name.toLowerCase().includes(search));
    }

    const sort = this.sortBy();
    res = [...res].sort((a, b) => {
      if (sort === 'name_asc') return a.name.localeCompare(b.name);
      if (sort === 'name_desc') return b.name.localeCompare(a.name);
      if (sort === 'progress_desc') return b.progress - a.progress;
      if (sort === 'progress_asc') return a.progress - b.progress;
      if (sort === 'date_asc') {
        const dA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const dB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return dA - dB;
      }
      if (sort === 'date_desc') {
        const dA = a.endDate ? new Date(a.endDate).getTime() : -Infinity;
        const dB = b.endDate ? new Date(b.endDate).getTime() : -Infinity;
        return dB - dA;
      }
      return 0;
    });

    return res;
  }

  getCombinedModules(): ProjectModule[] {
    return [...this.sortedWorkspaceModules(), ...this.sortedProjectModules()];
  }

  onFilterChanged(statuses: ModuleLifecycleStatus[]): void {
    this.statusFilter.set(statuses);
  }

  clearFilters(): void {
    this.statusFilter.set([]);
    this.searchText.set('');
  }

  getSortLabel(): string {
    const found = this.sortOptions().find((o) => o.value === this.sortBy());
    return found ? found.label : this.t().sortByLabel;
  }

  toggleSort(field: 'name' | 'progress' | 'date'): void {
    const current = this.sortBy();
    if (field === 'name') {
      this.sortBy.set(current === 'name_asc' ? 'name_desc' : 'name_asc');
    } else if (field === 'progress') {
      this.sortBy.set(current === 'progress_desc' ? 'progress_asc' : 'progress_desc');
    } else if (field === 'date') {
      this.sortBy.set(current === 'date_asc' ? 'date_desc' : 'date_asc');
    }
  }

  openCreateForm(): void {
    this.editingModule.set(null);
    this.formVisible = true;
  }

  openEditForm(module: ProjectModule): void {
    if (module.scope === 'workspace' && !this.authStore.isAdmin()) {
      const t = this.t();
      this.messageService.add({
        severity: 'warn',
        summary: t.toastWarnNoPermission,
        detail: t.toastWarnEditWorkspaceAdmin,
        life: 3000,
      });
      return;
    }
    this.editingModule.set(module);
    this.formVisible = true;
  }

  openActionMenu(event: { event: Event; module: ProjectModule }): void {
    this.activeModule.set(event.module);
    this.actionMenu.toggle(event.event);
  }

  confirmDelete(module: ProjectModule): void {
    if (module.scope === 'workspace' && !this.authStore.isAdmin()) {
      const t = this.t();
      this.messageService.add({
        severity: 'warn',
        summary: t.toastWarnNoPermission,
        detail: t.toastWarnDeleteWorkspaceAdmin,
        life: 3000,
      });
      return;
    }

    const t = this.t();
    this.confirmService.confirm({
      message: t.confirmDeleteMessage(module.name),
      header: t.confirmDeleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: t.deleteLabel,
      rejectLabel: t.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.moduleStore.deleteModule(this.projectId, module.id);
        this.messageService.add({
          severity: 'success',
          summary: t.toastSuccessDeletedHeader,
          detail: t.toastSuccessDeletedDetail(module.name),
          life: 3000,
        });
      },
    });
  }

  viewTasks(module: ProjectModule): void {
    const project = this.projectStore.currentProject();
    if (project) {
      this.router.navigate(['/projects', project.key, 'workitem'], {
        queryParams: { moduleIds: module.id },
      });
    }
  }

  async onFormSave(data: ModuleFormData): Promise<void> {
    const editing = this.editingModule();
    const t = this.t();
    if (editing) {
      const dto: { name?: string; description?: any; status?: any; startDate?: string | null; endDate?: string | null } = {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      if (data.status) dto.status = data.status;

      const result = await this.moduleStore.updateModule(this.projectId, editing.id, dto);

      if (!result.success) {
        if (result.error.type === '422') {
          const allowed = result.error.allowedTransitions?.join(', ') ?? '';
          this.messageService.add({
            severity: 'error',
            summary: t.toastErrorInvalidTransition,
            detail: t.toastErrorCurrentStatus(result.error.currentStatus ?? '', allowed),
            life: 5000,
          });
          this.moduleStore.loadModules(this.projectId);
        } else if (result.error.type === '409') {
          this.messageService.add({
            severity: 'warn',
            summary: t.toastWarnConflict,
            detail: result.error.message,
            life: 4000,
          });
          this.moduleStore.loadModules(this.projectId);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: t.toastErrorHeader,
            detail: result.error.message,
            life: 3000,
          });
        }
        return;
      }

      this.messageService.add({
        severity: 'success',
        summary: t.toastSuccessUpdated,
        detail: t.toastSuccessUpdatedDetail(data.name),
        life: 3000,
      });
    } else {
      const module = await this.moduleStore.createModule(this.projectId, {
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      if (module) {
        this.messageService.add({
          severity: 'success',
          summary: t.toastSuccessCreated,
          detail: t.toastSuccessCreatedDetail(data.name),
          life: 3000,
        });
      }
    }
  }

  onFormCancel(): void {
    this.editingModule.set(null);
  }

  getProgressColor(module: ProjectModule): string {
    if (module.progress === 100) return '#10B981'; // Green for complete
    const config: Record<string, string> = {
      planning: '#8B5CF6',     // Purple
      active: '#3B82F6',       // Blue
      maintenance: '#F59E0B',  // Amber
      suspended: '#6B7280',    // Gray
      deprecated: '#EF4444',   // Red
      retired: '#4B5563',      // Slate
      cancelled: '#9CA3AF',    // Silver
    };
    return config[module.status] || '#3B82F6';
  }

  getModuleTimelineStyle(m: ProjectModule): any {
    const range = this.timelineRange();
    if (!range) return null;

    const start = m.startDate ? new Date(m.startDate).getTime() : range.min;
    const end = m.endDate ? new Date(m.endDate).getTime() : (m.startDate ? new Date(m.startDate).getTime() : range.max);

    const left = ((start - range.min) / range.span) * 100;
    const width = Math.max(8, ((end - start) / range.span) * 100); // min 8% bar width for rich cards

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  }

  getCardGradient(m: ProjectModule): string {
    const color = this.getProgressColor(m);
    return `linear-gradient(160deg, ${this.shadeColor(color, 14)} 0%, ${this.shadeColor(color, -12)} 100%)`;
  }

  private shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.min(255, Math.max(0, (num >> 16) + amt));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
    return `rgb(${r}, ${g}, ${b})`;
  }

  getDurationLabel(m: ProjectModule): string {
    if (!m.startDate || !m.endDate) return '';
    const start = new Date(m.startDate);
    const end = new Date(m.endDate);
    
    const d1 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const d2 = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const diffDays = Math.round((d2 - d1) / (24 * 60 * 60 * 1000)) + 1;

    const isEn = this.projectStore.projectLanguage() === 'en';
    if (isEn) {
      if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      }

      const weeks = Math.floor(diffDays / 7);
      const remainingDays = diffDays % 7;

      if (remainingDays === 0) {
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
      }

      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
    } else {
      if (diffDays < 7) {
        return `${diffDays} ngày`;
      }

      const weeks = Math.floor(diffDays / 7);
      const remainingDays = diffDays % 7;

      if (remainingDays === 0) {
        return `${weeks} tuần`;
      }

      return `${weeks} tuần, ${remainingDays} ngày`;
    }
  }

  getStatusLabel(status: string): string {
    const t = this.t();
    const map: Record<string, string> = {
      planning: t.planning,
      active: t.active,
      maintenance: t.maintenance,
      suspended: t.suspended,
      deprecated: 'Deprecated',
      retired: 'Retired',
      cancelled: 'Cancelled',
    };
    return map[status] || status;
  }

  toggleStatusFilter(status: ModuleLifecycleStatus | null): void {
    if (!status) {
      this.statusFilter.set([]);
      return;
    }
    const current = this.statusFilter();
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    this.statusFilter.set(next);
  }



  adjustZoom(amount: number): void {
    const next = Math.max(0.75, Math.min(3.0, this.zoomLevel() + amount));
    this.zoomLevel.set(next);
  }

  getModuleMembers(module: ProjectModule): MemberResponse[] {
    const members = this.projectStore.members();
    if (members.length === 0) return [];

    const hash1 = this.hashCode(module.id);
    const index1 = Math.abs(hash1) % members.length;

    if (members.length === 1) {
      return [members[0]];
    }

    const hash2 = this.hashCode(module.id + '_extra');
    let index2 = Math.abs(hash2) % members.length;
    if (index2 === index1) {
      index2 = (index1 + 1) % members.length;
    }

    return [members[index1], members[index2]];
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }
}
