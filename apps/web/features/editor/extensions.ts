import { Extension, InputRule, Node, mergeAttributes } from '@tiptap/react';
import type { Editor, Range } from '@tiptap/react';
import Youtube from '@tiptap/extension-youtube';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Editor extensions
 * Markdown round-tripping for YouTube embeds, Obsidian-style [[Page]] links,
 * the [[ page picker, /page to create a page, and "- [ ]" checklists.
 */

interface MarkdownState {
  write: (text: string) => void;
  closeBlock: (node: unknown) => void;
}

export function youTubeId(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
    if (url.hostname.endsWith('youtube.com') || url.hostname.endsWith('youtube-nocookie.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/);
      return match ? match[1] : null;
    }
  } catch {
    // Not an absolute URL
  }
  return null;
}

/**
 * YouTube video stored as a bare watch URL on its own line, the same
 * convention the rest of the product reads.
 */
export const YouTubeVideo = Youtube.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownState, node: { attrs: { src: string } }) {
          const id = youTubeId(node.attrs.src);
          state.write(id ? `https://www.youtube.com/watch?v=${id}` : node.attrs.src);
          state.closeBlock(node);
        },
        parse: {
          // A paragraph holding only a YouTube link becomes an embed
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('p').forEach((p) => {
              const only = p.childNodes.length === 1 ? p.firstChild : null;
              const href = only instanceof HTMLAnchorElement ? only.getAttribute('href') ?? '' : p.textContent?.trim() ?? '';
              const id = youTubeId(href);
              if (!id) return;
              const wrapper = document.createElement('div');
              wrapper.setAttribute('data-youtube-video', '');
              const iframe = document.createElement('iframe');
              iframe.setAttribute('src', `https://www.youtube.com/watch?v=${id}`);
              wrapper.appendChild(iframe);
              p.replaceWith(wrapper);
            });
          },
        },
      },
    };
  },
}).configure({ nocookie: true, width: 640, height: 360 });

/* ---------- [[Page]] links ---------- */

const WIKILINK_TEXT = /\[\[([^[\]\n]+)\]\]/g;

interface WikiLinkOptions {
  /** Whether a page with this title exists; missing links render dashed */
  exists: (title: string) => boolean;
}

/**
 * An Obsidian-style link to another page by title, stored in markdown as [[Title]].
 * It may point at a page that does not exist yet.
 */
export const WikiLink = Node.create<WikiLinkOptions>({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { exists: () => true };
  },

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-wikilink') ?? '',
        renderHTML: (attrs) => ({ 'data-wikilink': attrs.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wikilink]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'wikilink', role: 'link' }), node.attrs.title];
  },

  renderText({ node }) {
    return `[[${node.attrs.title}]]`;
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownState, node: { attrs: { title: string } }) {
          state.write(`[[${node.attrs.title}]]`);
        },
        parse: {
          // Turn [[Title]] text into link spans, leaving code untouched
          updateDOM(element: HTMLElement) {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            const targets: Text[] = [];
            while (walker.nextNode()) {
              const text = walker.currentNode as Text;
              if (text.parentElement?.closest('code, pre')) continue;
              if (text.data.includes('[[')) targets.push(text);
            }
            for (const text of targets) {
              const fragment = document.createDocumentFragment();
              let last = 0;
              // A fresh regex each time: a shared global one carries lastIndex between calls
              for (const match of Array.from(text.data.matchAll(new RegExp(WIKILINK_TEXT.source, 'g')))) {
                const index = match.index ?? 0;
                fragment.append(text.data.slice(last, index));
                const span = document.createElement('span');
                span.setAttribute('data-wikilink', match[1].trim());
                fragment.append(span);
                last = index + match[0].length;
              }
              fragment.append(text.data.slice(last));
              text.replaceWith(fragment);
            }
          },
        },
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^[\]\n]+)\]\]$/,
        handler: ({ range, match, chain }) => {
          chain().deleteRange(range).insertContent({ type: this.name, attrs: { title: match[1].trim() } }).run();
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const { exists } = this.options;
    const name = this.name;
    return [
      new Plugin({
        key: new PluginKey('wikiLinkState'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name === name && !exists(node.attrs.title)) {
                decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: 'wikilink-missing' }));
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

/* ---------- [[ picker and /page ---------- */

export interface PageLinkItem {
  /** Page id, or null for a page that does not exist yet */
  id: string | null;
  title: string;
}

/** "link" lists pages to link; "create" offers the one page /page will open */
export type PagePickerMode = 'link' | 'create';

export interface PageLinkPickerState {
  mode: PagePickerMode;
  /** What was typed after the trigger */
  query: string;
  items: PageLinkItem[];
  index: number;
  rect: DOMRect | null;
  select: (item: PageLinkItem) => void;
}

interface PageLinkOptions {
  /** What opens the picker: "[[" to link a page, "/page" to create one and go there */
  char: string;
  mode: PagePickerMode;
  getItems: (query: string) => PageLinkItem[];
  /** Called once the [[Page]] link is in the text */
  onPick: (item: PageLinkItem) => void;
  /** Receives picker state for the React popup; null hides it */
  onState: (state: PageLinkPickerState | null) => void;
}

/** Typing [[ opens a picker of the project's pages; choosing one inserts a [[Page]] link */
export const PageLinkSuggestion = Extension.create<PageLinkOptions>({
  name: 'pageLinkSuggestion',

  addOptions() {
    return { char: '[[', mode: 'link', getItems: () => [], onPick: () => {}, onState: () => {} };
  },

  addProseMirrorPlugins() {
    const { char, mode, getItems, onPick, onState } = this.options;
    let current: PageLinkPickerState | null = null;

    const insert = (editor: Editor, range: Range, item: PageLinkItem) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([
          { type: 'wikiLink', attrs: { title: item.title } },
          { type: 'text', text: ' ' },
        ])
        .run();
      onPick(item);
    };

    const publish = (props: SuggestionProps<PageLinkItem>, index: number) => {
      current = {
        mode,
        query: props.query,
        items: props.items,
        index,
        rect: props.clientRect?.() ?? null,
        select: (item) => insert(props.editor, props.range, item),
      };
      onState(current);
    };

    return [
      Suggestion<PageLinkItem>({
        editor: this.editor,
        pluginKey: new PluginKey(this.name),
        char,
        allowSpaces: true,
        items: ({ query }) => getItems(query),
        render: () => ({
          onStart: (props) => publish(props, 0),
          onUpdate: (props) => publish(props, 0),
          onKeyDown: ({ event }: SuggestionKeyDownProps) => {
            if (!current) return false;
            const count = current.items.length;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              if (!count) return true;
              const step = event.key === 'ArrowDown' ? 1 : -1;
              current = { ...current, index: (current.index + step + count) % count };
              onState(current);
              return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              const item = current.items[current.index];
              if (!item) return false;
              current.select(item);
              return true;
            }
            if (event.key === 'Escape') {
              current = null;
              onState(null);
              return true;
            }
            return false;
          },
          onExit: () => {
            current = null;
            onState(null);
          },
        }),
      }),
    ];
  },
});

/** Typing /page and a name, then Enter, links that page and goes to it, creating it when it does not exist */
export const PageCreateSuggestion = PageLinkSuggestion.extend({ name: 'pageCreateSuggestion' });

/* ---------- "- [ ]" checklists ---------- */

/**
 * Typing "[ ] " at the start of a bullet (i.e. "- [ ] ") turns the list into a checklist,
 * the way it is written in markdown.
 */
export const BulletToChecklist = Extension.create({
  name: 'bulletToChecklist',
  addInputRules() {
    return [
      new InputRule({
        find: /^\s*\[( |x)?\]\s$/,
        handler: ({ state, range, chain }) => {
          const $from = state.doc.resolve(range.from);
          const inBullet = $from.depth >= 3 && $from.node($from.depth - 2).type.name === 'bulletList';
          if (!inBullet) return null;
          chain().deleteRange(range).toggleTaskList().run();
        },
      }),
    ];
  },
});
