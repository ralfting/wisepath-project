'use client';

import { BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { RichTextEditor } from '@mantine/tiptap';
import { IconMessagePlus } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import classes from './MarkdownEditor.module.css';

interface SelectionBubbleProps {
  readonly editor: Editor;
  /** Inline formatting, for someone who may edit the text */
  readonly format: boolean;
  /** A note on the selected words, when the editor takes notes */
  readonly onNote?: () => void;
}

/**
 * Over selected text (not over a video or a [[link]]): inline formatting (bold, italic, strike, code, link) for
 * someone who may edit it, and Note for a note of the reader's own on those words
 */
export function SelectionBubble({ editor, format, onNote }: SelectionBubbleProps) {
  const t = useT();
  return (
    <BubbleMenu
      editor={editor}
      // No ARIA from tippy: it would mark the text itself as expanded, which a text box cannot be
      tippyOptions={{ duration: 120, placement: 'top', aria: { content: null, expanded: false } }}
      shouldShow={({ editor: e, from, to }) => !e.isActive('youtube') && !e.isActive('wikiLink') && from !== to}
    >
      <RichTextEditor.ControlsGroup className={classes.bubble}>
        {format && (
          <>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.Code />
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </>
        )}
        {onNote && (
          <RichTextEditor.Control onClick={onNote} aria-label={t('editor.notes.add')} title={t('editor.notes.add')}>
            <IconMessagePlus size={16} stroke={1.5} />
          </RichTextEditor.Control>
        )}
      </RichTextEditor.ControlsGroup>
    </BubbleMenu>
  );
}
