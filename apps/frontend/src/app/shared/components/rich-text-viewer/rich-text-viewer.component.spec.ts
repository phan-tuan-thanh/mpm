import { TestBed } from '@angular/core/testing';
import { RichTextViewerComponent } from './rich-text-viewer.component';
import type { TiptapDoc } from '@mpm/shared-types';

const textDoc: TiptapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'nội dung' }] }],
};

describe('RichTextViewerComponent', () => {
  async function setup(inputs: Partial<{ doc: TiptapDoc | null; html: string | null }>) {
    await TestBed.configureTestingModule({ imports: [RichTextViewerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RichTextViewerComponent);
    if (inputs.doc !== undefined) fixture.componentInstance.doc = inputs.doc;
    if (inputs.html !== undefined) fixture.componentInstance.html = inputs.html;
    fixture.detectChanges();
    return fixture;
  }

  it('render doc JSON thành HTML', async () => {
    const fixture = await setup({ doc: textDoc });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('nội dung');
  });

  it('render html string trực tiếp (chế độ comment)', async () => {
    const fixture = await setup({ html: '<p>bình luận</p>' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('bình luận');
  });

  it('click text → emit editRequested', async () => {
    const fixture = await setup({ doc: textDoc });
    const emitted = jest.fn();
    fixture.componentInstance.editRequested.subscribe(emitted);
    (fixture.nativeElement as HTMLElement).querySelector('p')!.click();
    expect(emitted).toHaveBeenCalled();
  });

  it('click link → KHÔNG emit editRequested', async () => {
    const fixture = await setup({ html: '<p><a href="https://x.vn">link</a></p>' });
    const emitted = jest.fn();
    fixture.componentInstance.editRequested.subscribe(emitted);
    const a = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    a.addEventListener('click', (e) => e.preventDefault()); // chặn jsdom navigate
    a.click();
    expect(emitted).not.toHaveBeenCalled();
  });

  it('đang bôi đen text → KHÔNG emit editRequested', async () => {
    const fixture = await setup({ doc: textDoc });
    const emitted = jest.fn();
    fixture.componentInstance.editRequested.subscribe(emitted);
    jest.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'nội' } as Selection);
    (fixture.nativeElement as HTMLElement).querySelector('p')!.click();
    expect(emitted).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('click checkbox → emit checkboxToggled với taskItem đã flip, KHÔNG emit editRequested', async () => {
    const taskDoc: TiptapDoc = {
      type: 'doc',
      content: [{ type: 'taskList', content: [
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'việc' }] }] },
      ]}],
    };
    const fixture = await setup({ doc: taskDoc });
    const toggled = jest.fn();
    const edited = jest.fn();
    fixture.componentInstance.checkboxToggled.subscribe(toggled);
    fixture.componentInstance.editRequested.subscribe(edited);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    expect(toggled).toHaveBeenCalledWith(expect.objectContaining({ type: 'doc' }));
    expect((toggled.mock.calls[0][0]['content'] as any[])[0].content[0].attrs.checked).toBe(true);
    expect(edited).not.toHaveBeenCalled();
  });

  it('doc chứa node lạ → hiện fallback, không vỡ', async () => {
    const fixture = await setup({ doc: { type: 'doc', content: [{ type: 'node_la' }] } });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không hiển thị được');
  });
});
