import { Node, wrappingInputRule } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { Node as DocNode } from '@tiptap/pm/model';
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
