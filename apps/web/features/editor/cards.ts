import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import { clozeRanges, isCardLine } from '@wisepath/domain/review';

/**
 * Review cards in the editor
 * A `Question :: Answer` line gets a small card icon in the margin, and
 * `==words==` are marked as the words a fill-in-the-blank card hides. Only
 * the look changes: the markdown stays as written. Code is never a card.
 */

/** A block's text as written, [[links]] included, so `::` reads as the domain reads it */
const lineOf = (block: PmNode) =>
  block.textBetween(0, block.content.size, undefined, (leaf) => (leaf.type.name === 'wikiLink' ? `[[${leaf.attrs.title}]]` : ''));

function decorate(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'codeBlock') return false;
    if (!node.isTextblock) return true;
    if (isCardLine(lineOf(node))) {
      decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: 'wp-card-line' }));
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

export const CardMarks = Extension.create({
  name: 'cardMarks',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('cardMarks'),
        state: {
          init: (_, state) => decorate(state.doc),
          apply: (tr, set) => (tr.docChanged ? decorate(tr.doc) : set),
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
