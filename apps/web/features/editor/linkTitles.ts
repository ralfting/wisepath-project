import { Extension } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import type { LinkPreview } from '@wisepath/domain/projects';

/**
 * Link titles
 * A web address written on its own reads as the page it leads to: its site's
 * icon and its title, in the line, at the text's size, instead of the raw
 * address. Only the display changes: the markdown keeps the address, a link
 * written with its own words ([text](https://…)) shows those, and with the
 * cursor on the link the address comes back, to edit it. The hover card still
 * shows the rest.
 */

interface LinkTitleOptions {
  /** The page's preview, or null when it has none */
  load: (url: string) => Promise<LinkPreview | null>;
}

type Seen = Map<string, LinkPreview | null | 'loading'>;
const key = new PluginKey<Seen>('linkTitles');

/** An address in the text, up to a space; a full stop or bracket closing the sentence isn't part of it */
const ADDRESS = /https?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?)\]]/g;

/**
 * The addresses written as themselves: plain text (markdown keeps a pasted address as is) or a link whose
 * words are its address. Code is left alone
 */
function bareLinks(doc: PMNode): Array<{ from: number; to: number; href: string }> {
  const found: Array<{ from: number; to: number; href: string }> = [];
  doc.descendants((node, pos, parent) => {
    if (parent?.type.spec.code) return false;
    if (!node.isText || !node.text || node.marks.some((m) => m.type.spec.code)) return;
    const link = node.marks.find((m) => m.type.name === 'link');
    if (link) {
      const href = link.attrs.href as string;
      if (/^https?:\/\//.test(href) && node.text.trim() === href) found.push({ from: pos, to: pos + node.nodeSize, href });
      return;
    }
    for (const match of node.text.matchAll(ADDRESS)) {
      const from = pos + (match.index ?? 0);
      found.push({ from, to: from + match[0].length, href: match[0] });
    }
  });
  return found;
}

/** The title in place of the address. A press puts the cursor at the address's end, which brings it back to edit */
function chip(href: string, preview: LinkPreview, view: EditorView, end: number): HTMLElement {
  const a = document.createElement('a');
  a.addEventListener('mousedown', (event) => {
    event.preventDefault();
    view.focus();
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, Math.min(end, view.state.doc.content.size))));
  });
  // Opening is the hover card's (and ⌘↵'s); a click here only edits, as on any link in the text
  a.addEventListener('click', (event) => event.preventDefault());
  a.href = href;
  a.className = 'wp-link-title';
  a.contentEditable = 'false';
  a.title = href;
  if (preview.favicon) {
    const icon = document.createElement('img');
    icon.src = preview.favicon;
    icon.alt = '';
    icon.width = 14;
    icon.height = 14;
    // A site without a usable icon shows just its title
    icon.onerror = () => icon.remove();
    a.append(icon);
  }
  a.append(preview.title ?? preview.siteName);
  return a;
}

export const LinkTitles = Extension.create<LinkTitleOptions>({
  name: 'linkTitles',

  addOptions() {
    return { load: async () => null };
  },

  addProseMirrorPlugins() {
    const { load } = this.options;
    return [
      new Plugin<Seen>({
        key,
        state: {
          init: () => new Map(),
          // Previews arrive as a new map in a transaction's meta
          apply: (tr, seen) => (tr.getMeta(key) as Seen | undefined) ?? seen,
        },
        view: (view) => {
          // Asks for the previews of links not seen yet; each answer redraws the links
          const fetchNew = () => {
            const seen = key.getState(view.state)!;
            for (const { href } of bareLinks(view.state.doc)) {
              if (seen.has(href)) continue;
              seen.set(href, 'loading');
              load(href).then((preview) => {
                if (view.isDestroyed) return;
                const next = new Map(key.getState(view.state)!);
                next.set(href, preview);
                view.dispatch(view.state.tr.setMeta(key, next).setMeta('addToHistory', false));
              });
            }
          };
          fetchNew();
          return { update: (_view, previous) => previous.doc !== view.state.doc && fetchNew() };
        },
        props: {
          decorations(state: EditorState) {
            const seen = key.getState(state)!;
            const { from: cursorFrom, to: cursorTo } = state.selection;
            const decorations: Decoration[] = [];
            for (const link of bareLinks(state.doc)) {
              const preview = seen.get(link.href);
              if (!preview || preview === 'loading' || !(preview.title ?? preview.siteName)) continue;
              // The cursor on it (or a selection over it): the address, to edit
              if (cursorTo >= link.from && cursorFrom <= link.to) continue;
              decorations.push(
                Decoration.widget(link.from, (view) => chip(link.href, preview, view, link.to), { side: -1, key: `${link.href}|${preview.title}|${link.to}` }),
                Decoration.inline(link.from, link.to, { class: 'wp-link-hidden' }),
              );
            }
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
