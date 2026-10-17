/**
 * Help's light markup: **bold** for what the screen shows, `code` for what is
 * typed, <kbd>Key</kbd> for a key; anything else is plain text.
 */
export type RichPart = { readonly kind: 'text' | 'bold' | 'code' | 'kbd'; readonly text: string };

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|<kbd>[^<]+<\/kbd>)/g;

export function parseRich(text: string): ReadonlyArray<RichPart> {
  return text
    .split(TOKEN)
    .filter((part) => part !== '')
    .map((part): RichPart =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? { kind: 'bold', text: part.slice(2, -2) }
        : part.startsWith('`') && part.endsWith('`') && part.length > 2
          ? { kind: 'code', text: part.slice(1, -1) }
          : part.startsWith('<kbd>') && part.endsWith('</kbd>')
            ? { kind: 'kbd', text: part.slice(5, -6) }
            : { kind: 'text', text: part },
    );
}
