'use client';

import { BubbleMenu, EditorContent, FloatingMenu, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { findPageByTitle } from '../entities/project.entity';
import { BulletToChecklist, PageLinkSuggestion, WikiLink, YouTubeVideo, youTubeId } from './extensions';
import type { PageLinkItem, PageLinkPickerState } from './extensions';
import { LinkPreview } from './LinkPreview';
import type { PreviewPage, PreviewTarget } from './LinkPreview';

/**
 * MarkdownEditor
 * One continuous writing area that shows formatting as you type and saves markdown.
 * Markdown shortcuts work while typing (## heading, - list, - [ ] checklist, ``` code).
 * Selecting text shows a formatting tooltip; an empty line shows a + menu.
 * [[Page]] links another page by title, like Obsidian; a link to a page that
 * does not exist yet offers to create it when clicked.
 */

interface MarkdownEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  pages: PreviewPage[];
  currentPageId: string;
  onOpenPage: (pageId: string) => void;
  /** Called when a link to an existing page is inserted */
  onLinkPage: (pageId: string) => void;
  /** Creates a page with this title, linked from the current one, and opens it */
  onCreatePage: (title: string) => void;
  /** Increment to move focus to the end of the text */
  focusSignal?: number;
}

type Popover = { target: PreviewTarget; top: number; left: number; confirmCreate?: boolean };

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
}: MarkdownEditorProps) {
  const [picker, setPicker] = useState<PageLinkPickerState | null>(null);
  const [popover, setPopover] = useState<Popover | null>(null);
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
        placeholder: 'Write here. Type ## for a heading, - for a list, [[ to link another page.',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      BulletToChecklist,
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
        onLink: (item: PageLinkItem) => {
          if (item.id) latest.current.onLinkPage(item.id);
        },
        onState: setPicker,
      }),
    ],
    content,
    editorProps: {
      attributes: { class: 'md wp-editor', 'aria-label': 'Page content' },
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

  const openUrl = (href: string) => {
    if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener,noreferrer');
  };

  const placeBelow = (el: Element) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return { top: 0, left: 0 };
    const a = el.getBoundingClientRect();
    const w = wrapper.getBoundingClientRect();
    return { top: a.bottom - w.top + 6, left: Math.max(0, Math.min(a.left - w.left, w.width - 288)) };
  };

  const openWikiLink = (title: string, el: Element) => {
    const page = findPageByTitle(latest.current.pages, title);
    if (page) {
      setPopover(null);
      latest.current.onOpenPage(page.id);
      return;
    }
    window.clearTimeout(hoverTimer.current);
    setPopover({ target: { kind: 'page', title, page: undefined }, confirmCreate: true, ...placeBelow(el) });
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
    const el = (event.target as HTMLElement).closest('.wp-editor a, .wp-editor span[data-wikilink]');
    if (!el || popover?.confirmCreate) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      const title = el.getAttribute('data-wikilink');
      const target: PreviewTarget =
        title !== null
          ? { kind: 'page', title, page: findPageByTitle(latest.current.pages, title) }
          : { kind: 'url', href: el.getAttribute('href') ?? '' };
      setPopover({ target, ...placeBelow(el) });
    }, 350);
  };
  const onMouseOut = (event: MouseEvent) => {
    const to = event.relatedTarget as HTMLElement | null;
    if (popover?.confirmCreate || to?.closest('.wp-editor a, .wp-editor span[data-wikilink], [data-link-card]')) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setPopover(null), 200);
  };

  const popoverAction = () => {
    if (!popover) return;
    const { target } = popover;
    setPopover(null);
    if (target.kind === 'url') openUrl(target.href);
    else if (target.page) latest.current.onOpenPage(target.page.id);
    else latest.current.onCreatePage(target.title);
  };

  return (
    <div ref={wrapperRef} className="relative" onMouseOver={onMouseOver} onMouseOut={onMouseOut}>
      {editor && <SelectionTooltip editor={editor} onFollow={openUrl} />}
      {editor && <BlockMenu editor={editor} />}
      <EditorContent editor={editor} />

      {popover && (
        <div
          data-link-card
          role={popover.confirmCreate ? 'dialog' : undefined}
          aria-label={popover.confirmCreate ? 'Create page' : undefined}
          className="absolute z-20 w-72 rounded border border-border bg-card p-3 shadow-[0_6px_20px_hsl(var(--primary)/0.14)]"
          style={{ top: popover.top, left: popover.left }}
        >
          <LinkPreview target={popover.target} />
          <div className="mt-2.5 flex items-center gap-2">
            {popover.target.kind === 'page' && !popover.target.page ? (
              <>
                <button
                  type="button"
                  autoFocus={popover.confirmCreate}
                  onClick={popoverAction}
                  className="h-8 rounded bg-finder px-3 text-[13px] font-bold text-finder-foreground hover:bg-finder/90"
                >
                  Create page
                </button>
                {popover.confirmCreate && (
                  <button
                    type="button"
                    onClick={() => setPopover(null)}
                    className="h-8 rounded px-3 text-[13px] text-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={popoverAction}
                className="text-[13px] font-bold text-primary hover:underline hover:underline-offset-4"
              >
                {popover.target.kind === 'page' ? 'Open page' : 'Open link'}
              </button>
            )}
          </div>
        </div>
      )}

      {picker && picker.rect && (
        <div
          role="listbox"
          aria-label="Pages to link"
          className="fixed z-40 w-64 overflow-hidden rounded border border-border bg-card py-1 shadow-[0_6px_20px_hsl(var(--primary)/0.14)]"
          style={{ top: picker.rect.bottom + 6, left: picker.rect.left }}
        >
          {picker.items.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Type a page name.</p>
          ) : (
            picker.items.map((item, i) => (
              <button
                key={item.id ?? `new-${item.title}`}
                type="button"
                role="option"
                aria-selected={i === picker.index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  picker.select(item);
                }}
                className="block w-full truncate px-3 py-1.5 text-left text-[15px] aria-selected:bg-accent"
              >
                {item.id ? (
                  <span className="font-star italic">{item.title}</span>
                ) : (
                  <span className="text-sm">
                    Link to new page <span className="font-star text-[15px] italic">{item.title}</span>
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Selection tooltip ---------- */

function SelectionTooltip({ editor, onFollow }: { editor: Editor; onFollow: (href: string) => void }) {
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const inLink = editor.isActive('link');
  const href = (editor.getAttributes('link').href as string | undefined) ?? '';

  const startLink = () => {
    setLinkDraft(href);
    setEditingLink(true);
  };

  const applyLink = () => {
    const value = linkDraft.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!value) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|page:|mailto:)/.test(value) ? value : `https://${value}` }).run();
    setEditingLink(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: 'top', onHidden: () => setEditingLink(false) }}
      shouldShow={({ editor: e, from, to }) =>
        !e.isActive('youtube') && !e.isActive('wikiLink') && (from !== to || e.isActive('link'))
      }
      className="flex items-center gap-0.5 rounded border border-border bg-card p-1 shadow-[0_6px_20px_hsl(var(--primary)/0.16)]"
    >
      {editingLink ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
          className="flex items-center gap-1"
        >
          <label htmlFor="link-draft" className="sr-only">
            Link address
          </label>
          <input
            id="link-draft"
            autoFocus
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditingLink(false);
                editor.commands.focus();
              }
            }}
            placeholder="Paste a link"
            className="h-8 w-60 rounded border border-input bg-card px-2 text-sm"
          />
          <ToolButton label="Apply link" onClick={applyLink} wide>
            Apply
          </ToolButton>
        </form>
      ) : (
        <>
          <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <span className="font-bold">B</span>
          </ToolButton>
          <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <span className="font-star italic">I</span>
          </ToolButton>
          <ToolButton
            label="Heading"
            active={editor.isActive('heading')}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <span className="font-bold">H</span>
          </ToolButton>
          <ToolButton label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <ListGlyph />
          </ToolButton>
          <ToolButton label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
            <CodeGlyph />
          </ToolButton>
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
          <ToolButton label={inLink ? 'Edit link' : 'Add link'} active={inLink} onClick={startLink}>
            <LinkGlyph />
          </ToolButton>
          {inLink && (
            <>
              <ToolButton label="Open link" onClick={() => onFollow(href)} wide>
                Open
              </ToolButton>
              <ToolButton label="Remove link" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()} wide>
                Unlink
              </ToolButton>
            </>
          )}
        </>
      )}
    </BubbleMenu>
  );
}

/* ---------- Block menu on empty lines ---------- */

function BlockMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [videoDraft, setVideoDraft] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  const addVideo = () => {
    const url = (videoDraft ?? '').trim();
    if (!youTubeId(url)) {
      setVideoError(true);
      return;
    }
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
    setVideoDraft(null);
    setVideoError(false);
    setOpen(false);
  };

  return (
    <FloatingMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: 'left-start', offset: [0, 10], onHidden: () => setOpen(false) }}
      className="relative"
    >
      <button
        type="button"
        aria-label="Insert block"
        aria-expanded={open}
        title="Insert block"
        onClick={() => setOpen((v) => !v)}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-30 w-60 rounded border border-border bg-card py-1 shadow-[0_6px_20px_hsl(var(--primary)/0.16)]">
          {videoDraft !== null ? (
            <form
              className="space-y-1.5 px-2 py-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                addVideo();
              }}
            >
              <label htmlFor="video-draft" className="text-[13px] font-bold">
                YouTube link
              </label>
              <input
                id="video-draft"
                autoFocus
                value={videoDraft}
                onChange={(e) => {
                  setVideoDraft(e.target.value);
                  setVideoError(false);
                }}
                placeholder="https://www.youtube.com/watch?v=…"
                className="h-8 w-full rounded border border-input bg-card px-2 text-sm"
              />
              {videoError && <p className="text-[13px] text-destructive">That isn&apos;t a YouTube link. Paste the video&apos;s address.</p>}
              <button type="submit" className="h-8 rounded bg-primary px-3 text-sm font-bold text-primary-foreground">
                Add video
              </button>
            </form>
          ) : (
            <>
              <MenuItem label="Heading" hint="##" onClick={() => run(() => editor.chain().focus().setHeading({ level: 2 }).run())} />
              <MenuItem label="Bulleted list" hint="-" onClick={() => run(() => editor.chain().focus().toggleBulletList().run())} />
              <MenuItem label="Checklist" hint="[ ]" onClick={() => run(() => editor.chain().focus().toggleTaskList().run())} />
              <MenuItem label="Code block" hint="```" onClick={() => run(() => editor.chain().focus().setCodeBlock().run())} />
              <MenuItem label="YouTube video" onClick={() => setVideoDraft('')} />
              <MenuItem label="Link to a page" hint="[[" onClick={() => run(() => editor.chain().focus().insertContent('[[').run())} />
            </>
          )}
        </div>
      )}
    </FloatingMenu>
  );
}

function MenuItem({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-accent"
    >
      {label}
      {hint && <span className="font-mono text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  active,
  wide,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-8 place-items-center rounded text-sm text-foreground transition-colors hover:bg-accent aria-pressed:bg-primary aria-pressed:text-primary-foreground ${wide ? 'px-2.5' : 'w-8'}`}
    >
      {children}
    </button>
  );
}

const glyph = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

const ListGlyph = () => (
  <svg {...glyph}>
    <path d="M6 4h8M6 8h8M6 12h8" />
    <circle cx="2.5" cy="4" r=".6" fill="currentColor" />
    <circle cx="2.5" cy="8" r=".6" fill="currentColor" />
    <circle cx="2.5" cy="12" r=".6" fill="currentColor" />
  </svg>
);

const CodeGlyph = () => (
  <svg {...glyph}>
    <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5l3.5 3.5-3.5 3.5" />
  </svg>
);

const LinkGlyph = () => (
  <svg {...glyph}>
    <path d="M7 9a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 0 0-4-4l-.7.7M9 7a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 0 0 4 4l.7-.7" />
  </svg>
);
