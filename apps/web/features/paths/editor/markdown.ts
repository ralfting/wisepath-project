/** The part of tiptap-markdown's serializer state that our nodes write with */
export interface MarkdownState {
  write: (text: string) => void;
  closeBlock: (node: unknown) => void;
  ensureNewLine: () => void;
  /** Writes what f writes with delim at the start of every line, as a quote's "> " */
  wrapBlock: (delim: string, firstDelim: string | null, node: unknown, f: () => void) => void;
  renderContent: (node: unknown) => void;
}

/** The part of markdown-it that our nodes' parse setup uses */
export interface MarkdownReader {
  core: { ruler: { before: (next: string, name: string, rule: (state: { src: string }) => void) => void } };
}

/** A block that opened with italics, fallen out of its quote: "*> *" as first saved, "\*&gt; *" once saved again */
const FALLEN = /^(\*>|\\\*&gt;) (?=\*)/;

/**
 * A page saved while tiptap-markdown was unpatched in production (docs/bugs/BUG-012-patched-package-left-out-of-the-build.md)
 * holds a quote's block that opened with italics outside the quote, and one that opened with bold merged into the
 * block before. Puts each back where it was written, so the page opens whole and is saved whole on its next edit;
 * markdown the editor writes today has none of these shapes and comes back unchanged.
 */
export function withQuoteBlocksBack(markdown: string): string {
  const lines: string[] = [];
  // Saved again, the blocks after a fallen one became a quote of their own, one blank line below it
  let rejoinNextQuote = false;
  for (const line of markdown.split('\n')) {
    const fallen = FALLEN.exec(line);
    if (fallen && lines.at(-1) === '' && lines.at(-2)?.startsWith('>')) {
      lines[lines.length - 1] = '>';
      lines.push(`> ${line.slice(fallen[0].length)}`);
      rejoinNextQuote = fallen[1] !== '*>';
      continue;
    }
    if (line === '') {
      lines.push(line);
      continue;
    }
    if (rejoinNextQuote && lines.at(-1) === '' && line.startsWith('>') && !/^> ?\[!/.test(line)) lines[lines.length - 1] = '>';
    rejoinNextQuote = false;
    if (!line.startsWith('>')) {
      lines.push(line);
      continue;
    }
    // Bold took the blank ">" line's place ("> ****"); saved again, its stars were escaped and the block merged
    // into the one before ("First. \*\***")
    const bold = line
      .replace(/^> \*\*(?=\*\*[^*])/, '>\n> ')
      .replace(/^> \\\*\\\*(?=\*\*)/, '> ')
      .replace(/ \\\*\\\*(?=\*\*)/g, '\n>\n> ');
    lines.push(...bold.split('\n'));
  }
  return lines.join('\n');
}
