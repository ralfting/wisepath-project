'use client';

import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { NoteId, Page, TextQuote } from '@wisepath/domain/paths';
import type { EditorNotes, NoteRect } from '@/features/paths/editor';
import { newNoteId } from '@/useCases/paths';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { notesInTextOrder } from './PageNotes.helpers';
import type { Spot } from './PageNotes.helpers';

/** The note being written: in a card by its passage, pointing at `spot`, or in its place in the Notes tab */
type OpenNote = {
  readonly noteId: NoteId;
  readonly quote?: TextQuote;
  /** Its field takes the cursor: a new note, or one gone to from the Notes tab */
  readonly focus: boolean;
} & ({ readonly where: 'card'; readonly spot: Spot } | { readonly where: 'list' });

/** One note open to write, whichever view shows it; `saved` once it has been written */
export interface NoteWriting {
  readonly noteId: NoteId;
  readonly quote?: TextQuote;
  readonly focus: boolean;
  readonly body: string;
  readonly saved: boolean;
  readonly write: (body: string) => void;
  readonly remove: () => void;
  readonly close: () => void;
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

  const spotOf = (rect: NoteRect): Spot => {
    const origin = box.current?.getBoundingClientRect() ?? { top: 0, left: 0 };
    return { top: rect.top - origin.top, left: rect.left - origin.left, width: rect.right - rect.left, height: rect.bottom - rect.top };
  };
  const openCard = (noteId: NoteId, rect: NoteRect, { draft, focus = false }: { draft?: TextQuote; focus?: boolean } = {}) =>
    openNote({ noteId, quote: draft ?? noteOf(noteId)?.quote, focus: focus || !noteOf(noteId), where: 'card', spot: spotOf(rect) });
  const openInList = (noteId: NoteId) => openNote({ noteId, quote: noteOf(noteId)?.quote, focus: true, where: 'list' });

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

  /** From the Notes tab: to its passage on the Content tab, its card open there; a note on no passage opens in place */
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
    focus: open.focus,
    body: notes.find((note) => note.id === open.noteId)?.body ?? '',
    saved: notes.some((note) => note.id === open.noteId),
    write,
    remove,
    close,
  };

  return {
    text: { box, editorNotes, card: open?.where === 'card' && writing ? { ...writing, spot: open.spot } : null },
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
