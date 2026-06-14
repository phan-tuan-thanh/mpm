import { Component, Input, Output, EventEmitter, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ICON_GROUPS, IconContext, EMOJI_GROUPS } from './icon-picker.constants';

type AnimationClass = '' | 'pi-spin' | 'animate-pulse' | 'animate-bounce';

const ANIMATION_CLASSES: Exclude<AnimationClass, ''>[] = ['pi-spin', 'animate-pulse', 'animate-bounce'];

@Component({
  standalone: true,
  selector: 'app-icon-picker-panel',
  imports: [CommonModule, FormsModule, InputTextModule],
  templateUrl: './icon-picker-panel.component.html',
})
export class IconPickerPanelComponent implements OnInit {
  @Input() value = 'pi pi-flag';
  @Output() valueChange = new EventEmitter<string>();

  /** Lọc nhóm icon theo ngữ cảnh sử dụng; không set = hiện tất cả */
  @Input() set context(v: IconContext | undefined) {
    this._context.set(v);
  }
  private readonly _context = signal<IconContext | undefined>(undefined);

  readonly search = signal('');
  readonly activeTab = signal<'icon' | 'emoji'>('icon');
  readonly activeAnimation = signal<AnimationClass>('');

  /** Icon gốc không kèm animation class */
  readonly baseIcon = computed(() => {
    let v = (this.value ?? '').trim();
    for (const cls of ANIMATION_CLASSES) {
      v = v.replace(new RegExp(`\\s+${cls}`, 'g'), '').trim();
    }
    return v;
  });

  readonly filteredGroups = computed(() => {
    const q = this.search().toLowerCase();
    const ctx = this._context();

    let groups = ICON_GROUPS;
    if (ctx) {
      groups = groups.filter((g) => !g.contexts || g.contexts.includes(ctx));
    }
    if (!q) return groups;
    return groups
      .map(g => ({ ...g, icons: g.icons.filter(i => i.icon.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)) }))
      .filter(g => g.icons.length > 0);
  });

  readonly filteredEmojis = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return EMOJI_GROUPS;
    return EMOJI_GROUPS
      .map(g => ({ ...g, icons: g.icons.filter(i => i.emoji.includes(q) || i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)) }))
      .filter(g => g.icons.length > 0);
  });

  ngOnInit(): void {
    if (this.value && !this.value.startsWith('pi ')) {
      this.activeTab.set('emoji');
    }
    for (const cls of ANIMATION_CLASSES) {
      if (this.value?.includes(cls)) {
        this.activeAnimation.set(cls);
        break;
      }
    }
  }

  select(iconClass: string): void {
    const anim = this.activeAnimation();
    const full = anim ? `${iconClass} ${anim}` : iconClass;
    this.value = full;
    this.valueChange.emit(full);
  }

  selectEmoji(emojiStr: string): void {
    if (emojiStr) {
      this.value = emojiStr;
      this.valueChange.emit(emojiStr);
    }
  }

  setAnimation(anim: AnimationClass): void {
    this.activeAnimation.set(anim);
    const base = this.baseIcon();
    if (base) {
      const full = anim ? `${base} ${anim}` : base;
      this.value = full;
      this.valueChange.emit(full);
    }
  }

  iconClassFor(itemIcon: string): string {
    const anim = this.activeAnimation();
    return this.baseIcon() === itemIcon && anim ? `${itemIcon} ${anim}` : itemIcon;
  }
}
