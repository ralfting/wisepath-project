import { InputRule, Node, mergeAttributes } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { MarkdownState } from './markdown';

/** Obsidian-style [[Page]] links: [[Title]] in the markdown, a link in the editor; @[[Title]], a citation of the page */

const WIKILINK_TEXT = /(@?)\[\[([^[\]\n]+)\]\]/g;

/** The markdown a link or a citation is written as */
const asMarkdown = (attrs: { title: string; citation: boolean }) => `${attrs.citation ? '@' : ''}[[${attrs.title}]]`;

/** A link or citation chip in the text: where it starts and which of the two it is */
export interface Chip {
  pos: number;
  citation: boolean;
}

const chipAt = (state: EditorState, pos: number): Chip | null => {
  const node = pos >= 0 ? state.doc.nodeAt(pos) : null;
  return node?.type.name === 'wikiLink' ? { pos, citation: !!node.attrs.citation } : null;
};

/** The chip the cursor is on: selected, or right before or after the cursor */
function chipAtCursor(state: EditorState): Chip | null {
  const { selection } = state;
  if (selection instanceof NodeSelection) return chipAt(state, selection.from);
  const { $from } = selection;
  return chipAt(state, $from.pos - ($from.nodeBefore?.nodeSize ?? 0)) ?? chipAt(state, $from.pos);
}

/** The chip a link card is about, from the element drawn for it */
export function chipOfElement(editor: Editor, element: Element): Chip | null {
  const at = editor.view.posAtDOM(element, 0);
  return chipAt(editor.state, at) ?? chipAt(editor.state, at - 1);
}

/** Turns the link at a position into a citation of the same page, or the citation into a link */
export function toggleCitation(editor: Editor, pos: number): boolean {
  const chip = chipAt(editor.state, pos);
  if (!chip) return false;
  return editor
    .chain()
    .command(({ tr }) => {
      tr.setNodeAttribute(pos, 'citation', !chip.citation);
      return true;
    })
    .run();
}

interface WikiLinkOptions {
  /** Whether a page with this title exists; missing links render dashed */
  exists: (title: string) => boolean;
}

/**
 * An Obsidian-style link to another page by title, stored in markdown as [[Title]], or a citation of it, @[[Title]]:
 * the same chip, quieter, that points at the page without placing it on the map. It may name a page not made yet.
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
      citation: {
        default: false,
        parseHTML: (el) => el.hasAttribute('data-citation'),
        renderHTML: (attrs) => (attrs.citation ? { 'data-citation': '' } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wikilink]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const look = node.attrs.citation ? 'wikilink wikilink-citation' : 'wikilink';
    return ['span', mergeAttributes(HTMLAttributes, { class: look, role: 'link' }), node.attrs.title];
  },

  renderText({ node }) {
    return asMarkdown({ title: node.attrs.title, citation: node.attrs.citation });
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownState, node: { attrs: { title: string; citation: boolean } }) {
          state.write(asMarkdown(node.attrs));
        },
        parse: {
          // Turn [[Title]] and @[[Title]] text into link spans, leaving code untouched
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
                span.setAttribute('data-wikilink', match[2].trim());
                if (match[1]) span.setAttribute('data-citation', '');
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

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-l': ({ editor }) => {
        const chip = chipAtCursor(editor.state);
        return chip !== null && toggleCitation(editor, chip.pos);
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(@?)\[\[([^[\]\n]+)\]\]$/,
        handler: ({ range, match, chain }) => {
          const attrs = { title: match[2].trim(), citation: !!match[1] };
          chain().deleteRange(range).insertContent({ type: this.name, attrs }).run();
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
