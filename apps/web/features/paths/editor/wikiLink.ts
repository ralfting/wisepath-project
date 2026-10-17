import { InputRule, Node, mergeAttributes } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { MarkdownState } from './markdown';

/** Obsidian-style [[Page]] links: [[Title]] in the markdown, a link in the editor */

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
