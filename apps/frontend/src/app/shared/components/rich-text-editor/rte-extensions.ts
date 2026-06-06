import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Underline } from '@tiptap/extension-underline';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { FontFamily } from '@tiptap/extension-font-family';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Typography } from '@tiptap/extension-typography';
import { common, createLowlight } from 'lowlight';
import type { RteFeatures } from './rte-features';
import type { MentionItem } from './rte-mention';
import { buildMentionExtension } from './rte-mention';

const lowlight = createLowlight(common);

export function buildExtensions(
  f: RteFeatures,
  placeholder: string,
  mentionSearch?: (query: string) => Promise<MentionItem[]>,
): Extension[] {
  const exts: Extension[] = [
    StarterKit.configure({
      codeBlock: false,
      heading: f.headings !== false ? { levels: [1, 2, 3] } : false,
      bulletList: f.bulletList !== false ? {} : false,
      orderedList: f.orderedList !== false ? {} : false,
      blockquote: f.blockquote !== false ? {} : false,
      strike: f.strike !== false ? {} : false,
      bold: f.bold !== false ? {} : false,
      italic: f.italic !== false ? {} : false,
      // TipTap v3 StarterKit bundles Link & Underline by default — disable to
      // avoid duplicates since we add them below with custom configuration.
      link: false,
      underline: false,
    }) as unknown as Extension,
    Placeholder.configure({ placeholder }) as unknown as Extension,
  ];

  if (f.underline !== false) exts.push(Underline as unknown as Extension);
  if (f.link !== false) exts.push(Link.configure({ openOnClick: false }) as unknown as Extension);
  if (f.image !== false) exts.push(Image as unknown as Extension);
  if (f.table !== false) {
    exts.push(
      Table.configure({ resizable: true }) as unknown as Extension,
      TableRow as unknown as Extension,
      TableCell as unknown as Extension,
      TableHeader as unknown as Extension,
    );
  }
  if (f.taskList !== false) {
    exts.push(
      TaskList as unknown as Extension,
      TaskItem.configure({ nested: true }) as unknown as Extension,
    );
  }
  if (f.color !== false) {
    exts.push(TextStyle as unknown as Extension, Color as unknown as Extension);
  } else if (f.fontFamily) {
    exts.push(TextStyle as unknown as Extension);
  }
  if (f.codeBlock !== false) {
    exts.push(CodeBlockLowlight.configure({ lowlight }) as unknown as Extension);
  }
  if (f.highlight) {
    exts.push(Highlight.configure({ multicolor: true }) as unknown as Extension);
  }
  if (f.textAlign) {
    exts.push(TextAlign.configure({ types: ['heading', 'paragraph'] }) as unknown as Extension);
  }
  if (f.subscript) exts.push(Subscript as unknown as Extension);
  if (f.superscript) exts.push(Superscript as unknown as Extension);
  if (f.fontFamily) exts.push(FontFamily as unknown as Extension);
  if (f.typography) exts.push(Typography as unknown as Extension);
  if (f.mention && mentionSearch) {
    exts.push(buildMentionExtension(mentionSearch) as unknown as Extension);
  }
  if (f.characterCount !== false) {
    exts.push(
      CharacterCount.configure({
        limit: typeof f.characterCount === 'number' ? f.characterCount : undefined,
      }) as unknown as Extension,
    );
  }

  return exts;
}
