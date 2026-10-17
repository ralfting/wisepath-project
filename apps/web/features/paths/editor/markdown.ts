/** The part of tiptap-markdown's serializer state that our nodes write with */
export interface MarkdownState {
  write: (text: string) => void;
  closeBlock: (node: unknown) => void;
}
