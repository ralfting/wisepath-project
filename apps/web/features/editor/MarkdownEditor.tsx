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
import { Box, Button, Group, Paper, Popover, Portal, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import {
  IconBrackets,
  IconBrandYoutube,
  IconColumnInsertRight,
  IconColumnRemove,
  IconRowInsertBottom,
  IconRowRemove,
  IconTable,
  IconTableOff,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { findPageByTitle } from '@wisepath/domain/projects';
import { BulletToChecklist, PageCreateSuggestion, PageLinkSuggestion, WikiLink, YouTubeVideo, youTubeId } from './extensions';
import type { PageLinkItem, PageLinkPickerState } from './extensions';
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
 * /page and a name, then Enter, links that page and goes straight to it.
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
  /** Increment to move focus to the end of the text */
  focusSignal?: number;
  /** Distance from the top where the sticky toolbar stops (below a sticky header) */
  toolbarOffset?: number;
}

type LinkCard = { target: PreviewTarget; top: number; left: number; confirmCreate?: boolean };

const MAX_PICKER_ITEMS = 6;

export function MarkdownEditor({
  content,
  onChange,
  pages,
  currentPageId,
  onOpenPage,
  onLinkPage,
  onCreatePage,
  focusSignal = 0,
  toolbarOffset = 0,
}: MarkdownEditorProps) {
  const [picker, setPicker] = useState<PageLinkPickerState | null>(null);
  const [card, setCard] = useState<LinkCard | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>(0);

  // Extensions are created once; they read the latest props through refs
  const latest = useRef({ onChange, pages, currentPageId, onOpenPage, onLinkPage, onCreatePage });
  latest.current = { onChange, pages, currentPageId, onOpenPage, onLinkPage, onCreatePage };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: null } }),
      Placeholder.configure({
        placeholder: 'Write here. Type ## for a heading, - for a list, [[ to link a page, /page to create one.',
      }),
      getTaskListExtension(TaskList),
      TaskItem.configure({ nested: true }),
      BulletToChecklist,
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
        onPick: (item: PageLinkItem) => {
          if (item.id) latest.current.onLinkPage(item.id);
        },
        onState: setPicker,
      }),
      PageCreateSuggestion.configure({
        char: '/page',
        mode: 'create',
        // "/page Name": the name comes after a space, so "/pages" is just text
        getItems: (query: string): PageLinkItem[] => {
          const title = query.trim();
          if (!title || !/^\s/.test(query)) return [];
          const page = findPageByTitle(latest.current.pages, title);
          if (page?.id === latest.current.currentPageId) return [];
          return [page ? { id: page.id, title: page.title.trim() } : { id: null, title }];
        },
        onPick: (item: PageLinkItem) => {
          if (item.id) latest.current.onOpenPage(item.id);
          else latest.current.onCreatePage(item.title);
        },
        onState: setPicker,
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
    onUpdate: ({ editor: e }) => latest.current.onChange(e.storage.markdown.getMarkdown()),
  });

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
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
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
            tippyOptions={{ duration: 120, placement: 'top' }}
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

      {/* "/page" waits for a space before the name, so "/pages" stays plain text. In a portal:
          inside the drawer, its transform would place a fixed popup off screen */}
      {picker && picker.rect && !(picker.mode === 'create' && /^\S/.test(picker.query)) && (
        <Portal>
          <Paper
            withBorder
            shadow="md"
            py={4}
            role="listbox"
            aria-label={picker.mode === 'create' ? 'Page to create' : 'Pages to link'}
            className={classes.picker}
            style={{ top: picker.rect.bottom + 6, left: picker.rect.left }}
          >
            {picker.items.length === 0 ? (
              <Text size="sm" c="dimmed" px="sm" py={6}>
                {picker.mode === 'create' ? 'Type the name of the page, then Enter.' : 'Type a page name.'}
              </Text>
            ) : (
              picker.items.map((item, i) => (
                <UnstyledButton
                  key={item.id ?? `new-${item.title}`}
                  role="option"
                  aria-selected={i === picker.index}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    picker.select(item);
                  }}
                  className={classes.option}
                >
                  {picker.mode === 'create' ? (
                    <Text span size="sm">
                      {item.id ? 'Go to page' : 'Create page'} <span className={classes.starName}>{item.title}</span>
                    </Text>
                  ) : item.id ? (
                    <span className={classes.starName}>{item.title}</span>
                  ) : (
                    <Text span size="sm">
                      Link to new page <span className={classes.starName}>{item.title}</span>
                    </Text>
                  )}
                </UnstyledButton>
              ))
            )}
          </Paper>
        </Portal>
      )}
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
