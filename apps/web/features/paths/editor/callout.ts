import { Node, wrappingInputRule } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { Node as DocNode } from '@tiptap/pm/model';
import { NodeSelection, Plugin, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { CALLOUT_KINDS, calloutMarker, readCalloutMarker } from '@wisepath/domain/paths';
import type { CalloutKind } from '@wisepath/domain/paths';
import type { MarkdownState } from './markdown';

/**
 * Callouts in the editor: a block holding other blocks, written to markdown as
 * a quote whose first line is its kind's marker (callouts.ts in the domain), so the
 * text reads the same in Obsidian and in the catalog.
 */
export const CalloutBlock = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  // Pasting into an empty callout keeps the callout
  defining: true,
  // By its grip only (CalloutView): ProseMirror moves the whole block where it is dropped
  draggable: true,

  addAttributes() {
    return {
      kind: {
        default: 'info' satisfies CalloutKind,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-callout'),
        renderHTML: (attributes: { kind: CalloutKind }) => ({ 'data-callout': attributes.kind }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0];
  },

  // [!warning] and a space at the start of a line, as > makes a quote
  addInputRules() {
    return [
      wrappingInputRule({
        find: new RegExp(String.raw`^\[!(${CALLOUT_KINDS.join('|')})\]\s$`, 'i'),
        type: this.type,
        getAttributes: (match) => ({ kind: match[1].toLowerCase() }),
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Alt-Shift-ArrowUp': () => moveCallout(this.editor, -1),
      'Alt-Shift-ArrowDown': () => moveCallout(this.editor, 1),
    };
  },

  // A callout copied whole (picked by its grip) is its markdown as plain text, so it pastes as a callout anywhere;
  // an empty string leaves any other copy to ProseMirror. The callout the cursor is in carries wp-cursor-in, for its
  // grip to show: the focus stays on the editor, so :focus-within can't tell which block holds the cursor
  addProseMirrorPlugins() {
    const { editor, type } = this;
    return [
      new Plugin({
        props: {
          decorations: ({ doc, selection: { $from } }) => {
            for (let depth = $from.depth; depth > 0; depth--) {
              if ($from.node(depth).type !== type) continue;
              const at = $from.before(depth);
              return DecorationSet.create(doc, [Decoration.node(at, at + $from.node(depth).nodeSize, { class: 'wp-cursor-in' })]);
            }
            return null;
          },
          clipboardTextSerializer: (slice) =>
            slice.content.childCount === 1 && slice.content.firstChild?.type === type
              ? (editor.storage.markdown as { serializer: { serialize: (content: typeof slice.content) => string } }).serializer.serialize(slice.content)
              : '',
        },
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownState, node: { attrs: { kind: CalloutKind } }) {
          state.wrapBlock('> ', null, node, () => {
            state.write(calloutMarker(node.attrs.kind));
            state.ensureNewLine();
            state.renderContent(node);
          });
        },
        parse: {
          // A quote opening with a marker becomes a callout; its other quotes stay quotes
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('blockquote').forEach((quote) => {
              const first = quote.firstElementChild;
              const text = first?.tagName === 'P' ? first.firstChild : null;
              const marker = text?.nodeType === 3 ? readCalloutMarker(text.textContent ?? '') : null;
              if (!first || !text || !marker) return;
              text.textContent = marker.rest;
              // A hard break that ended the marker's line goes with it
              if (!marker.rest) {
                const next = text.nextSibling;
                text.remove();
                if (next?.nodeName === 'BR') next.remove();
              }
              // The marker had its line to itself
              if (!first.textContent?.trim() && !first.querySelector('*')) first.remove();
              const callout = document.createElement('div');
              callout.setAttribute('data-callout', marker.kind);
              callout.append(...Array.from(quote.childNodes));
              if (!callout.firstElementChild) callout.append(document.createElement('p'));
              quote.replaceWith(callout);
            });
          },
        },
      },
    };
  },
});

/** Puts the blocks under the cursor in a callout of this kind, or turns the callout they are in into this kind */
export function setCallout(editor: Editor, kind: CalloutKind) {
  if (editor.isActive('callout')) editor.chain().focus().updateAttributes('callout', { kind }).run();
  else editor.chain().focus().wrapIn('callout', { kind }).run();
}

/**
 * Moves the callout picked whole, or the one the cursor is in, past the block above (-1) or below (1) it, keeping
 * what was selected in it. At the top or the bottom it stays where it is.
 */
export function moveCallout(editor: Editor, by: -1 | 1): boolean {
  const { state } = editor;
  const { selection } = state;
  const picked = selection instanceof NodeSelection && selection.node.type.name === 'callout';
  let at = picked ? selection.from : -1;
  for (let depth = selection.$from.depth; at < 0 && depth > 0; depth--) {
    if (selection.$from.node(depth).type.name === 'callout') at = selection.$from.before(depth);
  }
  if (at < 0) return false;
  const $at = state.doc.resolve(at);
  const callout = $at.nodeAfter;
  if (!callout || selection.to > at + callout.nodeSize) return false;
  const index = $at.index() + by;
  if (index < 0 || index >= $at.parent.childCount) return true;
  const sibling = $at.parent.child(index);
  const from = by < 0 ? at - sibling.nodeSize : at;
  const landed = by < 0 ? from : at + sibling.nodeSize;
  const tr = state.tr.replaceWith(from, from + callout.nodeSize + sibling.nodeSize, by < 0 ? [callout, sibling] : [sibling, callout]);
  const shift = landed - at;
  tr.setSelection(picked ? NodeSelection.create(tr.doc, landed) : TextSelection.create(tr.doc, selection.from + shift, selection.to + shift));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * How many callouts of a kind come before a position in the text. The editor never hashes an activity's or a
 * question's words: the nth block takes the domain's nth id, so formatting inside one can't make the two disagree
 */
export function calloutsBefore(doc: DocNode, pos: number, kind: CalloutKind): number {
  let count = 0;
  doc.descendants((node, at) => {
    if (at >= pos) return false;
    if (node.type.name === 'callout' && node.attrs.kind === kind) count++;
    return true;
  });
  return count;
}
