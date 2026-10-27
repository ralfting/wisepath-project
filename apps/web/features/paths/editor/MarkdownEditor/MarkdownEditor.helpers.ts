import type { Editor } from '@tiptap/react';
import { common, createLowlight } from 'lowlight';
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconBlockquote,
  IconBrackets,
  IconClipboardText,
  IconCode,
  IconFilePlus,
  IconH2,
  IconH3,
  IconInfoCircle,
  IconList,
  IconListCheck,
  IconListNumbers,
  IconMessageQuestion,
  IconQuote,
  IconTable,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { asTitle, findPageByTitle } from '@wisepath/domain/paths';
import type { TranslationKey } from '@/i18n/I18nProvider';
import type { editor as editorMessages } from '@/i18n/messages/en/editor';
import type { PageLinkItem } from '../menus';
import type { Chip } from '../wikiLink';
import { setCallout } from '../callout';
import type { PreviewPage, PreviewTarget } from '../LinkPreview/LinkPreview';
import type { PagePrompt } from './PageNamePrompt';
import type { FrameRoom } from './useFrameRoom';

/**
 * Syntax colours for code blocks: the common languages (TypeScript, JavaScript, JSON, CSS, HTML, SQL,
 * shell, Python and so on). A block's language comes from its markdown fence (```ts); a block without one
 * is guessed. Mantine's editor styles colour the tokens, in light and dark
 */
export const lowlight = createLowlight(common);

/**
 * A link's card under it: what it points to, where it shows, whether it asks to make a missing page, and the page
 * link's chip when the text can be edited, so the card can turn it into a citation and back
 */
export type LinkCard = { target: PreviewTarget; top: number; left: number; confirmCreate?: boolean; chip?: Chip };

/** The Inbox item command waiting for its item: where it goes, and where to show the search */
export type InboxPrompt = PagePrompt;

/** A / command's messages: its label, its keywords and, for some, its hint */
export type SlashMessage = Exclude<keyof typeof editorMessages.slash, 'list'>;

/**
 * What the editor holds: a page's text, or the reader's notes on it. Notes are lean: no toolbar, outline, videos,
 * nor ways to make or link pages, and their own label and placeholder
 */
export const EDITOR_VARIANTS = {
  page: { label: 'editor.content.label', placeholder: 'editor.content.placeholder', lean: false },
  notes: { label: 'editor.notes.label', placeholder: 'editor.notes.placeholder', lean: true },
} as const satisfies Record<string, { label: TranslationKey; placeholder: TranslationKey; lean: boolean }>;
export type EditorVariant = keyof typeof EDITOR_VARIANTS;

/** The rem left of the full page its note bubbles need in the margin: two of them and a gap (NoteHighlights.module.css) */
const NOTE_MARGIN_ROOM = 4;

/** Whether the note bubbles go out in the margin left of the text, or stay at the end of their words */
export const notesInMargin = (room: FrameRoom | null): boolean => room !== null && room.left >= NOTE_MARGIN_ROOM;

/**
 * The / commands; Page is handled by the editor, since it asks for a name first. The hint beside the label is
 * either the markdown that does the same (syntax, not translated) or a message saying what it does. `pages`: it
 * makes or links a page, which a lean editor leaves out
 */
export const SLASH_COMMANDS: ReadonlyArray<{
  id: string;
  message: SlashMessage;
  hint: { syntax: string } | { message: TranslationKey };
  icon: Icon;
  run?: (editor: Editor) => void;
  pages?: true;
}> = [
  { id: 'page', message: 'page', hint: { message: 'editor.slash.page.hint' }, icon: IconFilePlus, pages: true },
  {
    id: 'link',
    message: 'link',
    hint: { message: 'editor.slash.link.hint' },
    icon: IconBrackets,
    run: (e) => e.chain().focus().insertContent('[[').run(),
    pages: true,
  },
  {
    id: 'cite',
    message: 'cite',
    hint: { message: 'editor.slash.cite.hint' },
    icon: IconQuote,
    run: (e) => e.chain().focus().insertContent('@[[').run(),
    pages: true,
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
  { id: 'info', message: 'info', hint: { syntax: '> [!info]' }, icon: IconInfoCircle, run: (e) => setCallout(e, 'info') },
  { id: 'warning', message: 'warning', hint: { syntax: '> [!warning]' }, icon: IconAlertTriangle, run: (e) => setCallout(e, 'warning') },
  { id: 'danger', message: 'danger', hint: { syntax: '> [!danger]' }, icon: IconAlertOctagon, run: (e) => setCallout(e, 'danger') },
  {
    id: 'activity',
    message: 'activity',
    hint: { syntax: '> [!activity]' },
    icon: IconClipboardText,
    run: (e) => setCallout(e, 'activity'),
  },
  {
    id: 'question',
    message: 'question',
    hint: { syntax: '> [!question]' },
    icon: IconMessageQuestion,
    run: (e) => setCallout(e, 'question'),
  },
];

/** How many pages the [[ picker offers at once */
export const MAX_PICKER_ITEMS = 6;

/**
 * What the [[ picker offers for what is typed after [[: the pages whose title has it (not this page, nor untitled
 * ones), and a page of that name to make when none has it exactly, without the [ or ] a title can't hold
 */
export function pageLinkItems(pages: ReadonlyArray<PreviewPage>, currentPageId: string, query: string): PageLinkItem[] {
  const q = asTitle(query).trim();
  const matches = pages
    .filter((p) => p.id !== currentPageId && p.title.trim())
    .filter((p) => p.title.toLowerCase().includes(q.toLowerCase()))
    .slice(0, MAX_PICKER_ITEMS)
    .map((p) => ({ id: p.id, title: p.title.trim() }));
  const exact = q && findPageByTitle(pages, q);
  return q && !exact ? [...matches, { id: null, title: q }] : matches;
}

/** The markdown saved for the text: a link is put in with a space after it, to keep typing; at a line's end it goes */
export const savedMarkdown = (markdown: string) => markdown.replace(/\]\] +$/gm, ']]');

/**
 * A link's web address, absolute: as written when it has http(s), with https added to a bare host written without
 * it ("www.google.com"), which the browser would otherwise read as a path inside the app; null for anything else
 */
export function webAddress(href: string): string | null {
  const address = href.trim();
  if (/^https?:\/\//i.test(address)) return address;
  return /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(address) ? `https://${address}` : null;
}

/** Opens a web address in a new tab through a real anchor: embedded browsers (like Orca's) ignore window.open */
export function openInNewTab(href: string) {
  const address = webAddress(href);
  if (!address) return;
  const a = document.createElement('a');
  a.href = address;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
}

