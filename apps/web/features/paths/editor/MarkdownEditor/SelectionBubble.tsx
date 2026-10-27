'use client';

import { BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { Button, Divider, Group } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { IconMessagePlus } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { useIsMac } from '@/ui/platform';
import classes from './MarkdownEditor.module.css';

interface SelectionBubbleProps {
  readonly editor: Editor;
  /** Inline formatting, for someone who may edit the text */
  readonly format: boolean;
  /** A note on the selected words, when the editor takes notes */
  readonly onNote?: () => void;
}

/**
 * Over selected text (not over a block picked whole, a video or a [[link]]): inline formatting (bold, italic, strike,
 * code, link) for someone who may edit it, and apart from it, in the notes' yellow, Note for a note of the reader's own
 * on those words
 */
export function SelectionBubble({ editor, format, onNote }: SelectionBubbleProps) {
  const t = useT();
  const keys = useIsMac() ? '⌘⌥M' : 'Ctrl+Alt+M';
  return (
    <BubbleMenu
      editor={editor}
      // No ARIA from tippy: it would mark the text itself as expanded, which a text box cannot be
      tippyOptions={{ duration: 120, placement: 'top', aria: { content: null, expanded: false } }}
      shouldShow={({ editor: e, state, from, to }) => !(state.selection instanceof NodeSelection) && !e.isActive('youtube') && !e.isActive('wikiLink') && from !== to}
    >
      <Group gap="xs" wrap="nowrap" className={classes.bubble}>
        {format && (
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.Code />
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
        )}
        {format && onNote && <Divider orientation="vertical" />}
        {onNote && (
          <Button
            size="compact-sm"
            variant="light"
            color="yellow"
            leftSection={<IconMessagePlus size={16} stroke={1.5} />}
            onClick={onNote}
            title={t('editor.notes.addHint', { keys })}
          >
            {t('editor.notes.add')}
          </Button>
        )}
      </Group>
    </BubbleMenu>
  );
}
