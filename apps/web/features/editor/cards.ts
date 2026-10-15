import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { clozeRanges, isCardLine } from '@wisepath/domain/review';

/**
 * Review cards in the editor
 * A `Question :: Answer` line gets a small card icon in the margin, and
 * `==words==` are marked as the words a fill-in-the-blank card hides. Only
 * the look changes: the markdown stays as written. Code is never a card. On a
 * learning path's page not studied yet the marks are faded, and the card icon
 * says why: its cards join the review once the page is studied.
 */

/** A block's text as written, [[links]] included, so `::` reads as the domain reads it */
const lineOf = (block: PmNode) =>
  block.textBetween(0, block.content.size, undefined, (leaf) => (leaf.type.name === 'wikiLink' ? `[[${leaf.attrs.title}]]` : ''));

/** The card icon's hover target on a page whose cards wait: it says what brings them into the review */
function pendingTip(label: string): HTMLElement {
  const tip = document.createElement('span');
  tip.className = 'wp-card-tip';
  tip.contentEditable = 'false';
  tip.setAttribute('data-tip', label);
  tip.setAttribute('aria-label', label);
  tip.setAttribute('role', 'img');
  return tip;
}

function decorate(doc: PmNode, pending: string | null): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'codeBlock') return false;
    if (!node.isTextblock) return true;
    if (isCardLine(lineOf(node))) {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: pending ? 'wp-card-line wp-card-pending' : 'wp-card-line' }));
      if (pending) decorations.push(Decoration.widget(pos + 1, () => pendingTip(pending), { side: -1, key: `tip|${pending}` }));
      return false;
    }
    node.forEach((child, offset) => {
      if (!child.isText || child.marks.some((m) => m.type.name === 'code')) return;
      for (const { from, to } of clozeRanges(child.text ?? '')) {
        const start = pos + 1 + offset + from;
        decorations.push(Decoration.inline(start, start + (to - from), { class: 'wp-cloze' }));
      }
    });
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

interface CardMarksOptions {
  /** Why the cards wait (a learning path's page not studied yet), or null when they are reviewed */
  pending: () => string | null;
}

export const CardMarks = Extension.create<CardMarksOptions>({
  name: 'cardMarks',

  addOptions() {
    return { pending: () => null };
  },

  addProseMirrorPlugins() {
    const { pending } = this.options;
    return [
      new Plugin({
        key: new PluginKey('cardMarks'),
        state: {
          init: (_, state) => decorate(state.doc, pending()),
          // Redrawn when the text changes, or when the page's studied state does (a refresh meta)
          apply: (tr, set) => (tr.docChanged || tr.getMeta('cardMarksRefresh') ? decorate(tr.doc, pending()) : set),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
