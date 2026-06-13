import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService } from 'primeng/api';

import { ProjectStore } from '../../../../projects/state/project.store';
import {
  CustomTranslationService,
  DEFAULT_TRANSLATIONS,
} from '../../../../shared/services/custom-translation.service';

@Component({
  standalone: true,
  selector: 'app-language-tab',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ToastModule,
    SelectButtonModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <div class="space-y-5">

      <!-- Language Selector -->
      <div class="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/30">
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <span class="text-sm font-semibold text-gray-800 dark:text-surface-100">{{ t().langLabel }}</span>
          <span class="text-xs text-gray-400 dark:text-surface-500">{{ t().langDesc }}</span>
        </div>
        <p-selectbutton
          [options]="languageOptions"
          [ngModel]="currentLang()"
          (ngModelChange)="onLanguageChange($event)"
          [allowEmpty]="false"
          optionLabel="label"
          optionValue="value"
          size="small"
        />
      </div>

      <!-- Main content: sidebar left + table right -->
      <div class="flex flex-col border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden bg-white dark:bg-surface-900 shadow-sm" style="min-height: 480px">

        <!-- Search bar: full width above both panels -->
        <div class="p-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-900/10 shrink-0">
          <div class="relative max-w-sm">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-surface-500 text-sm pointer-events-none"></i>
            <input
              pInputText
              class="w-full !pl-9"
              style="height:34px; font-size:13px"
              [placeholder]="t().searchPlaceholder"
              [ngModel]="searchText()"
              (ngModelChange)="searchText.set($event)"
            />
          </div>
        </div>

        <!-- Sidebar + table row -->
        <div class="flex flex-1 min-h-0">

        <!-- Sidebar: categories -->
        <div class="w-52 shrink-0 border-r border-surface-200 dark:border-surface-800 bg-surface-50/40 dark:bg-surface-800/20 flex flex-col overflow-y-auto">
          <div class="px-3 py-2.5 border-b border-surface-200 dark:border-surface-800 shrink-0">
            <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-surface-500">{{ t().categoriesHeader }}</span>
          </div>

          <!-- All -->
          <button
            type="button"
            class="w-full text-left px-3 py-2.5 flex items-center justify-between text-xs font-medium transition-colors duration-100"
            [class]="selectedCategory() === 'all'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700/50'"
            (click)="selectedCategory.set('all')"
          >
            <span>{{ t().allCategories }}</span>
            <span class="text-[10px] font-semibold text-gray-400 dark:text-surface-500">{{ totalCount }}</span>
          </button>

          <!-- Per-category -->
          @for (cat of categoryStats(); track cat.value) {
            <button
              type="button"
              class="w-full text-left px-3 py-2.5 flex items-center justify-between gap-1 text-[11px] transition-colors duration-100"
              [class]="selectedCategory() === cat.value
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-gray-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700/50'"
              (click)="selectedCategory.set(cat.value)"
            >
              <span class="truncate">{{ cat.label }}</span>
              <div class="flex items-center gap-1 shrink-0">
                @if (cat.customized > 0) {
                  <span class="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-bold px-1.5 min-w-[16px] h-4">{{ cat.customized }}</span>
                }
                <span class="text-[10px] text-gray-400 dark:text-surface-500">{{ cat.count }}</span>
              </div>
            </button>
          }
        </div>

        <!-- Right: table -->
        <div class="flex-1 min-w-0 flex flex-col">

          <!-- Translations table -->
          <div class="overflow-x-auto flex-1 min-h-0">
            <table class="w-full border-collapse text-left text-xs text-gray-500 dark:text-surface-400">
              <thead class="bg-surface-50 dark:bg-surface-800 text-gray-700 dark:text-surface-200 font-semibold uppercase tracking-wider border-b border-surface-200 dark:border-surface-800">
                <tr>
                  @if (selectedCategory() === 'all') {
                    <th class="px-4 py-3 w-[170px]">{{ t().colCategory }}</th>
                  }
                  <th class="px-4 py-3 w-[220px]">{{ t().colKey }}</th>
                  <th class="px-4 py-3">{{ t().colDefault }}</th>
                  <th class="px-4 py-3 min-w-[260px]">{{ t().colCustom }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-200 dark:divide-surface-800">
                @for (item of pagedTranslations(); track item.key) {
                  <tr class="hover:bg-surface-50/50 dark:hover:bg-surface-800/20 transition duration-150 align-middle">

                    <!-- Category tag: only when showing All -->
                    @if (selectedCategory() === 'all') {
                      <td class="px-4 py-3 align-middle">
                        <span class="inline-block max-w-[140px] truncate px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/5 text-primary border border-primary/10 leading-5">
                          {{ item.category }}
                        </span>
                      </td>
                    }

                    <!-- Key & Description -->
                    <td class="px-4 py-3 align-middle">
                      <div class="flex flex-col gap-0.5">
                        <span class="font-mono text-[11px] text-gray-800 dark:text-surface-200 select-all">{{ item.key }}</span>
                        <span class="text-[10px] text-gray-400 dark:text-surface-500">{{ item.description }}</span>
                      </div>
                    </td>

                    <!-- Default value -->
                    <td class="px-4 py-3 align-middle font-medium text-gray-700 dark:text-surface-300">
                      {{ isEn() ? item.defaultEn : item.defaultVi }}
                    </td>

                    <!-- Custom value editor -->
                    <td class="px-4 py-3 align-middle">
                      <div class="flex items-center gap-2">
                        <input
                          pInputText
                          class="flex-1"
                          style="height:30px; font-size:12px"
                          [placeholder]="isEn() ? item.defaultEn : item.defaultVi"
                          [ngModel]="getCustomValue(item.key)"
                          #customInput
                          (input)="onDraft(item.key, customInput.value)"
                          (keyup.enter)="saveOverride(item.key, customInput.value)"
                        />

                        @if (isDirty(item.key)) {
                          <button
                            pButton
                            icon="pi pi-check"
                            severity="success"
                            size="small"
                            [fluid]="false"
                            style="height:30px; width:30px; padding:0"
                            [pTooltip]="t().tooltipSave"
                            (click)="saveOverride(item.key, customInput.value)"
                          ></button>
                        }

                        @if (hasOverride(item.key) && !isDirty(item.key)) {
                          <button
                            pButton
                            icon="pi pi-refresh"
                            severity="secondary"
                            size="small"
                            text
                            [fluid]="false"
                            style="height:30px; width:30px; padding:0"
                            [pTooltip]="t().tooltipReset"
                            (click)="resetOverride(item.key); customInput.value = ''"
                          ></button>
                        }
                      </div>
                    </td>
                  </tr>
                }

                @if (filteredTranslations().length === 0) {
                  <tr>
                    <td [attr.colspan]="selectedCategory() === 'all' ? 4 : 3" class="px-4 py-12 text-center text-gray-400 dark:text-surface-500 font-medium">
                      <div class="flex flex-col items-center gap-2">
                        <i class="pi pi-language text-3xl opacity-30"></i>
                        <span>{{ t().noMatchingFound }}</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between px-4 py-2.5 border-t border-surface-200 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-900/10 text-xs text-gray-500 dark:text-surface-400 shrink-0">
              <span>{{ t().pageInfo(currentPage(), totalPages(), filteredTranslations().length) }}</span>
              <div class="flex items-center gap-0.5">
                <!-- First page -->
                <button pButton icon="pi pi-angle-double-left" size="small" text [fluid]="false"
                  style="height:28px;width:28px;padding:0" [disabled]="currentPage() === 1"
                  (click)="currentPage.set(1)"></button>
                <!-- Prev -->
                <button pButton icon="pi pi-angle-left" size="small" text [fluid]="false"
                  style="height:28px;width:28px;padding:0" [disabled]="currentPage() === 1"
                  (click)="prevPage()"></button>
                <!-- Direct page input -->
                <input
                  type="number"
                  min="1"
                  [max]="totalPages()"
                  [value]="currentPage()"
                  (keydown.enter)="goToPage($any($event.target).value); $any($event.target).blur()"
                  (blur)="goToPage($any($event.target).value)"
                  (focus)="$any($event.target).select()"
                  class="text-center font-semibold text-gray-700 dark:text-surface-200 bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded"
                  style="width:44px;height:28px;font-size:12px"
                />
                <span class="px-1 text-gray-400 dark:text-surface-500">/ {{ totalPages() }}</span>
                <!-- Next -->
                <button pButton icon="pi pi-angle-right" size="small" text [fluid]="false"
                  style="height:28px;width:28px;padding:0" [disabled]="currentPage() === totalPages()"
                  (click)="nextPage()"></button>
                <!-- Last page -->
                <button pButton icon="pi pi-angle-double-right" size="small" text [fluid]="false"
                  style="height:28px;width:28px;padding:0" [disabled]="currentPage() === totalPages()"
                  (click)="currentPage.set(totalPages())"></button>
              </div>
            </div>
          }

        </div>
        </div><!-- end sidebar+table row -->
      </div><!-- end main container -->
    </div>
  `,
  styles: [`
    :host { display: block; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
  `]
})
export class LanguageTabComponent {
  private readonly projectStore = inject(ProjectStore);
  private readonly customTrans = inject(CustomTranslationService);
  private readonly messageService = inject(MessageService);

  readonly searchText = signal('');

  private static readonly firstCategory =
    [...new Set(DEFAULT_TRANSLATIONS.map(t => t.category))]
      .sort((a, b) => a.localeCompare(b))[0] ?? 'all';

  readonly selectedCategory = signal<string>(LanguageTabComponent.firstCategory);

  readonly PAGE_SIZE = 20;
  readonly currentPage = signal(1);
  readonly draftValues = signal<Record<string, string>>({});

  protected get projectId(): string {
    return this.projectStore.currentProject()?.id ?? '';
  }

  readonly currentLang = computed(() => this.projectStore.projectLanguage());
  readonly isEn = computed(() => this.currentLang() === 'en');

  readonly languageOptions = [
    { label: 'Tiếng Việt', value: 'vi' },
    { label: 'English', value: 'en' },
  ];

  readonly totalCount = DEFAULT_TRANSLATIONS.length;

  onLanguageChange(lang: 'vi' | 'en'): void {
    this.projectStore.setProjectLanguage(lang);
  }

  // Category stats: count + customized count per category
  readonly categoryStats = computed(() => {
    const lang = this.currentLang();
    const overrides = this.customTrans.overrides()[lang] ?? {};

    const groups = new Map<string, { count: number; customized: number }>();
    for (const item of DEFAULT_TRANSLATIONS) {
      if (!groups.has(item.category)) {
        groups.set(item.category, { count: 0, customized: 0 });
      }
      const g = groups.get(item.category)!;
      g.count++;
      if (overrides[item.key] !== undefined) g.customized++;
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, stats]) => ({
        value: cat,
        label: cat,
        count: stats.count,
        customized: stats.customized,
      }));
  });

  readonly t = computed(() => {
    return this.isEn() ? {
      langLabel: 'Display Language',
      langDesc: 'Choose the language used across this project\'s interface.',
      categoriesHeader: 'Categories',
      allCategories: 'All',
      searchPlaceholder: 'Search translation keys or default text...',
      colCategory: 'Category',
      colKey: 'Translation Key',
      colDefault: 'Default Value',
      colCustom: 'Custom Translation',
      tooltipSave: 'Save Custom Translation',
      tooltipReset: 'Reset to Default',
      noMatchingFound: 'No matching translation keys found',
      saveSuccess: 'Translation saved successfully',
      resetSuccess: 'Translation reset to default',
      pageInfo: (page: number, total: number, count: number) => `${count} keys · Page ${page} of ${total}`,
    } : {
      langLabel: 'Ngôn ngữ hiển thị',
      langDesc: 'Chọn ngôn ngữ hiển thị cho toàn bộ giao diện dự án này.',
      categoriesHeader: 'Danh mục',
      allCategories: 'Tất cả',
      searchPlaceholder: 'Tìm kiếm mã dịch hoặc văn bản mặc định...',
      colCategory: 'Danh mục',
      colKey: 'Mã Dịch',
      colDefault: 'Giá trị mặc định',
      colCustom: 'Văn bản tùy chỉnh',
      tooltipSave: 'Lưu văn bản tùy chỉnh',
      tooltipReset: 'Đặt lại mặc định',
      noMatchingFound: 'Không tìm thấy mã dịch nào trùng khớp',
      saveSuccess: 'Đã lưu cấu hình dịch mới',
      resetSuccess: 'Đã đặt lại bản dịch mặc định',
      pageInfo: (page: number, total: number, count: number) => `${count} mã · Trang ${page} / ${total}`,
    };
  });

  constructor() {
    effect(() => {
      this.searchText();
      this.selectedCategory();
      this.currentPage.set(1);
      this.draftValues.set({});
    });
    effect(() => {
      this.currentPage();
      this.draftValues.set({});
    });
  }

  // Filtered translations
  readonly filteredTranslations = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const cat = this.selectedCategory();

    return DEFAULT_TRANSLATIONS.filter(item => {
      if (cat !== 'all' && item.category !== cat) return false;

      if (search) {
        return (
          item.key.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search) ||
          item.defaultEn.toLowerCase().includes(search) ||
          item.defaultVi.toLowerCase().includes(search) ||
          this.getCustomValue(item.key).toLowerCase().includes(search)
        );
      }

      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTranslations().length / this.PAGE_SIZE))
  );

  readonly pagedTranslations = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.PAGE_SIZE;
    return this.filteredTranslations().slice(start, start + this.PAGE_SIZE);
  });

  prevPage(): void {
    this.currentPage.update(p => Math.max(1, p - 1));
  }

  nextPage(): void {
    this.currentPage.update(p => Math.min(this.totalPages(), p + 1));
  }

  goToPage(value: string | number): void {
    const n = Math.round(Number(value));
    if (!isNaN(n)) this.currentPage.set(Math.max(1, Math.min(this.totalPages(), n)));
  }

  onDraft(key: string, value: string): void {
    this.draftValues.update(d => ({ ...d, [key]: value }));
  }

  isDirty(key: string): boolean {
    const draft = this.draftValues()[key];
    return draft !== undefined && draft !== this.getCustomValue(key);
  }

  getCustomValue(key: string): string {
    const lang = this.currentLang();
    return this.customTrans.overrides()[lang]?.[key] ?? '';
  }

  hasOverride(key: string): boolean {
    const lang = this.currentLang();
    return this.customTrans.overrides()[lang]?.[key] !== undefined;
  }

  saveOverride(key: string, value: string) {
    const val = value.trim();
    const lang = this.currentLang();

    if (!val) {
      this.resetOverride(key);
      return;
    }

    this.customTrans.saveTranslation(this.projectId, lang, key, val);
    this.draftValues.update(d => { const n = { ...d }; delete n[key]; return n; });
    this.messageService.add({
      severity: 'success',
      summary: this.isEn() ? 'Success' : 'Thành công',
      detail: this.t().saveSuccess,
    });
  }

  resetOverride(key: string) {
    const lang = this.currentLang();
    this.customTrans.resetTranslation(this.projectId, lang, key);
    this.draftValues.update(d => { const n = { ...d }; delete n[key]; return n; });
    this.messageService.add({
      severity: 'info',
      summary: this.isEn() ? 'Reset' : 'Đặt lại',
      detail: this.t().resetSuccess,
    });
  }
}
