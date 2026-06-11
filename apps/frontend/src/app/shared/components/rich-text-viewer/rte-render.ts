import { generateHTML, type Extensions, type JSONContent } from '@tiptap/core';
import { buildExtensions } from '../rich-text-editor/rte-extensions';
import { RTE_FULL } from '../rich-text-editor/rte-features';
import type { TiptapDoc } from '@mpm/shared-types';

let renderExtensions: Extensions | null = null;

/**
 * Bộ extensions chỉ để render (schema RTE_FULL, mention search rỗng).
 * Lệch bộ extensions với editor = mất node/mark khi render — luôn đi qua buildExtensions.
 */
function getRenderExtensions(): Extensions {
  if (!renderExtensions) {
    renderExtensions = buildExtensions(RTE_FULL, '', async () => []) as unknown as Extensions;
  }
  return renderExtensions;
}

/** Doc rỗng khi null / không content / chỉ chứa paragraph không có text. */
export function isDocEmpty(d: TiptapDoc | null | undefined): boolean {
  if (!d || !Array.isArray(d['content']) || d['content'].length === 0) return true;
  return (d['content'] as JSONContent[]).every(
    (node) => node.type === 'paragraph' && !node.content?.length,
  );
}

/** Convert TiptapDoc → HTML. Trả null nếu doc chứa node ngoài schema (generateHTML throw). */
export function renderDocToHtml(d: TiptapDoc): string | null {
  try {
    return generateHTML(d as JSONContent, getRenderExtensions());
  } catch (err) {
    console.error('generateHTML failed:', err);
    return null;
  }
}

/** Flip attrs.checked của taskItem thứ `index` (document-order). Trả doc mới, null nếu không tìm thấy. */
export function flipTaskItemAt(d: TiptapDoc, index: number): TiptapDoc | null {
  const clone = JSON.parse(JSON.stringify(d)) as TiptapDoc;
  let counter = 0;
  let done = false;
  const visit = (node: Record<string, any>): void => {
    if (done) return;
    if (node['type'] === 'taskItem') {
      if (counter === index) {
        node['attrs'] = { ...(node['attrs'] ?? {}), checked: !node['attrs']?.['checked'] };
        done = true;
        return;
      }
      counter++;
    }
    (node['content'] as Record<string, any>[] | undefined)?.forEach(visit);
  };
  (clone['content'] as Record<string, any>[] | undefined)?.forEach(visit);
  return done ? clone : null;
}
