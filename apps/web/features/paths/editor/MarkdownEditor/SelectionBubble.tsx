'use client';

import { BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { RichTextEditor } from '@mantine/tiptap';
import classes from './MarkdownEditor.module.css';

/** Inline formatting over selected text (not over a video or a [[link]]): bold, italic, strike, code, link */
export function SelectionBubble({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      // No ARIA from tippy: it would mark the text itself as expanded, which a text box cannot be
      tippyOptions={{ duration: 120, placement: 'top', aria: { content: null, expanded: false } }}
      shouldShow={({ editor: e, from, to }) => !e.isActive('youtube') && !e.isActive('wikiLink') && from !== to}
    >
      <RichTextEditor.ControlsGroup className={classes.bubble}>
        <RichTextEditor.Bold />
        <RichTextEditor.Italic />
        <RichTextEditor.Strikethrough />
        <RichTextEditor.Code />
        <RichTextEditor.Link />
        <RichTextEditor.Unlink />
      </RichTextEditor.ControlsGroup>
    </BubbleMenu>
  );
}
