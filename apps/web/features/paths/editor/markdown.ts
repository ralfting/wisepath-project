/** The part of tiptap-markdown's serializer state that our nodes write with */
export interface MarkdownState {
  write: (text: string) => void;
  closeBlock: (node: unknown) => void;
  ensureNewLine: () => void;
  /** Writes what f writes with delim at the start of every line, as a quote's "> " */
  wrapBlock: (delim: string, firstDelim: string | null, node: unknown, f: () => void) => void;
  renderContent: (node: unknown) => void;
}
