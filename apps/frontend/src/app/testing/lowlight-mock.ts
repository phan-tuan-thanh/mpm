export const common = {};
export function createLowlight() {
  return {
    highlight: () => ({ children: [] }),
    highlightAuto: () => ({ children: [] }),
    registerLanguage: () => {},
    registered: () => [],
    listLanguages: () => [],
  };
}
