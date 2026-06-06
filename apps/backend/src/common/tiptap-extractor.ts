export type TiptapDoc = Record<string, any>;

export function extractPlainText(doc: TiptapDoc | null | undefined): string {
  if (!doc) return '';
  return collectText(doc).replace(/\s+/g, ' ').trim();
}

function collectText(node: Record<string, any>): string {
  if (node.type === 'text') return node.text ?? '';
  if (!Array.isArray(node.content)) return '';
  return node.content
    .map((child: Record<string, any>) => collectText(child))
    .join(' ');
}
