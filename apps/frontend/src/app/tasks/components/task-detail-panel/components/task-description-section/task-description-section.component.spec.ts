import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { TaskDescriptionSectionComponent } from './task-description-section.component';
import { RichTextEditorComponent } from '../../../../../shared/components/rich-text-editor/rich-text-editor.component';
import type { TiptapDoc } from '@mpm/shared-types';

// Stub RTE — TipTap thật không cần thiết cho logic swap/save/cancel
@Component({
  standalone: true,
  selector: 'app-rich-text-editor',
  template: '<div data-testid="stub-rte"></div>',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubRteComponent), multi: true }],
})
class StubRteComponent implements ControlValueAccessor {
  @Input() placeholder = '';
  @Input() autofocus = false;
  @Output() blurEditor = new EventEmitter<void>();
  value: unknown = null;
  onChange: (v: unknown) => void = () => {};
  writeValue(v: unknown): void { this.value = v; }
  registerOnChange(fn: (v: unknown) => void): void { this.onChange = fn; }
  registerOnTouched(): void {}
}

const textDoc: TiptapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'mô tả' }] }],
};

describe('TaskDescriptionSectionComponent', () => {
  let confirmAccept: (() => void) | undefined;
  const mockConfirm = {
    confirm: jest.fn((opts: { accept?: () => void }) => { confirmAccept = opts.accept; }),
  };

  async function setup(doc: TiptapDoc | null) {
    mockConfirm.confirm.mockClear();
    confirmAccept = undefined;
    TestBed.configureTestingModule({
      imports: [TaskDescriptionSectionComponent],
      providers: [{ provide: ConfirmationService, useValue: mockConfirm }],
    });
    TestBed.overrideComponent(TaskDescriptionSectionComponent, {
      remove: { imports: [RichTextEditorComponent] },
      add: { imports: [StubRteComponent] },
    });
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(TaskDescriptionSectionComponent);
    fixture.componentInstance.doc = doc;
    fixture.detectChanges();
    return fixture;
  }

  const el = (f: ReturnType<typeof TestBed.createComponent>, id: string) =>
    (f.nativeElement as HTMLElement).querySelector<HTMLElement>(`[data-testid="${id}"]`);

  it('mặc định ở chế độ đọc', async () => {
    const fixture = await setup(textDoc);
    expect(el(fixture, 'description-read')).toBeTruthy();
    expect(el(fixture, 'description-edit')).toBeFalsy();
  });

  it('doc trống → hiện placeholder, click vào edit ngay', async () => {
    const fixture = await setup(null);
    expect(el(fixture, 'description-placeholder')!.textContent).toContain('Thêm mô tả');
    el(fixture, 'description-placeholder')!.click();
    fixture.detectChanges();
    expect(el(fixture, 'description-edit')).toBeTruthy();
  });

  it('bấm nút bút chì → vào edit', async () => {
    const fixture = await setup(textDoc);
    el(fixture, 'description-edit-btn')!.click();
    fixture.detectChanges();
    expect(el(fixture, 'description-edit')).toBeTruthy();
    expect(fixture.componentInstance.editing()).toBe(true);
  });

  it('Lưu → emit saveRequested với draft; saveStatus saved → quay về đọc', async () => {
    const fixture = await setup(textDoc);
    const saved = jest.fn();
    fixture.componentInstance.saveRequested.subscribe(saved);
    fixture.componentInstance.enterEdit();
    fixture.detectChanges();
    el(fixture, 'description-save')!.click();
    expect(saved).toHaveBeenCalledWith(textDoc);
    fixture.componentInstance.saveStatus = 'saved';
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBe(false);
  });

  it('saveStatus error → GIỮ chế độ edit và draft', async () => {
    const fixture = await setup(textDoc);
    fixture.componentInstance.enterEdit();
    fixture.detectChanges();
    el(fixture, 'description-save')!.click();
    fixture.componentInstance.saveStatus = 'error';
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBe(true);
  });

  it('Hủy khi không dirty → thoát edit không confirm', async () => {
    const fixture = await setup(textDoc);
    fixture.componentInstance.enterEdit();
    fixture.detectChanges();
    el(fixture, 'description-cancel')!.click();
    fixture.detectChanges();
    expect(mockConfirm.confirm).not.toHaveBeenCalled();
    expect(fixture.componentInstance.editing()).toBe(false);
  });

  it('Hủy khi dirty → confirm, accept thì thoát', async () => {
    const fixture = await setup(textDoc);
    fixture.componentInstance.enterEdit();
    fixture.componentInstance.draft.set({ type: 'doc', content: [] });
    fixture.detectChanges();
    el(fixture, 'description-cancel')!.click();
    expect(mockConfirm.confirm).toHaveBeenCalled();
    expect(fixture.componentInstance.editing()).toBe(true); // chưa thoát
    confirmAccept!();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBe(false);
  });

  it('Esc trong edit → stopPropagation + xử lý như Hủy', async () => {
    const fixture = await setup(textDoc);
    fixture.componentInstance.enterEdit();
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const stopSpy = jest.spyOn(event, 'stopPropagation');
    el(fixture, 'description-edit')!.dispatchEvent(event);
    fixture.detectChanges();
    expect(stopSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.editing()).toBe(false); // không dirty → thoát luôn
  });
});
