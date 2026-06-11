import { isDocEmpty, renderDocToHtml, flipTaskItemAt } from './rte-render';
import type { TiptapDoc } from '@mpm/shared-types';

const doc = (content: unknown[]): TiptapDoc => ({ type: 'doc', content });

describe('isDocEmpty', () => {
  it('true với null/undefined', () => {
    expect(isDocEmpty(null)).toBe(true);
    expect(isDocEmpty(undefined)).toBe(true);
  });

  it('true với doc không có content hoặc content rỗng', () => {
    expect(isDocEmpty({ type: 'doc' })).toBe(true);
    expect(isDocEmpty(doc([]))).toBe(true);
  });

  it('true với doc chỉ chứa paragraph rỗng', () => {
    expect(isDocEmpty(doc([{ type: 'paragraph' }]))).toBe(true);
  });

  it('false khi có text', () => {
    expect(isDocEmpty(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }]))).toBe(false);
  });
});

describe('renderDocToHtml', () => {
  it('render đủ heading + text-align, màu chữ, taskList', () => {
    const html = renderDocToHtml(doc([
      { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [{ type: 'text', text: 'Tiêu đề' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'màu', marks: [{ type: 'textStyle', attrs: { color: '#ff0000' } }] }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'việc' }] }] }] },
    ]));
    expect(html).toContain('<h1');
    expect(html).toContain('text-align: center');
    expect(html).toContain('color: rgb(255, 0, 0)');
    expect(html).toContain('data-checked="true"');
  });

  it('trả null với node lạ thay vì throw', () => {
    expect(renderDocToHtml(doc([{ type: 'node_khong_ton_tai' }]))).toBeNull();
  });
});

describe('flipTaskItemAt', () => {
  const threeItems = (): TiptapDoc => doc([
    { type: 'taskList', content: [
      { type: 'taskItem', attrs: { checked: false }, content: [] },
      { type: 'taskItem', attrs: { checked: true }, content: [] },
      { type: 'taskItem', attrs: { checked: false }, content: [] },
    ]},
  ]);

  it('flip đúng taskItem thứ N theo document-order', () => {
    const next = flipTaskItemAt(threeItems(), 1)!;
    const items = (next['content'] as any[])[0].content;
    expect(items[0].attrs.checked).toBe(false);
    expect(items[1].attrs.checked).toBe(false); // đã flip true→false
    expect(items[2].attrs.checked).toBe(false);
  });

  it('không mutate doc gốc', () => {
    const original = threeItems();
    flipTaskItemAt(original, 0);
    expect((original['content'] as any[])[0].content[0].attrs.checked).toBe(false);
  });

  it('trả null khi index ngoài phạm vi', () => {
    expect(flipTaskItemAt(threeItems(), 99)).toBeNull();
  });
});
