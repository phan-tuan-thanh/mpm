import { Mention } from '@tiptap/extension-mention';

export interface MentionItem {
  id: string;
  label: string;
}

function positionEl(el: HTMLElement, rect: DOMRect): void {
  el.style.position = 'fixed';
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.bottom + 4}px`;
  el.style.zIndex = '9999';
}

function renderItems(el: HTMLUListElement, props: { items: MentionItem[]; command: (item: MentionItem) => void }): void {
  el.innerHTML = '';
  if (!props.items.length) {
    const li = document.createElement('li');
    li.className = 'rte-mention-empty';
    li.textContent = 'Không tìm thấy';
    el.appendChild(li);
    return;
  }
  props.items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'rte-mention-item';
    li.textContent = item.label;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      props.command(item);
    });
    el.appendChild(li);
  });
}

export function buildMentionExtension(search: (query: string) => Promise<MentionItem[]>) {
  return Mention.configure({
    HTMLAttributes: { class: 'rte-mention' },
    suggestion: {
      items: ({ query }: { query: string }) => search(query),
      render: () => {
        let el: HTMLUListElement;
        return {
          onStart: (props: any) => {
            el = document.createElement('ul');
            el.className = 'rte-mention-list';
            renderItems(el, props);
            document.body.appendChild(el);
            const rect = props.clientRect?.();
            if (rect) positionEl(el, rect);
          },
          onUpdate: (props: any) => {
            renderItems(el, props);
            const rect = props.clientRect?.();
            if (rect) positionEl(el, rect);
          },
          onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'Escape') {
              el?.remove();
              return true;
            }
            return false;
          },
          onExit: () => el?.remove(),
        };
      },
    },
  });
}
