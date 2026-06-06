export type ToolbarMode = 'bubble' | 'full' | 'overflow';

export interface RteFeatures {
  // Text formatting
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  highlight?: boolean;
  color?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  fontFamily?: boolean;
  textAlign?: boolean;

  // Structure
  headings?: boolean;
  bulletList?: boolean;
  orderedList?: boolean;
  taskList?: boolean;
  blockquote?: boolean;
  codeBlock?: boolean;
  table?: boolean;

  // Rich content
  link?: boolean;
  image?: boolean;
  mention?: boolean;

  // Meta
  characterCount?: number | false;
  typography?: boolean;
}

export const RTE_MINIMAL: RteFeatures = {
  bold: true,
  italic: true,
  underline: true,
  headings: true,
  bulletList: true,
  orderedList: true,
  link: true,
  characterCount: false,
};

export const RTE_STANDARD: RteFeatures = {
  ...RTE_MINIMAL,
  strike: true,
  highlight: true,
  color: true,
  taskList: true,
  blockquote: true,
  codeBlock: true,
  image: true,
  table: true,
};

export const RTE_FULL: RteFeatures = {
  ...RTE_STANDARD,
  subscript: true,
  superscript: true,
  fontFamily: true,
  textAlign: true,
  mention: true,
  typography: true,
};
