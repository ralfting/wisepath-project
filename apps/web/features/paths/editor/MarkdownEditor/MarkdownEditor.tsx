'use client';

import { Portal } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useT } from '@/i18n/I18nProvider';
import type { PreviewPage } from '../LinkPreview/LinkPreview';
import classes from './MarkdownEditor.module.css';
import blocks from './MarkdownBlocks.module.css';
import { EditorToolbar } from './EditorToolbar';
import { InboxItemPrompt } from './InboxItemPrompt/InboxItemPrompt';
import { LinkCard } from './LinkCard';
import { Outline } from './Outline/Outline';
import { PageLinkPicker } from './PageLinkPicker';
import { PageNamePrompt, placeNear } from './PageNamePrompt';
import { SelectionBubble } from './SelectionBubble';
import { SlashMenu } from './SlashMenu';
import { EDITOR_VARIANTS } from './MarkdownEditor.helpers';
import type { EditorVariant } from './MarkdownEditor.helpers';
import { useMarkdownEditor } from './useMarkdownEditor';

/** What the editor shows and how it tells its page what happened */
export interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  pages: ReadonlyArray<PreviewPage>;
  currentPageId: string;
  /** `alternate`: opened with Cmd/Ctrl, in the screen's other way (the full page, or the drawer) */
  onOpenPage: (pageId: string, alternate?: boolean) => void;
  /** Called when a link to an existing page is inserted */
  onLinkPage: (pageId: string) => void;
  /** Creates a page with this title, linked from the current one, and opens it */
  onCreatePage: (title: string) => void;
  /** Creates a page with this title, linked from the current one, and stays here */
  onCreatePageHere: (title: string) => void;
  /** Increment to move focus to the end of the text */
  focusSignal?: number;
  /** Distance from the top where the sticky toolbar stops (below a sticky header) */
  toolbarOffset?: number;
  /** Puts the cursor in the text once it is ready: at a position, its start or its end */
  focusOnOpen?: EditorFocus | null;
  /** Follows the cursor, so it can be put back later */
  onCursor?: (pos: number) => void;
  /** For someone who may only read the page: no toolbar, no typing, and a link to a missing page offers nothing */
  readOnly?: boolean;
  /** What waits in the Inbox (null while it loads), for the / command that brings an item in; without it, no command */
  inbox?: { items: ReadonlyArray<InboxItem> | null; onTaken: (item: InboxItem) => void };
  /** The page's text (the default), or the reader's notes on it in a lean editor */
  variant?: EditorVariant;
}

/** Where the cursor goes when the text opens: at a position, its start or its end */
export type EditorFocus = number | 'start' | 'end';

/**
 * Mantine's RichTextEditor around our Tiptap setup: it shows formatting as you
 * type and saves markdown. A lean toolbar holds the blocks (headings, lists,
 * checklist, code, video, page link); selecting text shows a bubble menu for
 * inline formatting. [[Page]] links another page by title, like Obsidian; a
 * link to a page that does not exist yet offers to create it when clicked.
 * / opens a list of commands; its Page command asks for a name, then Enter
 * links that page and goes straight to it, creating it when it does not exist.
 * Its Inbox item command puts something waiting in the Inbox where / was typed.
 */
export function MarkdownEditor(props: MarkdownEditorProps) {
  const { pages, currentPageId, toolbarOffset = 0, readOnly = false, inbox, variant = 'page' } = props;
  const { lean } = EDITOR_VARIANTS[variant];
  const t = useT();
  const { editor, wrapper, card, state, operations } = useMarkdownEditor(props);
  const { headings, picker, slash, prompt, inboxPrompt } = state;

  return (
    <div ref={wrapper} className={classes.wrapper} onMouseOver={card.over} onMouseOut={card.out}>
      {editor && !lean && headings.length >= 2 && <Outline editor={editor} headings={headings} />}
      <RichTextEditor
        editor={editor}
        variant="subtle"
        classNames={{ root: classes.root, content: `${classes.content} ${blocks.blocks}` }}
        labels={{
          h2ControlLabel: t('editor.toolbar.heading'),
          h3ControlLabel: t('editor.toolbar.subheading'),
          bulletListControlLabel: t('editor.toolbar.bulletList'),
          orderedListControlLabel: t('editor.toolbar.numberedList'),
          tasksControlLabel: t('editor.toolbar.checklist'),
          tasksSinkLabel: t('editor.toolbar.checklistIndent'),
          tasksLiftLabel: t('editor.toolbar.checklistOutdent'),
          codeBlockControlLabel: t('editor.toolbar.codeBlock'),
          blockquoteControlLabel: t('editor.toolbar.quote'),
          boldControlLabel: t('editor.toolbar.bold'),
          italicControlLabel: t('editor.toolbar.italic'),
          strikeControlLabel: t('editor.toolbar.strike'),
          codeControlLabel: t('editor.toolbar.code'),
          linkControlLabel: t('editor.toolbar.link'),
          unlinkControlLabel: t('editor.toolbar.unlink'),
          linkEditorInputLabel: t('editor.toolbar.linkInput'),
          linkEditorExternalLink: t('editor.toolbar.linkNewTab'),
          linkEditorInternalLink: t('editor.toolbar.linkSameTab'),
          linkEditorSave: t('common.actions.save'),
        }}
      >
        {!readOnly && !lean && <EditorToolbar editor={editor} offset={toolbarOffset} />}
        {editor && !readOnly && <SelectionBubble editor={editor} />}
        <RichTextEditor.Content />
      </RichTextEditor>

      {card.card && <LinkCard card={card.card} onAct={card.act} onClose={card.close} />}
      {picker?.rect && <PageLinkPicker picker={{ ...picker, rect: picker.rect }} />}
      {slash?.rect && slash.items.length > 0 && <SlashMenu slash={{ ...slash, rect: slash.rect }} />}
      {inboxPrompt && editor && inbox && (
        <Portal>
          <InboxItemPrompt
            items={inbox.items}
            style={placeNear(inboxPrompt.anchor, 352, 300)}
            onCancel={operations.cancelInboxItem}
            onPick={operations.pickInboxItem}
          />
        </Portal>
      )}
      {prompt && editor && (
        <Portal>
          <PageNamePrompt
            prompt={prompt}
            pages={pages}
            currentPageId={currentPageId}
            onCancel={operations.cancelPageName}
            onSubmit={operations.submitPageName}
          />
        </Portal>
      )}
    </div>
  );
}
