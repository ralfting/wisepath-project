import { ReactNodeViewRenderer } from '@tiptap/react';
import type { Editor, Extensions } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Markdown } from 'tiptap-markdown';
import { Link, getTaskListExtension } from '@mantine/tiptap';
import { findPageByTitle } from '@wisepath/domain/paths';
import type { InboxItem } from '@wisepath/domain/inbox';
import type { LinkPreview as Preview } from '@wisepath/domain/paths';
import type { Translate } from '@/i18n/I18nProvider';
import { ActiveBlockRail, BlockKeys, BulletToChecklist, LinkKeys } from '../keys';
import { PageLinkSuggestion, SlashCommands } from '../menus';
import type { PageLinkItem, PageLinkPickerState, SlashMenuState } from '../menus';
import { WikiLink } from '../wikiLink';
import { YouTubeVideo } from '../youtube';
import { LinkTitles } from '../linkTitles';
import { NoteHighlights } from '../noteHighlights';
import type { EditorNotes } from '../noteHighlights';
import { CodeBlockView } from '../CodeBlockView/CodeBlockView';
import { CalloutBlock } from '../callout';
import { CalloutView } from '../CalloutView/CalloutView';
import type { PreviewPage } from '../LinkPreview/LinkPreview';
import { VideoBlock } from '../video/VideoBlock/VideoBlock';
import { Timestamp, timestampLabels } from '../video/timestamps';
import { EDITOR_VARIANTS, SLASH_COMMANDS, lowlight, pageLinkItems, webAddress } from './MarkdownEditor.helpers';
import type { EditorVariant } from './MarkdownEditor.helpers';

/** What the extensions read when they run, always the latest: the editor creates them once */
export interface EditorContext {
  pages: ReadonlyArray<PreviewPage>;
  currentPageId: string;
  onLinkPage: (pageId: string) => void;
  onCreatePageHere: (title: string) => void;
  inbox?: { items: ReadonlyArray<InboxItem> | null };
  notes?: EditorNotes;
  variant?: EditorVariant;
  t: Translate;
  loadPreview: (url: string) => Promise<Preview | null>;
}

/**
 * Our Tiptap setup: markdown in and out, code with syntax colours, links (web and [[Page]]), checklists, callouts, tables kept
 * plain so they save as markdown, YouTube videos to take notes on, the [[ picker and the / commands. The page
 * prompts and link cards are the editor component's; these say when to show them. A lean editor (the reader's
 * notes) has no videos, no [[ picker and no / commands that make or link pages. The reader's notes on passages are
 * drawn over the text, when the editor is given them.
 */
export function editorExtensions({
  context,
  openUrl,
  openWikiLink,
  askPageName,
  askInboxItem,
  onPicker,
  onSlash,
}: {
  context: () => EditorContext;
  openUrl: (href: string) => void;
  openWikiLink: (title: string, element: Element) => void;
  askPageName: (editor: Editor) => void;
  askInboxItem: (editor: Editor) => void;
  onPicker: (state: PageLinkPickerState | null) => void;
  onSlash: (state: SlashMenuState | null) => void;
}): Extensions {
  const variant = EDITOR_VARIANTS[context().variant ?? 'page'];
  return [
    // The code block comes from CodeBlockLowlight instead, for syntax colours, with a language picker. Where a dragged
    // block will land shows as a line in the colour of actions
    StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false, dropcursor: { color: 'var(--mantine-color-blue-filled)', width: 3 } }),
    CodeBlockLowlight.extend({ addNodeView: () => ReactNodeViewRenderer(CodeBlockView) }).configure({ lowlight }),
    // A link written to a bare host is read with https, so it opens the site and saves that way
    Link.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          href: {
            default: null,
            parseHTML: (el: HTMLElement) => {
              const href = el.getAttribute('href');
              return href && (webAddress(href) ?? href);
            },
          },
        };
      },
    }).configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: null } }),
    Placeholder.configure({ placeholder: () => context().t(variant.placeholder) }),
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
    // Info, warning and danger boxes, saved as > [!kind] quotes
    CalloutBlock.extend({ addNodeView: () => ReactNodeViewRenderer(CalloutView) }),
    // A video to take notes on, and the [01:25] times that play it from there
    ...(variant.lean
      ? []
      : [
          YouTubeVideo.extend({ addNodeView: () => ReactNodeViewRenderer(VideoBlock) }),
          // Its chip's label in the current language, read when a chip is drawn
          Timestamp.configure({ labels: (time: string) => timestampLabels(context().t, time) }),
        ]),
    // Pasted addresses read as their page's title; the previews come from the same cache as the hover card
    LinkTitles.configure({ load: (url: string) => context().loadPreview(url) }),
    WikiLink.configure({ exists: (title: string) => !!findPageByTitle(context().pages, title) }),
    LinkKeys.configure({
      onOpen: (link, element) => (link.kind === 'web' ? openUrl(link.href) : element && openWikiLink(link.title, element)),
    }),
    Markdown.configure({ html: false, linkify: false, tightLists: true, transformPastedText: true }),
    NoteHighlights.configure({ notes: () => context().notes }),
    ...(variant.lean
      ? []
      : [
          PageLinkSuggestion.configure({
            getItems: (query: string): PageLinkItem[] => pageLinkItems(context().pages, context().currentPageId, query),
            // A name no page has yet makes the page, like /page does, so it shows on the map right away
            onLink: (item: PageLinkItem) => {
              if (item.id) context().onLinkPage(item.id);
              else context().onCreatePageHere(item.title);
            },
            onState: onPicker,
          }),
        ]),
    SlashCommands.configure({
      commands: () => {
        const { t, inbox } = context();
        return [
          ...SLASH_COMMANDS.filter((command) => !(variant.lean && command.pages)).map(({ id, message, hint, run }) => ({
            id,
            label: t(`editor.slash.${message}.label`),
            hint: 'syntax' in hint ? hint.syntax : t(hint.message),
            keywords: t(`editor.slash.${message}.keywords`),
            run: run ?? askPageName,
          })),
          ...(inbox
            ? [
                {
                  id: 'inbox',
                  label: t('editor.inbox.label'),
                  hint: inbox.items ? t('editor.inbox.waiting', { count: inbox.items.length }) : '',
                  keywords: t('editor.inbox.keywords'),
                  run: askInboxItem,
                },
              ]
            : []),
        ];
      },
      onState: onSlash,
    }),
  ];
}
