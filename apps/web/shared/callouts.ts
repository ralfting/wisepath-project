/**
 * Callouts
 * A boxed note in a page's text, of one of three kinds. In markdown it is a
 * quote whose first line is the kind's marker, as Obsidian writes them:
 *
 *   > [!warning]
 *   > Back up the database first.
 *
 * The editor and the catalog both read it from here.
 */

export const CALLOUT_KINDS = ['info', 'warning', 'danger'] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

const MARKER = /^[ \t]*\[!(info|warning|danger)\][ \t]*(?:\r?\n|$)/i;

/** The marker a callout's first line holds */
export const calloutMarker = (kind: CalloutKind) => `[!${kind}]`;

/**
 * The callout a quote's first text opens, any case, and the text left after its marker line; null when it opens
 * none (a plain quote, or a kind we don't have, which stays a quote)
 */
export function readCalloutMarker(text: string): { kind: CalloutKind; rest: string } | null {
  const match = MARKER.exec(text);
  // The pattern matches only the three kinds
  return match ? { kind: match[1].toLowerCase() as CalloutKind, rest: text.slice(match[0].length) } : null;
}
