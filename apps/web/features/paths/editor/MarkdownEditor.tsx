'use client';

import { BubbleMenu, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { Link, RichTextEditor, getTaskListExtension } from '@mantine/tiptap';
import { Box, Button, Group, Paper, Portal, Text, UnstyledButton } from '@mantine/core';
import { IconBlockquote, IconBrackets, IconExternalLink, IconCode, IconColumnInsertRight, IconFilePlus, IconH2, IconH3, IconInbox, IconList, IconListCheck, IconListNumbers, IconColumnRemove, IconRowInsertBottom, IconRowRemove, IconTable, IconTableOff } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { findPageByTitle } from '@wisepath/domain/paths';
import { itemHere } from '@wisepath/domain/inbox';
import type { InboxItem } from '@wisepath/domain/inbox';
import { ActiveBlockRail, BlockKeys, BulletToChecklist, LinkKeys } from './keys';
import { PageLinkSuggestion, SlashCommands, insertPageLink } from './menus';
import { WikiLink } from './wikiLink';
import { YouTubeVideo } from './youtube';
import type { PageLinkItem, PageLinkPickerState, SlashMenuState } from './menus';
import { LinkPreview } from './LinkPreview';
import { InboxItemPrompt } from './InboxItemPrompt';
import { MarkdownHelp } from './MarkdownHelp';
import type { PreviewPage, PreviewTarget } from './LinkPreview';
import classes from './MarkdownEditor.module.css';
import { CodeBlockView } from './CodeBlockView';
import { LinkTitles } from './linkTitles';
import { useLinkPreviewLoader } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import type { editor as editorMessages } from '@/i18n/messages/en/editor';
import { VideoBlock } from './video/VideoBlock';
import { Timestamp, timestampLabels } from './video/timestamps';
import { VideoControl } from './VideoControl';
import { Outline, headingsOf, sameHeadings } from './Outline';
import type { Heading } from './Outline';
import { PageNamePrompt, placeNear } from './PageNamePrompt';
import type { PagePrompt } from './PageNamePrompt';

/**
 * Syntax colours for code blocks: the common languages (TypeScript, JavaScript, JSON, CSS, HTML, SQL,
 * shell, Python and so on). A block's language comes from its markdown fence (```ts); a block without one
 * is guessed. Mantine's editor styles colour the tokens, in light and dark
 */
const lowlight = createLowlight(common);

/**
 * MarkdownEditor
 * Mantine's RichTextEditor around our Tiptap setup: it shows formatting as you
 * type and saves markdown. A lean toolbar holds the blocks (headings, lists,
 * checklist, code, video, page link); selecting text shows a bubble menu for
 * inline formatting. [[Page]] links another page by title, like Obsidian; a
 * link to a page that does not exist yet offers to create it when clicked.
 * / opens a list of commands; its Page command asks for a name, then Enter
 * links that page and goes straight to it, creating it when it does not exist.
 * Its Inbox item command puts something waiting in the Inbox where / was typed.
 */

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  pages: ReadonlyArray<PreviewPage>;
  currentPageId: string;
  onOpenPage: (pageId: string) => void;
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
  /** What waits in the Inbox (null while it loads), for the / command that brings an item in; without it, no command */
  inbox?: { items: ReadonlyArray<InboxItem> | null; onTaken: (item: InboxItem) => void };
}

export type EditorFocus = number | 'start' | 'end';

type LinkCard = { target: PreviewTarget; top: number; left: number; confirmCreate?: boolean };

/** The Inbox item command waiting for its item: where it goes, and where to show the search */
type InboxPrompt = PagePrompt;

/** A / command's messages: its label, its keywords and, for some, its hint */
type SlashMessage = Exclude<keyof typeof editorMessages.slash, 'list'>;

/**
 * The / commands; Page is handled by the editor, since it asks for a name first. The hint beside the label is
 * either the markdown that does the same (syntax, not translated) or a message saying what it does
 */
const SLASH_COMMANDS: ReadonlyArray<{
  id: string;
  message: SlashMessage;
  hint: { syntax: string } | { message: TranslationKey };
  icon: Icon;
  run?: (editor: Editor) => void;
}> = [
  { id: 'page', message: 'page', hint: { message: 'editor.slash.page.hint' }, icon: IconFilePlus },
  {
    id: 'link',
    message: 'link',
    hint: { message: 'editor.slash.link.hint' },
    icon: IconBrackets,
    run: (e) => e.chain().focus().insertContent('[[').run(),
  },
  { id: 'h2', message: 'heading', hint: { syntax: '##' }, icon: IconH2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  {
    id: 'h3',
    message: 'subheading',
    hint: { syntax: '###' },
    icon: IconH3,
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  { id: 'bullets', message: 'bullets', hint: { syntax: '-' }, icon: IconList, run: (e) => e.chain().focus().toggleBulletList().run() },
  {
    id: 'numbers',
    message: 'numbers',
    hint: { syntax: '1.' },
    icon: IconListNumbers,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'checklist',
    message: 'checklist',
    hint: { syntax: '- [ ]' },
    icon: IconListCheck,
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  { id: 'code', message: 'code', hint: { syntax: '```' }, icon: IconCode, run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'quote', message: 'quote', hint: { syntax: '>' }, icon: IconBlockquote, run: (e) => e.chain().focus().toggleBlockquote().run() },
  // A header and one row: Tab in the last cell adds the next row, so no empty rows are left over
  {
    id: 'table',
    message: 'table',
    hint: { message: 'editor.slash.table.hint' },
    icon: IconTable,
    run: (e) => e.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run(),
  },
];

const MAX_PICKER_ITEMS = 6;

export function MarkdownEditor({
  content,
  onChange,
  pages,
  currentPageId,
  onOpenPage,
  onLinkPage,
  onCreatePage,
  onCreatePageHere,
  focusSignal = 0,
  toolbarOffset = 0,
  focusOnOpen = null,
  onCursor,
  inbox,
}: MarkdownEditorProps) {
  const [picker, setPicker] = useState<PageLinkPickerState | null>(null);
  const [headings, setHeadings] = useState<ReadonlyArray<Heading>>([]);
  const [slash, setSlash] = useState<SlashMenuState | null>(null);
  const [prompt, setPrompt] = useState<PagePrompt | null>(null);
  const [inboxPrompt, setInboxPrompt] = useState<InboxPrompt | null>(null);
  const [card, setCard] = useState<LinkCard | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>(0);
  const t = useT();

  // Extensions are created once; they read the latest props (and the language's messages) through refs
  const latest = useRef({ onChange, pages, currentPageId, onOpenPage, onLinkPage, onCreatePage, onCreatePageHere, onCursor, inbox, t });
  latest.current = { onChange, pages, currentPageId, onOpenPage, onLinkPage, onCreatePage, onCreatePageHere, onCursor, inbox, t };
  // Pasted addresses read as their page's title; the previews come from the same cache as the hover card
  const loadPreview = useLinkPreviewLoader();
  const loadPreviewRef = useRef(loadPreview);
  loadPreviewRef.current = loadPreview;

  const askPageName = (e: Editor) => {
    const at = e.state.selection.from;
    const { top, bottom, left } = e.view.coordsAtPos(at);
    setPrompt({ at, anchor: { top, bottom, left } });
  };

  const askInboxItem = (e: Editor) => {
    const at = e.state.selection.from;
    const { top, bottom, left } = e.view.coordsAtPos(at);
    setInboxPrompt({ at, anchor: { top, bottom, left } });
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // The code block comes from CodeBlockLowlight instead, for syntax colours, with a language picker
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false }),
      CodeBlockLowlight.extend({ addNodeView: () => ReactNodeViewRenderer(CodeBlockView) }).configure({ lowlight }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: null } }),
      Placeholder.configure({
        placeholder: () => latest.current.t('editor.content.placeholder'),
      }),
      getTaskListExtension(TaskList),
      TaskItem.configure({ nested: true }),
      BulletToChecklist,
      BlockKeys,
      ActiveBlockRail,
      // Tables stay plain so they save as markdown: a header row, one paragraph per cell
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      // A video to take notes on, and the [01:25] times that play it from there
      YouTubeVideo.extend({ addNodeView: () => ReactNodeViewRenderer(VideoBlock) }),
      // Its chip's label in the current language, read when a chip is drawn
      Timestamp.configure({ labels: (time: string) => timestampLabels(latest.current.t, time) }),
      LinkTitles.configure({ load: (url: string) => loadPreviewRef.current(url) }),
      WikiLink.configure({ exists: (title: string) => !!findPageByTitle(latest.current.pages, title) }),
      LinkKeys.configure({
        onOpen: (link, element) => (link.kind === 'web' ? openUrl(link.href) : element && openWikiLink(link.title, element)),
      }),
      Markdown.configure({ html: false, linkify: false, tightLists: true, transformPastedText: true }),
      PageLinkSuggestion.configure({
        getItems: (query: string): PageLinkItem[] => {
          const q = query.trim();
          const matches = latest.current.pages
            .filter((p) => p.id !== latest.current.currentPageId && p.title.trim())
            .filter((p) => p.title.toLowerCase().includes(q.toLowerCase()))
            .slice(0, MAX_PICKER_ITEMS)
            .map((p) => ({ id: p.id, title: p.title.trim() }));
          const exact = q && findPageByTitle(latest.current.pages, q);
          return q && !exact ? [...matches, { id: null, title: q }] : matches;
        },
        // A name no page has yet makes the page, like /page does, so it shows on the map right away
        onLink: (item: PageLinkItem) => {
          if (item.id) latest.current.onLinkPage(item.id);
          else latest.current.onCreatePageHere(item.title);
        },
        onState: setPicker,
      }),
      SlashCommands.configure({
        commands: () => [
          ...SLASH_COMMANDS.map(({ id, message, hint, run }) => ({
            id,
            label: latest.current.t(`editor.slash.${message}.label`),
            hint: 'syntax' in hint ? hint.syntax : latest.current.t(hint.message),
            keywords: latest.current.t(`editor.slash.${message}.keywords`),
            run: run ?? askPageName,
          })),
          ...(latest.current.inbox
            ? [
                {
                  id: 'inbox',
                  label: latest.current.t('editor.inbox.label'),
                  hint: latest.current.inbox.items ? latest.current.t('editor.inbox.waiting', { count: latest.current.inbox.items.length }) : '',
                  keywords: latest.current.t('editor.inbox.keywords'),
                  run: askInboxItem,
                },
              ]
            : []),
        ],
        onState: setSlash,
      }),
    ],
    content,
    editorProps: {
      attributes: () => ({ class: 'wp-editor', 'aria-label': latest.current.t('editor.content.label') }),
      handleDOMEvents: {
        click: (_view, event) => {
          const target = event.target as HTMLElement;
          // [[Page]] links open on click (or offer to create the page)
          const wiki = target.closest('span[data-wikilink]');
          if (wiki) {
            openWikiLink(wiki.getAttribute('data-wikilink') ?? '', wiki);
            event.preventDefault();
            return true;
          }
          // Cmd/Ctrl+click follows a web link; a plain click places the cursor
          const anchor = target.closest('a');
          if (anchor && (event.metaKey || event.ctrlKey)) {
            openUrl(anchor.getAttribute('href') ?? '');
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
    },
    // A link is put in with a space after it, to keep typing; at the end of a line that space is not saved
    onCreate: ({ editor: e }) => setHeadings(headingsOf(e)),
    onUpdate: ({ editor: e }) => {
      setHeadings((current) => sameHeadings(current, headingsOf(e)));
      latest.current.onChange(e.storage.markdown.getMarkdown().replace(/\]\] +$/gm, ']]'));
    },
    onSelectionUpdate: ({ editor: e }) => latest.current.onCursor?.(e.state.selection.from),
  });

  // Ready to write on arrival; a remembered position past the end lands at the end
  const focusOnOpenRef = useRef(focusOnOpen);
  useEffect(() => {
    const at = focusOnOpenRef.current;
    if (!editor || at === null) return;
    editor.commands.focus(typeof at === 'number' ? Math.min(at, editor.state.doc.content.size) : at);
  }, [editor]);

  // Opened through a real anchor: embedded browsers (like Orca's) ignore window.open
  const openUrl = (href: string) => {
    if (!/^https?:/.test(href)) return;
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const placeBelow = (el: Element) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return { top: 0, left: 0 };
    const a = el.getBoundingClientRect();
    const w = wrapper.getBoundingClientRect();
    return { top: a.bottom - w.top, left: Math.max(0, Math.min(a.left - w.left, w.width - 288)) };
  };

  const openWikiLink = (title: string, el: Element) => {
    const page = findPageByTitle(latest.current.pages, title);
    if (page) {
      setCard(null);
      latest.current.onOpenPage(page.id);
      return;
    }
    window.clearTimeout(hoverTimer.current);
    setCard({ target: { kind: 'page', title, page: undefined }, confirmCreate: true, ...placeBelow(el) });
  };

  // Missing-link styling depends on the page list, and the placeholder on the language; redraw decorations when they change
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('wikiLinkRefresh', true));
  }, [editor, pages, t]);

  useEffect(() => {
    if (editor && focusSignal > 0) editor.commands.focus('end');
  }, [editor, focusSignal]);

  // Hover cards for links
  const onMouseOver = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Pointer reached the card: keep it open
    if (target.closest('[data-link-card]')) {
      window.clearTimeout(hoverTimer.current);
      return;
    }
    const el = target.closest('.wp-editor a, .wp-editor span[data-wikilink]');
    if (!el || card?.confirmCreate) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      const title = el.getAttribute('data-wikilink');
      const linkTarget: PreviewTarget =
        title !== null
          ? { kind: 'page', title, page: findPageByTitle(latest.current.pages, title) }
          : { kind: 'url', href: el.getAttribute('href') ?? '' };
      setCard({ target: linkTarget, ...placeBelow(el) });
    }, 350);
  };
  const onMouseOut = (event: MouseEvent) => {
    const to = event.relatedTarget as HTMLElement | null;
    if (card?.confirmCreate || to?.closest('.wp-editor a, .wp-editor span[data-wikilink], [data-link-card]')) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setCard(null), 300);
  };

  const cardAction = () => {
    if (!card) return;
    const { target } = card;
    setCard(null);
    if (target.kind === 'url') openUrl(target.href);
    else if (target.page) latest.current.onOpenPage(target.page.id);
    else latest.current.onCreatePage(target.title);
  };

  return (
    <div ref={wrapperRef} className={classes.wrapper} onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
      {editor && headings.length >= 2 && <Outline editor={editor} headings={headings} />}
      <RichTextEditor
        editor={editor}
        variant="subtle"
        classNames={{ root: classes.root, content: classes.content }}
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
        <RichTextEditor.Toolbar sticky stickyOffset={toolbarOffset} className={classes.toolbar}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <RichTextEditor.TaskList />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.CodeBlock />
            <RichTextEditor.Blockquote />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            {editor && <VideoControl editor={editor} />}
            <RichTextEditor.Control
              onClick={() => editor?.chain().focus().insertContent('[[').run()}
              aria-label={t('editor.toolbar.linkPage')}
              title={t('editor.toolbar.linkPageTitle')}
            >
              <IconBrackets size={16} stroke={1.5} />
            </RichTextEditor.Control>
          </RichTextEditor.ControlsGroup>
          {/* Everything about tables in one group; editing controls show while the cursor is in a table */}
          <RichTextEditor.ControlsGroup aria-label={t('editor.table.group')}>
            <RichTextEditor.Control
              onClick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run()}
              disabled={!editor || editor.isActive('table')}
              aria-label={t('editor.table.insert')}
              title={t('editor.table.insert')}
            >
              <IconTable size={16} stroke={1.5} />
            </RichTextEditor.Control>
            {editor?.isActive('table') && (
              <>
              <RichTextEditor.Control
                onClick={() => editor.chain().focus().addRowAfter().run()}
                aria-label={t('editor.table.addRow')}
                title={t('editor.table.addRow')}
              >
                <IconRowInsertBottom size={16} stroke={1.5} />
              </RichTextEditor.Control>
              <RichTextEditor.Control
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                aria-label={t('editor.table.addColumn')}
                title={t('editor.table.addColumn')}
              >
                <IconColumnInsertRight size={16} stroke={1.5} />
              </RichTextEditor.Control>
              <RichTextEditor.Control
                onClick={() => editor.chain().focus().deleteRow().run()}
                aria-label={t('editor.table.deleteRow')}
                title={t('editor.table.deleteRow')}
              >
                <IconRowRemove size={16} stroke={1.5} />
              </RichTextEditor.Control>
              <RichTextEditor.Control
                onClick={() => editor.chain().focus().deleteColumn().run()}
                aria-label={t('editor.table.deleteColumn')}
                title={t('editor.table.deleteColumn')}
              >
                <IconColumnRemove size={16} stroke={1.5} />
              </RichTextEditor.Control>
              <RichTextEditor.Control
                onClick={() => editor.chain().focus().deleteTable().run()}
                aria-label={t('editor.table.delete')}
                title={t('editor.table.delete')}
              >
                <IconTableOff size={16} stroke={1.5} />
              </RichTextEditor.Control>
              </>
            )}
          </RichTextEditor.ControlsGroup>
          <MarkdownHelp />
        </RichTextEditor.Toolbar>

        {editor && (
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
        )}

        <RichTextEditor.Content />
      </RichTextEditor>

      {card && (
        <Box
          data-link-card
          role={card.confirmCreate ? 'dialog' : undefined}
          aria-label={card.confirmCreate ? t('editor.card.create') : undefined}
          className={classes.card}
          style={{ top: card.top, left: card.left }}
        >
          {/* An existing page or a site: the whole card opens it (a site in a new tab). A page not made yet asks */}
          {card.target.kind === 'url' ? (
            <Paper
              component="a"
              href={card.target.href}
              target="_blank"
              rel="noopener noreferrer"
              withBorder
              shadow="md"
              p="sm"
              pr={32}
              className={classes.cardLink}
              aria-label={t('editor.card.openInNewTab', { href: card.target.href })}
              onClick={() => setCard(null)}
            >
              <IconExternalLink size={14} className={classes.cardOpens} aria-hidden />
              <LinkPreview target={card.target} />
            </Paper>
          ) : card.target.page ? (
            <Paper component="button" type="button" withBorder shadow="md" p="sm" className={classes.cardLink} onClick={cardAction}>
              <LinkPreview target={card.target} />
            </Paper>
          ) : (
            <Paper withBorder shadow="md" p="sm">
              <LinkPreview target={card.target} />
              <Group gap="xs" mt="sm">
                <Button size="compact-sm" autoFocus={card.confirmCreate} onClick={cardAction}>
                  {t('editor.card.create')}
                </Button>
                {card.confirmCreate && (
                  <Button size="compact-sm" variant="subtle" color="gray" onClick={() => setCard(null)}>
                    {t('common.actions.cancel')}
                  </Button>
                )}
              </Group>
            </Paper>
          )}
        </Box>
      )}

      {/* Popups go in a portal: inside the drawer, its transform would place a fixed popup off screen */}
      {picker && picker.rect && (
        <Portal>
          <Paper
            withBorder
            shadow="md"
            py={4}
            role="listbox"
            aria-label={t('editor.picker.list')}
            className={classes.picker}
            style={placeNear(picker.rect, 256, picker.items.length * 34 + 10)}
          >
            {picker.items.length === 0 ? (
              <Text size="sm" c="dimmed" px="sm" py={6}>
                {t('editor.picker.empty')}
              </Text>
            ) : (
              picker.items.map((item, i) => (
                <UnstyledButton
                  key={item.id ?? `new-${item.title}`}
                  role="option"
                  aria-selected={i === picker.index}
                  // Mouse down keeps the editor's focus; click covers keyboards and assistive tech
                  onMouseDown={(e) => {
                    e.preventDefault();
                    picker.select(item);
                  }}
                  onClick={() => picker.select(item)}
                  className={classes.option}
                >
                  {item.id ? (
                    <span className={classes.starName}>{item.title}</span>
                  ) : (
                    <Text span size="sm">
                      {t('editor.picker.create')} <span className={classes.starName}>{item.title}</span>
                    </Text>
                  )}
                </UnstyledButton>
              ))
            )}
          </Paper>
        </Portal>
      )}

      {slash && slash.rect && slash.items.length > 0 && (
        <Portal>
          <Paper
            withBorder
            shadow="md"
            py={4}
            role="listbox"
            aria-label={t('editor.slash.list')}
            className={`${classes.picker} ${classes.commands}`}
            style={placeNear(slash.rect, 320, slash.items.length * 36 + 10)}
          >
            {slash.items.map((command, i) => {
              const CommandIcon = command.id === 'inbox' ? IconInbox : (SLASH_COMMANDS.find((c) => c.id === command.id)?.icon ?? IconFilePlus);
              return (
                <UnstyledButton
                  key={command.id}
                  role="option"
                  aria-selected={i === slash.index}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    slash.select(command);
                  }}
                  onClick={() => slash.select(command)}
                  className={classes.command}
                >
                  <CommandIcon size={17} stroke={1.5} />
                  <span className={classes.commandLabel}>{command.label}</span>
                  <Text span size="xs" c="dimmed">
                    {command.hint}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Paper>
        </Portal>
      )}

      {inboxPrompt && editor && inbox && (
        <Portal>
          <InboxItemPrompt
            items={inbox.items}
            style={placeNear(inboxPrompt.anchor, 352, 300)}
            onCancel={() => {
              setInboxPrompt(null);
              editor.commands.focus(inboxPrompt.at);
            }}
            onPick={(item) => {
              setInboxPrompt(null);
              // Markdown, read as the page's own text: a link, a video, a [01:25] note
              editor.chain().focus(inboxPrompt.at).insertContent(itemHere(editor.storage.markdown.getMarkdown(), item)).run();
              inbox.onTaken(item);
            }}
          />
        </Portal>
      )}

      {prompt && editor && (
        <Portal>
          <PageNamePrompt
            prompt={prompt}
            pages={pages}
            currentPageId={currentPageId}
            onCancel={() => {
              setPrompt(null);
              editor.commands.focus(prompt.at);
            }}
            onSubmit={(title, page, stay) => {
              setPrompt(null);
              insertPageLink(editor, prompt.at, title);
              if (stay) {
                if (!page) onCreatePageHere(title);
              } else if (page) onOpenPage(page.id);
              else onCreatePage(title);
            }}
          />
        </Portal>
      )}
    </div>
  );
}
