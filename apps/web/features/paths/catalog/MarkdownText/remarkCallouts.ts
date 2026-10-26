import { readCalloutMarker } from '@wisepath/domain/paths';

/**
 * A remark plugin turning a quote that opens with a callout marker (> [!warning]) into a callout: an <aside> with the
 * kind in data-callout, for MarkdownText to draw. Other quotes stay quotes.
 */

/** The bits of a markdown tree this plugin reads and writes */
interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: { hName?: string; hProperties?: Record<string, string> };
}

function visit(node: MarkdownNode) {
  for (const child of node.children ?? []) {
    if (child.type === 'blockquote') toCallout(child);
    visit(child);
  }
}

function toCallout(quote: MarkdownNode) {
  const first = quote.children?.[0];
  const text = first?.type === 'paragraph' ? first.children?.[0] : undefined;
  const marker = text?.type === 'text' ? readCalloutMarker(text.value ?? '') : null;
  if (!first?.children || !text || !marker) return;
  text.value = marker.rest;
  if (!marker.rest) first.children = first.children.slice(first.children[1]?.type === 'break' ? 2 : 1);
  // The marker had its line to itself
  if (first.children.length === 0) quote.children = quote.children!.slice(1);
  quote.data = { hName: 'aside', hProperties: { dataCallout: marker.kind } };
}

/** The plugin, for react-markdown's remarkPlugins */
export function remarkCallouts() {
  return (tree: MarkdownNode) => visit(tree);
}
