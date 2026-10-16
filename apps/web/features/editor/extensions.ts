import { Extension, InputRule, Node, mergeAttributes } from '@tiptap/react';
import type { Editor, Range } from '@tiptap/react';
import Youtube from '@tiptap/extension-youtube';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { ResolvedPos } from '@tiptap/pm/model';
import { videoAbove } from './video/videos';

/**
 * Editor extensions
 * Markdown round-tripping for YouTube embeds, Obsidian-style [[Page]] links,
 * the [[ page picker, the / commands, "- [ ]" checklists, and keys for whole blocks.
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

/* ---------- Popup menus: the [[ picker and the / commands ---------- */

export interface MenuState<Item> {
  items: Item[];
  index: number;
  rect: DOMRect | null;
  select: (item: Item) => void;
}

interface MenuOptions<Item> {
  editor: Editor;
  key: string;
  /** What opens the menu, typed after a space or at the start of a line */
  char: string;
  allowSpaces: boolean;
  getItems: (query: string) => Item[];
  /** Runs the chosen item over the text typed since the trigger */
  choose: (editor: Editor, range: Range, item: Item) => void;
  /** Receives menu state for the React popup; null hides it */
  onState: (state: MenuState<Item> | null) => void;
}

/** A suggestion menu driven from the keyboard: arrows move, Enter or Tab picks, Esc closes */
function suggestionMenu<Item>({ editor, key, char, allowSpaces, getItems, choose, onState }: MenuOptions<Item>) {
  let current: MenuState<Item> | null = null;

  // While the menu is open, Esc closes it, not a drawer around the editor (Mantine skips Esc from such elements)
  const holdEscape = (held: boolean) => {
    if (held) editor.view.dom.setAttribute('data-mantine-stop-propagation', 'true');
    else editor.view.dom.removeAttribute('data-mantine-stop-propagation');
  };

  const publish = (props: SuggestionProps<Item>) => {
    holdEscape(true);
    current = {
      items: props.items,
      index: 0,
      rect: props.clientRect?.() ?? null,
      select: (item) => choose(props.editor, props.range, item),
    };
    onState(current);
  };

  return Suggestion<Item>({
    editor,
    pluginKey: new PluginKey(key),
    char,
    allowSpaces,
    items: ({ query }) => getItems(query),
    render: () => ({
      onStart: publish,
      onUpdate: publish,
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (!current) return false;
        const count = current.items.length;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (!count) return false;
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
          // Mantine has already seen this Esc (it listens first); the next one may close the drawer again
          holdEscape(false);
          current = null;
          onState(null);
          return true;
        }
        return false;
      },
      onExit: () => {
        holdEscape(false);
        current = null;
        onState(null);
      },
    }),
  });
}

export interface PageLinkItem {
  /** Page id, or null for a page that does not exist yet */
  id: string | null;
  title: string;
}

export type PageLinkPickerState = MenuState<PageLinkItem>;

interface PageLinkOptions {
  getItems: (query: string) => PageLinkItem[];
  onLink: (item: PageLinkItem) => void;
  onState: (state: PageLinkPickerState | null) => void;
}

/** Typing [[ opens a picker of the path's pages; choosing one inserts a [[Page]] link */
export const PageLinkSuggestion = Extension.create<PageLinkOptions>({
  name: 'pageLinkSuggestion',

  addOptions() {
    return { getItems: () => [], onLink: () => {}, onState: () => {} };
  },

  addProseMirrorPlugins() {
    const { getItems, onLink, onState } = this.options;
    return [
      suggestionMenu<PageLinkItem>({
        editor: this.editor,
        key: this.name,
        char: '[[',
        allowSpaces: true,
        getItems,
        choose: (editor, range, item) => {
          editor.chain().focus().deleteRange(range).run();
          insertPageLink(editor, editor.state.selection.from, item.title);
          onLink(item);
        },
        onState,
      }),
    ];
  },
});

/** Puts a [[Title]] link and a space at a position in the text */
export function insertPageLink(editor: Editor, at: number, title: string) {
  editor
    .chain()
    .focus()
    .insertContentAt(at, [
      { type: 'wikiLink', attrs: { title } },
      { type: 'text', text: ' ' },
    ])
    .run();
}

export interface SlashCommand {
  id: string;
  label: string;
  /** Shown beside the label: what it does, or the markdown that does the same */
  hint: string;
  /** Other words that find it */
  keywords: string;
  /** Runs once the typed /command is gone from the text */
  run: (editor: Editor) => void;
}

export type SlashMenuState = MenuState<SlashCommand>;

interface SlashOptions {
  /** Read on each keystroke, so the labels follow the language */
  commands: () => ReadonlyArray<SlashCommand>;
  onState: (state: SlashMenuState | null) => void;
}

/** Typing / opens a list of commands; typing on narrows it */
export const SlashCommands = Extension.create<SlashOptions>({
  name: 'slashCommands',

  addOptions() {
    return { commands: () => [], onState: () => {} };
  },

  addProseMirrorPlugins() {
    const { commands, onState } = this.options;
    return [
      suggestionMenu<SlashCommand>({
        editor: this.editor,
        key: this.name,
        char: '/',
        allowSpaces: false,
        getItems: (query) => {
          const q = query.toLowerCase();
          return commands().filter((c) => `${c.label} ${c.keywords}`.toLowerCase().includes(q));
        },
        choose: (editor, range, command) => {
          editor.chain().focus().deleteRange(range).run();
          command.run(editor);
        },
        onState,
      }),
    ];
  },
});

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

/* ---------- Keys for whole blocks, and ⌘K ---------- */

/** Fired on the window when ⌘K (Ctrl K) is pressed in the text with nothing selected: the map opens its search */
export const OPEN_SEARCH_EVENT = 'wisepath:open-search';

/** Blocks Backspace selects first, then deletes, when it reaches them from the line below */
const WHOLE_BLOCKS = new Set(['table', 'codeBlock', 'youtube']);

/**
 * Backspace at the start of the line below a table (or a code block, or a
 * video) selects that block, so the next Backspace removes it (a selected
 * table shows as all its cells selected, which Backspace deletes); in a table
 * whose cells are all empty, Backspace removes the table. Cmd/Ctrl+A inside
 * a code block selects the code first, then the whole page. Cmd/Ctrl+K with
 * text selected makes a link; with nothing selected it opens the map's search.
 * Enter after a markdown header row, "| a | b |", makes it a table with an
 * empty row to fill.
 */
export const BlockKeys = Extension.create({
  name: 'blockKeys',
  // Ahead of the table's keys and the link's Cmd/Ctrl+K
  priority: 1100,

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (!selection.empty) return false;
        const { $from } = selection;

        // Inside a table with nothing in it: an empty line takes its place
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name !== 'table') continue;
          if (node.textContent.trim()) return false;
          const at = $from.before(depth);
          return editor
            .chain()
            .command(({ tr }) => {
              tr.replaceWith(at, $from.after(depth), state.schema.nodes.paragraph.create());
              tr.setSelection(TextSelection.create(tr.doc, at + 1));
              return true;
            })
            .run();
        }

        // At the start of a line, right after a whole block: select the block
        if ($from.parentOffset > 0 || !$from.parent.isTextblock) return false;
        const lineStart = $from.before();
        const blockBefore = state.doc.resolve(lineStart).nodeBefore;
        if (!blockBefore || !WHOLE_BLOCKS.has(blockBefore.type.name)) return false;
        const blockStart = lineStart - blockBefore.nodeSize;
        return editor
          .chain()
          .command(({ tr }) => {
            // An empty line goes away as the block is selected
            if ($from.parent.content.size === 0) tr.delete(lineStart, lineStart + $from.parent.nodeSize);
            tr.setSelection(NodeSelection.create(tr.doc, blockStart));
            return true;
          })
          .run();
      },
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        // A line of its own, with the cursor at its end
        if (!empty || $from.depth !== 1 || $from.parent.type.name !== 'paragraph') return false;
        if ($from.parentOffset !== $from.parent.content.size) return false;
        const row = /^\|(.+)\|$/.exec($from.parent.textContent.trim());
        const headers = row?.[1].split('|').map((h) => h.trim()) ?? [];
        if (!headers.some(Boolean)) return false;

        const { schema } = state;
        const cell = (type: 'tableHeader' | 'tableCell', text: string) =>
          schema.nodes[type].create(null, schema.nodes.paragraph.create(null, text ? schema.text(text) : null));
        const header = schema.nodes.tableRow.create(null, headers.map((h) => cell('tableHeader', h)));
        const body = schema.nodes.tableRow.create(null, headers.map(() => cell('tableCell', '')));
        const start = $from.before();
        return editor
          .chain()
          .command(({ tr }) => {
            tr.replaceWith(start, $from.after(), schema.nodes.table.create(null, [header, body]));
            // Into the first empty cell: past the table, the header row, then the row, cell and paragraph openings
            tr.setSelection(TextSelection.create(tr.doc, start + 1 + header.nodeSize + 3));
            return true;
          })
          .run();
      },
      'Mod-k': ({ editor }) => {
        if (!editor.state.selection.empty) return false;
        window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
        return true;
      },
      'Mod-a': ({ editor }) => {
        const { $from, from, to } = editor.state.selection;
        if ($from.parent.type.name !== 'codeBlock') return false;
        const start = $from.start();
        const end = $from.end();
        if (from === start && to === end) return false;
        return editor.commands.setTextSelection({ from: start, to: end });
      },
    };
  },
});

export type LineLink = { kind: 'web'; href: string; pos: number } | { kind: 'page'; title: string; pos: number };

/**
 * The link ⌘↵ opens from the cursor's line: the one the cursor is in or the
 * last before it, else the first. Web links (http) and [[Page]] links count
 */
export function lineLink($from: ResolvedPos): LineLink | null {
  const start = $from.start();
  let chosen = null as LineLink | null;
  $from.parent.forEach((child, offset) => {
    const pos = start + offset;
    const href = child.marks.find((mark) => mark.type.name === 'link')?.attrs.href;
    const link: LineLink | null =
      child.type.name === 'wikiLink'
        ? { kind: 'page', title: child.attrs.title, pos }
        : typeof href === 'string' && /^https?:/.test(href)
          ? { kind: 'web', href, pos }
          : null;
    if (link && (!chosen || pos <= $from.pos)) chosen = link;
  });
  return chosen;
}

/**
 * ⌘↵ (Ctrl+Enter) opens the link on the cursor's line. After the video's
 * times, which take the same key on a line that has one
 */
export const LinkKeys = Extension.create<{ onOpen: (link: LineLink, element: Element | null) => void }>({
  name: 'linkKeys',
  priority: 50,

  addOptions() {
    return { onOpen: () => {} };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        const link = lineLink(this.editor.state.selection.$from);
        if (!link) return false;
        const element = this.editor.view.nodeDOM(link.pos);
        this.options.onOpen(link, element instanceof Element ? element : null);
        return true;
      },
    };
  },
});

/** The nearest box around this element that scrolls, and so cuts off what leaves it */
function scrollingBox(element: Element): Element | null {
  for (let e = element.parentElement; e && e !== document.body; e = e.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(e).overflowY)) return e;
  }
  return null;
}

/**
 * While the text has the focus, a bar in the left margin beside the block the
 * cursor is in (a paragraph, a heading, a list item's line; a whole table or
 * video), so it is plain where the keys go. It is one element beside the text,
 * moved to the block's place, so it slides from block to block. On a line with
 * a video's time or a link it carries the key that plays or opens it (⌘↵).
 */
export const ActiveBlockRail = Extension.create({
  name: 'activeBlockRail',

  addProseMirrorPlugins() {
    const editor = this.editor;
    const key = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘↵' : 'Ctrl+↵';
    return [
      new Plugin({
        key: new PluginKey('activeBlockRail'),
        view(view) {
          const rail = document.createElement('div');
          rail.className = 'wp-active-rail';
          rail.setAttribute('aria-hidden', 'true');
          view.dom.parentElement?.appendChild(rail);
          // The key's tag: on a page, on the rail itself (data-hint), scrolling with the text. In the page drawer,
          // whose scrolling box would cut it off, it lives on the page, fixed to the screen, and stands out past
          // the drawer's left edge
          const tag = document.createElement('div');
          tag.className = 'wp-rail-tag';
          tag.setAttribute('aria-hidden', 'true');
          document.body.appendChild(tag);
          let line: { block: HTMLElement; hint: string } | null = null;

          const placeTag = () => {
            const drawer = rail.closest('.mantine-Drawer-content');
            if (line && !drawer) rail.setAttribute('data-hint', line.hint);
            else rail.removeAttribute('data-hint');
            if (!line || !drawer || !rail.hasAttribute('data-visible')) return tag.removeAttribute('data-visible');
            const box = line.block.getBoundingClientRect();
            // Gone with its line when the text scrolls it out of view
            const scroller = scrollingBox(rail);
            const clip = scroller?.getBoundingClientRect();
            if (clip && (box.top + 8 < clip.top || box.top + 16 > clip.bottom)) return tag.removeAttribute('data-visible');
            tag.textContent = line.hint;
            tag.style.top = `${box.top}px`;
            tag.style.height = `${Math.min(Math.max(box.height, 18), 26)}px`;
            tag.style.left = `${drawer.getBoundingClientRect().left}px`;
            tag.setAttribute('data-visible', '');
          };
          const hide = () => {
            rail.removeAttribute('data-visible');
            tag.removeAttribute('data-visible');
          };

          const place = () => {
            const { selection } = view.state;
            if (!view.hasFocus()) return hide();
            const { $from } = selection;
            // A selected block, else the table the cursor is in, else the line's own block
            let pos: number | null = selection instanceof NodeSelection ? selection.from : null;
            for (let depth = $from.depth; pos === null && depth > 0; depth--) {
              if ($from.node(depth).type.name === 'table') pos = $from.before(depth);
            }
            if (pos === null && $from.depth > 0) pos = $from.before($from.depth);
            const block = pos === null ? null : view.nodeDOM(pos);
            if (!(block instanceof HTMLElement)) return hide();
            // Measured from what the bar is placed against (the nearest positioned box)
            const host = rail.offsetParent ?? rail.parentElement;
            if (!host) return;
            const box = block.getBoundingClientRect();
            const top = box.top - host.getBoundingClientRect().top + host.scrollTop;
            rail.style.top = `${top}px`;
            rail.style.height = `${Math.max(box.height, 18)}px`;
            rail.setAttribute('data-visible', '');
            // A time on the line, under a video, plays; else a link opens
            let hasTime = false;
            $from.parent.forEach((child) => {
              if (child.type.name === 'timestamp') hasTime = true;
            });
            const hint = hasTime && videoAbove(editor, $from.pos) ? `\u25B6\uFE0E ${key}` : lineLink($from) ? `\u2197 ${key}` : null;
            line = hint ? { block, hint } : null;
            placeTag();
          };
          view.dom.addEventListener('focus', place);
          view.dom.addEventListener('blur', hide);
          window.addEventListener('scroll', placeTag, true);
          window.addEventListener('resize', placeTag);
          requestAnimationFrame(place);

          return {
            update: place,
            destroy() {
              view.dom.removeEventListener('focus', place);
              view.dom.removeEventListener('blur', hide);
              window.removeEventListener('scroll', placeTag, true);
              window.removeEventListener('resize', placeTag);
              rail.remove();
              tag.remove();
            },
          };
        },
      }),
    ];
  },
});
