import { Extension, InputRule } from '@tiptap/react';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { ResolvedPos } from '@tiptap/pm/model';
import { videoAbove } from './video/videos';
import { isMacPlatform } from '@/ui/platform';
import { webAddress } from './MarkdownEditor/MarkdownEditor.helpers';

/**
 * The editor's keys: "- [ ]" checklists, keys for whole blocks, opening the link on the
 * cursor's line, and the rail beside the active block
 */

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
    const mark = child.marks.find((m) => m.type.name === 'link')?.attrs.href;
    const href = typeof mark === 'string' ? webAddress(mark) : null;
    const link: LineLink | null =
      child.type.name === 'wikiLink' ? { kind: 'page', title: child.attrs.title, pos } : href ? { kind: 'web', href, pos } : null;
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
    const key = isMacPlatform() ? '⌘↵' : 'Ctrl+↵';
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
            // The tag goes past the bubbles of the line's own block when they are out in the margin
            const own = $from.depth > 0 ? view.nodeDOM($from.before($from.depth)) : null;
            const marks = own instanceof HTMLElement ? [...own.querySelectorAll('.wp-page-note-mark')].filter((mark) => getComputedStyle(mark).position === 'absolute').length : 0;
            rail.style.setProperty('--wp-line-marks', String(marks));
            rail.toggleAttribute('data-marks', marks > 0);
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
