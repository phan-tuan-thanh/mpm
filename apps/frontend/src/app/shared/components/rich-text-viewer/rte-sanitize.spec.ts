import { sanitizeRteHtml } from './rte-sanitize';

describe('sanitizeRteHtml', () => {
  it('loại script, onerror, javascript: href', () => {
    expect(sanitizeRteHtml('<p>a</p><script>x()</script>')).not.toContain('script');
    expect(sanitizeRteHtml('<img src="x.png" onerror="x()">')).not.toContain('onerror');
    expect(sanitizeRteHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
  });

  it('giữ style trong allowlist, loại property ngoài allowlist', () => {
    const out = sanitizeRteHtml('<p style="color: red; position: fixed; text-align: right; font-family: Arial">x</p>');
    expect(out).toContain('color: red');
    expect(out).toContain('text-align: right');
    expect(out).toContain('font-family: Arial');
    expect(out).not.toContain('position');
  });

  it('giữ mark (highlight), checked/data-checked (taskItem), width/height (ảnh resize)', () => {
    expect(sanitizeRteHtml('<mark style="background-color: yellow">x</mark>')).toContain('<mark');
    const task = sanitizeRteHtml('<li data-type="taskItem" data-checked="true"><input type="checkbox" checked></li>');
    expect(task).toContain('data-checked="true"');
    expect(task).toContain('checked');
    expect(sanitizeRteHtml('<img src="a.png" width="300" height="200">')).toContain('width="300"');
  });

  it('ép mọi <a> thành target=_blank rel=noopener noreferrer', () => {
    const out = sanitizeRteHtml('<a href="https://example.vn">x</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('noopener');
  });
});
