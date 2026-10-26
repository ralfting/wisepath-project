'use client';

import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { NoteId, Page, TextQuote } from '@wisepath/domain/paths';
import type { EditorNotes, NoteRect } from '@/features/paths/editor';
import { newNoteId } from '@/useCases/paths';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { notesInTextOrder } from './PageNotes.helpers';

/** The note open: in a card by its passage, read or written there, or written in its place in the Notes tab */
type OpenNote = { readonly noteId: NoteId; readonly quote?: TextQuote } & (
  | { readonly where: 'card'; readonly at: NoteRect; readonly mode: CardMode; readonly focus: boolean }
  | { readonly where: 'list' }
);

/** A note's card shows it, or its editor; a new note starts in the editor */
export type CardMode = 'read' | 'write';

/** One note open to write, whichever view shows it; `saved` once it has been written */
export interface NoteWriting {
  readonly noteId: NoteId;
  readonly quote?: TextQuote;
  readonly body: string;
  readonly saved: boolean;
  readonly write: (body: string) => void;
  readonly remove: () => void;
  readonly close: () => void;
}

/** The card open by a passage, beside the page */
export interface NoteCardState extends NoteWriting {
  /** Where the passage was when the card opened, until the card finds it in the text */
  readonly at: NoteRect;
  readonly mode: CardMode;
  /** Opened from the Notes tab, whose button had the focus and is now hidden: the card takes it */
  readonly focus: boolean;
  readonly edit: () => void;
  /** Leaves the editor for the note as it reads; a note left blank closes, as on close */
  readonly done: () => void;
}

/**
 * The reader's notes on one page, for its two tabs: what the editor draws and the card open by a passage (Content),
 * and the list with one note written in place (Notes). One note is open at a time, in either view. A new note is only
 * written once it says something; a note left blank is removed. `showText` brings the Content tab up.
 */
export function usePageNotes(page: Page, actions: Pick<PageActions, 'writeNote' | 'removeNote'>, showText: () => void) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<OpenNote | null>(null);
  const [found, setFound] = useState<ReadonlyArray<string> | null>(null);
  const notes = useMemo(() => page.notes ?? [], [page.notes]);
  const latest = useRef(notes);
  latest.current = notes;

  const noteOf = (noteId: NoteId) => latest.current.find((note) => note.id === noteId);
  const leave = () => {
    const note = open && noteOf(open.noteId);
    if (note && note.body.trim() === '') actions.removeNote(page.id, note.id);
  };
  const openNote = (next: OpenNote) => {
    if (open && open.noteId !== next.noteId) leave();
    setOpen(next);
  };

  const openCard = (noteId: NoteId, at: NoteRect, { draft, focus = false }: { draft?: TextQuote; focus?: boolean } = {}) =>
    openNote({ noteId, quote: draft ?? noteOf(noteId)?.quote, where: 'card', at, mode: noteOf(noteId) ? 'read' : 'write', focus });
  const openInList = (noteId: NoteId) => openNote({ noteId, quote: noteOf(noteId)?.quote, where: 'list' });

  // A new note on a passage shows its highlight while it is written, before it is saved
  const items = useMemo(
    () => (open?.quote && !notes.some((note) => note.id === open.noteId) ? [...notes, { id: open.noteId, quote: open.quote }] : notes),
    [notes, open],
  );
  const editorNotes: EditorNotes = {
    items,
    openId: open?.where === 'card' ? open.noteId : null,
    onOpen: (noteId, rect) => {
      const note = latest.current.find((n) => n.id === noteId);
      if (note) openCard(note.id, rect);
    },
    onSelection: (quote, rect) => openCard(newNoteId(), rect, { draft: quote }),
    onFound: setFound,
  };

  /** From the Notes tab: to its passage on the Content tab, its card open there; a note on no passage is written in place */
  const show = (noteId: NoteId) => {
    const passage = [...(box.current?.querySelectorAll('[data-page-note]') ?? [])].find((el) => el.getAttribute('data-page-note') === noteId);
    if (!passage) return openInList(noteId);
    // The Content tab is hidden until it is shown, and a hidden passage has no place to scroll to or point at
    flushSync(showText);
    passage.scrollIntoView({ block: 'center' });
    openCard(noteId, passage.getBoundingClientRect(), { focus: true });
  };

  const saved = (noteId: NoteId) => latest.current.some((note) => note.id === noteId);
  const write = (body: string) => {
    if (!open || (body.trim() === '' && !saved(open.noteId))) return;
    actions.writeNote(page.id, open.noteId, { ...(open.quote ? { quote: open.quote } : {}), body });
  };
  const remove = () => {
    if (open && saved(open.noteId)) actions.removeNote(page.id, open.noteId);
    setOpen(null);
  };
  const close = () => {
    leave();
    setOpen(null);
  };
  const writing: NoteWriting | null = open && {
    noteId: open.noteId,
    quote: open.quote,
    body: notes.find((note) => note.id === open.noteId)?.body ?? '',
    saved: notes.some((note) => note.id === open.noteId),
    write,
    remove,
    close,
  };

  const card: NoteCardState | null =
    open?.where === 'card' && writing
      ? {
          ...writing,
          at: open.at,
          mode: open.mode,
          focus: open.focus,
          edit: () => setOpen({ ...open, mode: 'write' }),
          done: () => (noteOf(open.noteId)?.body.trim() ? setOpen({ ...open, mode: 'read', focus: false }) : close()),
        }
      : null;

  return {
    text: { box, editorNotes, card },
    list: {
      notes: notesInTextOrder(notes, found),
      writing: open?.where === 'list' ? writing : null,
      show,
      edit: openInList,
      add: () => openInList(newNoteId()),
    },
  };
}

export type PageNotesState = ReturnType<typeof usePageNotes>;
