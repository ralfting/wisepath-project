'use client';

import { BubbleMenu, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import { Link, RichTextEditor, getTaskListExtension } from '@mantine/tiptap';
import { Box, Button, Group, Paper, Popover, Portal, Stack, Text, TextInput, Transition, UnstyledButton } from '@mantine/core';
import type { MantineTransition } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import {
  IconBlockquote,
  IconBrackets,
  IconBrandYoutube,
  IconCode,
  IconColumnInsertRight,
  IconFilePlus,
  IconH2,
  IconH3,
  IconList,
  IconListCheck,
  IconListNumbers,
  IconColumnRemove,
  IconRowInsertBottom,
  IconRowRemove,
  IconTable,
  IconTableOff,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { findPageByTitle } from '@wisepath/domain/projects';
import { BlockKeys, BulletToChecklist, PageLinkSuggestion, SlashCommands, WikiLink, YouTubeVideo, insertPageLink, youTubeId } from './extensions';
import type { PageLinkItem, PageLinkPickerState, SlashCommand, SlashMenuState } from './extensions';
import { LinkPreview } from './LinkPreview';
import { MarkdownHelp } from './MarkdownHelp';
import type { PreviewPage, PreviewTarget } from './LinkPreview';
import classes from './MarkdownEditor.module.css';

/**
 * MarkdownEditor
 * Mantine's RichTextEditor around our Tiptap setup: it shows formatting as you
 * type and saves markdown. A lean toolbar holds the blocks (headings, lists,
 * checklist, code, video, page link); selecting text shows a bubble menu for
 * inline formatting. [[Page]] links another page by title, like Obsidian; a
 * link to a page that does not exist yet offers to create it when clicked.
 * / opens a list of commands; its Page command asks for a name, then Enter
 * links that page and goes straight to it, creating it when it does not exist.
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
}

export type EditorFocus = number | 'start' | 'end';

type LinkCard = { target: PreviewTarget; top: number; left: number; confirmCreate?: boolean };

/** The Page command waiting for a name: where its link goes, and where to show the field */
type PagePrompt = { at: number; anchor: Anchor };

/** The text a popup belongs to, in window coordinates */
type Anchor = { top: number; bottom: number; left: number };

/** The / commands; Page is handled by the editor, since it asks for a name first */
const SLASH_COMMANDS: ReadonlyArray<Omit<SlashCommand, 'run'> & { icon: Icon; run?: (editor: Editor) => void }> = [
  { id: 'page', label: 'Page', hint: 'Create a page and go to it', keywords: 'new create', icon: IconFilePlus },
  {
    id: 'link',
    label: 'Link to a page',
    hint: 'Same as [[',
    keywords: '[[ wiki',
    icon: IconBrackets,
    run: (e) => e.chain().focus().insertContent('[[').run(),
  },
  { id: 'h2', label: 'Heading', hint: '##', keywords: 'h2 title', icon: IconH2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: 'h3', label: 'Subheading', hint: '###', keywords: 'h3 title', icon: IconH3, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: 'bullets', label: 'Bulleted list', hint: '-', keywords: 'ul', icon: IconList, run: (e) => e.chain().focus().toggleBulletList().run() },
  { id: 'numbers', label: 'Numbered list', hint: '1.', keywords: 'ol', icon: IconListNumbers, run: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: 'checklist', label: 'Checklist', hint: '- [ ]', keywords: 'todo task', icon: IconListCheck, run: (e) => e.chain().focus().toggleTaskList().run() },
  { id: 'code', label: 'Code block', hint: '```', keywords: 'pre', icon: IconCode, run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'quote', label: 'Quote', hint: '>', keywords: 'blockquote', icon: IconBlockquote, run: (e) => e.chain().focus().toggleBlockquote().run() },
  // A header and one row: Tab in the last cell adds the next row, so no empty rows are left over
  {
    id: 'table',
    label: 'Table',
    hint: 'Header and a row',
    keywords: 'grid',
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
}: MarkdownEditorProps) {
  const [picker, setPicker] = useState<PageLinkPickerState | null>(null);
  const [headings, setHeadings] = useState<ReadonlyArray<Heading>>([]);
  const [slash, setSlash] = useState<SlashMenuState | null>(null);
  const [prompt, setPrompt] = useState<PagePrompt | null>(null);
  const [card, setCard] = useState<LinkCard | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>(0);

  // Extensions are created once; they read the latest props through refs
  const latest = useRef({ onChange, pages, currentPageId, onOpenPage, onLinkPage, onCreatePage, onCreatePageHere, onCursor });
  latest.current = { onChange, pages, currentPageId, onOpenPage, onLinkPage, onCreatePage, onCreatePageHere, onCursor };

  const askPageName = (e: Editor) => {
    const at = e.state.selection.from;
    const { top, bottom, left } = e.view.coordsAtPos(at);
    setPrompt({ at, anchor: { top, bottom, left } });
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: null } }),
      Placeholder.configure({
        placeholder: 'Write here, or type / for commands',
      }),
      getTaskListExtension(TaskList),
      TaskItem.configure({ nested: true }),
      BulletToChecklist,
      BlockKeys,
      // Tables stay plain so they save as markdown: a header row, one paragraph per cell
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      YouTubeVideo,
      WikiLink.configure({ exists: (title: string) => !!findPageByTitle(latest.current.pages, title) }),
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
        commands: SLASH_COMMANDS.map(({ run, ...command }) => ({ ...command, run: run ?? askPageName })),
        onState: setSlash,
      }),
    ],
    content,
    editorProps: {
      attributes: { class: 'wp-editor', 'aria-label': 'Page content' },
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

  // Missing-link styling depends on the page list; redraw decorations when it changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('wikiLinkRefresh', true));
  }, [editor, pages]);

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
      <RichTextEditor editor={editor} variant="subtle" classNames={{ root: classes.root, content: classes.content }}>
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
              aria-label="Link to a page"
              title="Link to a page ([[)"
            >
              <IconBrackets size={16} stroke={1.5} />
            </RichTextEditor.Control>
          </RichTextEditor.ControlsGroup>
          {/* Everything about tables in one group; editing controls show while the cursor is in a table */}
          <RichTextEditor.ControlsGroup aria-label="Table">
            <RichTextEditor.Control
              onClick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run()}
              disabled={!editor || editor.isActive('table')}
              aria-label="Insert table"
              title="Insert table"
            >
              <IconTable size={16} stroke={1.5} />
            </RichTextEditor.Control>
            {editor?.isActive('table') && (
              <>
              <RichTextEditor.Control onClick={() => editor.chain().focus().addRowAfter().run()} aria-label="Add row below" title="Add row below">
                <IconRowInsertBottom size={16} stroke={1.5} />
              </RichTextEditor.Control>
              <RichTextEditor.Control onClick={() => editor.chain().focus().addColumnAfter().run()} aria-label="Add column to the right" title="Add column to the right">
                <IconColumnInsertRight size={16} stroke={1.5} />
              </RichTextEditor.Control>
              <RichTextEditor.Control onClick={() => editor.chain().focus().deleteRow().run()} aria-label="Delete row" title="Delete row">
                <IconRowRemove size={16} stroke={1.5} />
              </RichTextEditor.Control>
              <RichTextEditor.Control onClick={() => editor.chain().focus().deleteColumn().run()} aria-label="Delete column" title="Delete column">
                <IconColumnRemove size={16} stroke={1.5} />
              </RichTextEditor.Control>
              <RichTextEditor.Control onClick={() => editor.chain().focus().deleteTable().run()} aria-label="Delete table" title="Delete table">
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
          aria-label={card.confirmCreate ? 'Create page' : undefined}
          className={classes.card}
          style={{ top: card.top, left: card.left }}
        >
          <Paper withBorder shadow="md" p="sm">
            <LinkPreview target={card.target} />
            <Group gap="xs" mt="sm">
              {card.target.kind === 'page' && !card.target.page ? (
                <>
                  <Button size="compact-sm" autoFocus={card.confirmCreate} onClick={cardAction}>
                    Create page
                  </Button>
                  {card.confirmCreate && (
                    <Button size="compact-sm" variant="subtle" color="gray" onClick={() => setCard(null)}>
                      Cancel
                    </Button>
                  )}
                </>
              ) : card.target.kind === 'url' ? (
                <Button
                  component="a"
                  href={card.target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="compact-sm"
                  variant="subtle"
                  px={0}
                  onClick={() => setCard(null)}
                >
                  Open link
                </Button>
              ) : (
                <Button size="compact-sm" variant="subtle" px={0} onClick={cardAction}>
                  Open page
                </Button>
              )}
            </Group>
          </Paper>
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
            aria-label="Pages to link"
            className={classes.picker}
            style={placeNear(picker.rect, 256, picker.items.length * 34 + 10)}
          >
            {picker.items.length === 0 ? (
              <Text size="sm" c="dimmed" px="sm" py={6}>
                Type a page name.
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
                      Create page <span className={classes.starName}>{item.title}</span>
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
            aria-label="Commands"
            className={`${classes.picker} ${classes.commands}`}
            style={placeNear(slash.rect, 320, slash.items.length * 36 + 10)}
          >
            {slash.items.map((command, i) => {
              const CommandIcon = SLASH_COMMANDS.find((c) => c.id === command.id)?.icon ?? IconFilePlus;
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

/**
 * Where a popup of about this size goes: below its text, or above it when the
 * window has more room there, kept inside the window and scrolling if it must
 */
function placeNear(anchor: Anchor, width: number, height: number): CSSProperties {
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
  const below = window.innerHeight - anchor.bottom - 14;
  const above = anchor.top - 14;
  return below >= height || below >= above
    ? { top: anchor.bottom + 6, left, maxHeight: below }
    : { bottom: window.innerHeight - anchor.top + 6, left, maxHeight: above };
}

const MOD_KEY = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl+';

/**
 * The Page command's name field. Enter links the page where / was typed and
 * goes to it: a name no page has creates the page, a taken one opens that page.
 * Cmd/Ctrl+Enter does the same but stays here, to list several pages in a row.
 */
function PageNamePrompt({
  prompt,
  pages,
  currentPageId,
  onCancel,
  onSubmit,
}: {
  prompt: PagePrompt;
  pages: ReadonlyArray<PreviewPage>;
  currentPageId: string;
  onCancel: () => void;
  onSubmit: (title: string, page: PreviewPage | undefined, stay: boolean) => void;
}) {
  const [name, setName] = useState('');
  const title = name.trim();
  const page = title ? findPageByTitle(pages, title) : undefined;
  const isThisPage = page?.id === currentPageId;
  const note = isThisPage
    ? 'That is this page.'
    : page
      ? `A page has this name: Enter opens it, ${MOD_KEY}Enter only links it.`
      : `Enter creates it and takes you there. ${MOD_KEY}Enter creates it and stays here.`;

  return (
    <Paper withBorder shadow="md" p="sm" role="dialog" aria-label="New page" className={classes.prompt} style={placeNear(prompt.anchor, 288, 110)}>
      <TextInput
        size="sm"
        aria-label="Page name"
        placeholder="Page name"
        leftSection={<IconFilePlus size={16} stroke={1.5} />}
        value={name}
        autoFocus
        // Keeps Esc here: the drawer around the editor would close on it
        data-mantine-stop-propagation
        onChange={(e) => setName(e.currentTarget.value)}
        // Clicking elsewhere on the page cancels; switching to another window does not
        onBlur={() => {
          if (document.hasFocus()) onCancel();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (title && !isThisPage) onSubmit(page ? page.title.trim() : title, page, e.metaKey || e.ctrlKey);
          }
        }}
      />
      <Text size="xs" c={isThisPage ? 'red' : 'dimmed'} mt={6}>
        {note}
      </Text>
    </Paper>
  );
}

/** A heading in the page's text, for the outline */
interface Heading {
  level: number;
  text: string;
  /** Where it starts in the document */
  pos: number;
}

function headingsOf(editor: Editor): Heading[] {
  const found: Heading[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const text = node.textContent.trim();
      if (text) found.push({ level: node.attrs.level as number, text, pos });
      return false;
    }
    return node.type.name !== 'codeBlock';
  });
  return found;
}

/** Keeps the same list while only positions move, so typing elsewhere does not redraw the outline */
function sameHeadings(current: ReadonlyArray<Heading>, next: Heading[]): ReadonlyArray<Heading> {
  const same = current.length === next.length && current.every((h, i) => h.level === next[i].level && h.text === next[i].text && h.pos === next[i].pos);
  return same ? current : next;
}

/** The nearest ancestor that scrolls, or the window */
function scrollerOf(el: HTMLElement): HTMLElement | Window {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return window;
}

/** The outline's panel grows out of the rail: a short fade with a nudge from the right */
const unfold: MantineTransition = {
  in: { opacity: 1, transform: 'translateX(0) scale(1)' },
  out: { opacity: 0, transform: 'translateX(6px) scale(0.98)' },
  transitionProperty: 'opacity, transform',
};

/**
 * Outline
 * The page's headings as a quiet rail on the right edge, like Notion's: one
 * dash per heading, longer for higher levels, the one being read in blue. It
 * stays in view while the text scrolls. Hovering (or a tap) opens the
 * headings by name; a click scrolls to one and puts the cursor at its end.
 */
function Outline({ editor, headings }: { editor: Editor; headings: ReadonlyArray<Heading> }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const openBefore = useRef(false);
  const top = Math.min(...headings.map((h) => h.level));

  // The heading being read: the last one whose top has passed below the toolbar
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const scroller = scrollerOf(rail);
    let frame = 0;
    const update = () => {
      frame = 0;
      const edge = (scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top) + 80;
      let current = 0;
      headings.forEach((h, i) => {
        const dom = editor.view.nodeDOM(h.pos) as HTMLElement | null;
        if (dom && dom.getBoundingClientRect().top <= edge) current = i;
      });
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [editor, headings]);

  const go = (heading: Heading) => {
    const node = editor.state.doc.nodeAt(heading.pos);
    if (!node) return;
    setOpen(false);
    editor.chain().focus(heading.pos + node.nodeSize - 1, { scrollIntoView: false }).run();
    (editor.view.nodeDOM(heading.pos) as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={classes.outlineTrack} aria-hidden={false}>
      <nav
        ref={railRef}
        aria-label="Contents"
        className={classes.outline}
        data-open={open || undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      >
        <button
          type="button"
          className={classes.outlineDashes}
          // A tap also fires mouseenter and focus, which open the panel first: toggle from how it was before the touch
          onPointerDown={() => (openBefore.current = open)}
          onClick={(e) => setOpen(e.detail === 0 ? (o) => !o : !openBefore.current)}
          aria-label="Contents"
          aria-expanded={open}
        >
          {headings.map((h, i) => (
            <span key={h.pos} className={classes.outlineDash} data-level={Math.min(h.level - top, 2)} data-active={i === active || undefined} />
          ))}
        </button>
        <Transition mounted={open} transition={unfold} duration={reduceMotion ? 0 : 140} exitDuration={reduceMotion ? 0 : 90} timingFunction="ease-out">
          {(style) => (
            <div className={classes.outlinePop} style={style}>
              <Paper className={classes.outlinePanel}>
                <Text component="div" className={classes.outlineTitle} aria-hidden>
                  On this page
                </Text>
                <ul className={classes.outlineList}>
                  {headings.map((h, i) => (
                    <li key={h.pos}>
                      <UnstyledButton
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(h)}
                        className={classes.outlineItem}
                        data-level={Math.min(h.level - top, 2)}
                        data-active={i === active || undefined}
                        aria-current={i === active ? 'location' : undefined}
                        title={h.text}
                      >
                        <span className={classes.outlineText}>{h.text}</span>
                      </UnstyledButton>
                    </li>
                  ))}
                </ul>
              </Paper>
            </div>
          )}
        </Transition>
      </nav>
    </div>
  );
}

/** Toolbar control that embeds a YouTube video from its link */
function VideoControl({ editor }: { editor: Editor }) {
  const [opened, setOpened] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);

  const add = () => {
    if (!youTubeId(url.trim())) {
      setError(true);
      return;
    }
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
    setUrl('');
    setError(false);
    setOpened(false);
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom" withArrow shadow="md" trapFocus>
      <Popover.Target>
        <RichTextEditor.Control onClick={() => setOpened((o) => !o)} aria-label="YouTube video" title="YouTube video">
          <IconBrandYoutube size={16} stroke={1.5} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Stack gap="xs" w={260}>
            <TextInput
              label="YouTube link"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => {
                setUrl(e.currentTarget.value);
                setError(false);
              }}
              error={error ? "That isn't a YouTube link. Paste the video's address." : undefined}
              data-autofocus
            />
            <Button type="submit" size="compact-sm" w="fit-content">
              Add video
            </Button>
          </Stack>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
}
