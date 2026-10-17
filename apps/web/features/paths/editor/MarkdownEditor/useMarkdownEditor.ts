'use client';

import { useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { itemHere } from '@wisepath/domain/inbox';
import type { InboxItem } from '@wisepath/domain/inbox';
import { useLinkPreviewLoader } from '@/useCases/paths';
import { useT } from '@/i18n/I18nProvider';
import { insertPageLink } from '../menus';
import type { PageLinkPickerState, SlashMenuState } from '../menus';
import type { PreviewPage } from '../LinkPreview/LinkPreview';
import { headingsOf, sameHeadings } from './Outline/Outline.helpers';
import type { Heading } from './Outline/Outline.helpers';
import type { PagePrompt } from './PageNamePrompt';
import { editorExtensions } from './editorExtensions';
import type { EditorContext } from './editorExtensions';
import { openInNewTab, savedMarkdown } from './MarkdownEditor.helpers';
import type { InboxPrompt } from './MarkdownEditor.helpers';
import { useLinkCard } from './useLinkCard';
import type { MarkdownEditorProps } from './MarkdownEditor';

/**
 * The markdown editor's view model: the Tiptap editor (created once, reading the latest props through a ref), the
 * page's headings for the outline, the [[ picker and / menu while they are open, the page name and Inbox item
 * prompts, the link card, and putting the cursor in the text when asked
 */
export function useMarkdownEditor(props: MarkdownEditorProps) {
  const { content, pages, focusSignal = 0, focusOnOpen = null, readOnly = false, inbox } = props;
  const t = useT();
  const [picker, setPicker] = useState<PageLinkPickerState | null>(null);
  const [headings, setHeadings] = useState<ReadonlyArray<Heading>>([]);
  const [slash, setSlash] = useState<SlashMenuState | null>(null);
  const [prompt, setPrompt] = useState<PagePrompt | null>(null);
  const [inboxPrompt, setInboxPrompt] = useState<InboxPrompt | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  // Extensions are created once; they read the latest props (and the language's messages) through refs
  const loadPreview = useLinkPreviewLoader();
  const latest = useRef({ props, t, loadPreview });
  latest.current = { props, t, loadPreview };
  const context = (): EditorContext => ({ ...latest.current.props, t: latest.current.t, loadPreview: latest.current.loadPreview });

  const card = useLinkCard({
    wrapper,
    pages: () => latest.current.props.pages,
    onOpenPage: (pageId) => latest.current.props.onOpenPage(pageId),
    onCreatePage: (title) => latest.current.props.onCreatePage(title),
    canCreate: () => !latest.current.props.readOnly,
  });

  const anchorAt = (e: Editor) => {
    const at = e.state.selection.from;
    const { top, bottom, left } = e.view.coordsAtPos(at);
    return { at, anchor: { top, bottom, left } };
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: editorExtensions({
      context,
      openUrl: openInNewTab,
      openWikiLink: card.openWikiLink,
      askPageName: (e) => setPrompt(anchorAt(e)),
      askInboxItem: (e) => setInboxPrompt(anchorAt(e)),
      onPicker: setPicker,
      onSlash: setSlash,
    }),
    content,
    editorProps: {
      attributes: () => ({ class: 'wp-editor', 'aria-label': latest.current.t('editor.content.label') }),
      handleDOMEvents: {
        click: (_view, event) => {
          const target = event.target as HTMLElement;
          // [[Page]] links open on click (or offer to create the page)
          const wiki = target.closest('span[data-wikilink]');
          if (wiki) {
            card.openWikiLink(wiki.getAttribute('data-wikilink') ?? '', wiki);
            event.preventDefault();
            return true;
          }
          // Cmd/Ctrl+click follows a web link; a plain click places the cursor
          const anchor = target.closest('a');
          if (anchor && (event.metaKey || event.ctrlKey)) {
            openInNewTab(anchor.getAttribute('href') ?? '');
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
    },
    onCreate: ({ editor: e }) => setHeadings(headingsOf(e)),
    onUpdate: ({ editor: e }) => {
      setHeadings((current) => sameHeadings(current, headingsOf(e)));
      latest.current.props.onChange(savedMarkdown(e.storage.markdown.getMarkdown()));
    },
    onSelectionUpdate: ({ editor: e }) => latest.current.props.onCursor?.(e.state.selection.from),
  });

  // Ready to write on arrival; a remembered position past the end lands at the end
  const focusOnOpenRef = useRef(focusOnOpen);
  useEffect(() => {
    const at = focusOnOpenRef.current;
    if (!editor || at === null) return;
    editor.commands.focus(typeof at === 'number' ? Math.min(at, editor.state.doc.content.size) : at);
  }, [editor]);

  // Missing-link styling depends on the page list, and the placeholder on the language; redraw decorations when they change
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('wikiLinkRefresh', true));
  }, [editor, pages, t]);

  useEffect(() => {
    if (editor && focusSignal > 0) editor.commands.focus('end');
  }, [editor, focusSignal]);

  // Access can change while the page is open (the owner makes someone an editor)
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  /** The / Page command's name: links it where / was typed, then opens it (made when missing), or stays */
  const submitPageName = (title: string, page: PreviewPage | undefined, stay: boolean) => {
    if (!editor || !prompt) return;
    setPrompt(null);
    insertPageLink(editor, prompt.at, title);
    if (stay) {
      if (!page) props.onCreatePageHere(title);
    } else if (page) props.onOpenPage(page.id);
    else props.onCreatePage(title);
  };
  const cancelPageName = () => {
    if (!editor || !prompt) return;
    setPrompt(null);
    editor.commands.focus(prompt.at);
  };
  /** The / Inbox item command's pick: its markdown where / was typed (a link, a video, a [01:25] note) */
  const pickInboxItem = (item: InboxItem) => {
    if (!editor || !inboxPrompt || !inbox) return;
    setInboxPrompt(null);
    editor.chain().focus(inboxPrompt.at).insertContent(itemHere(editor.storage.markdown.getMarkdown(), item)).run();
    inbox.onTaken(item);
  };
  const cancelInboxItem = () => {
    if (!editor || !inboxPrompt) return;
    setInboxPrompt(null);
    editor.commands.focus(inboxPrompt.at);
  };

  return {
    editor,
    wrapper,
    card,
    state: { headings, picker, slash, prompt, inboxPrompt },
    operations: { submitPageName, cancelPageName, pickInboxItem, cancelInboxItem },
  };
}
