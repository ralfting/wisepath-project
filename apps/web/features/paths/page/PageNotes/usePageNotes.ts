'use client';

import { useMemo, useRef, useState } from 'react';
import type { NoteId, Page, TextQuote } from '@wisepath/domain/paths';
import type { EditorNotes, NoteRect } from '@/features/paths/editor';
import { newNoteId } from '@/useCases/paths';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { notesInTextOrder } from './PageNotes.helpers';
import type { Spot } from './PageNotes.helpers';

/** The note whose card is open, where the card points, and whether it was just made (its field takes the cursor) */
export interface OpenNote {
  readonly noteId: NoteId;
  readonly quote?: TextQuote;
  readonly spot: Spot;
  readonly fresh: boolean;
}

/**
 * The reader's notes on one page: what the editor draws, the card open on one note, and the list under the text.
 * A new note is only written once it says something; one closed blank is removed.
 */
export function usePageNotes(page: Page, actions: Pick<PageActions, 'writeNote' | 'removeNote'>) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<OpenNote | null>(null);
  const [found, setFound] = useState<ReadonlyArray<string> | null>(null);
  const notes = useMemo(() => page.notes ?? [], [page.notes]);
  const latest = useRef(notes);
  latest.current = notes;

  const spotOf = (rect: NoteRect): Spot => {
    const origin = box.current?.getBoundingClientRect() ?? { top: 0, left: 0 };
    return { top: rect.top - origin.top, left: rect.left - origin.left, width: rect.right - rect.left, height: rect.bottom - rect.top };
  };
  const openAt = (noteId: NoteId, rect: NoteRect, draft?: TextQuote) =>
    setOpen({
      noteId,
      quote: draft ?? latest.current.find((note) => note.id === noteId)?.quote,
      spot: spotOf(rect),
      fresh: !latest.current.some((note) => note.id === noteId),
    });

  // A new note on a passage shows its highlight while it is written, before it is saved
  const items = useMemo(
    () => (open?.quote && !notes.some((note) => note.id === open.noteId) ? [...notes, { id: open.noteId, quote: open.quote }] : notes),
    [notes, open],
  );
  const editorNotes: EditorNotes = {
    items,
    openId: open?.noteId ?? null,
    onOpen: (noteId, rect) => {
      const note = latest.current.find((n) => n.id === noteId);
      if (note) openAt(note.id, rect);
    },
    onSelection: (quote, rect) => openAt(newNoteId(), rect, quote),
    onFound: setFound,
  };

  const exists = (noteId: NoteId) => latest.current.some((note) => note.id === noteId);
  const write = (body: string) => {
    if (!open || (body.trim() === '' && !exists(open.noteId))) return;
    actions.writeNote(page.id, open.noteId, { ...(open.quote ? { quote: open.quote } : {}), body });
  };
  const remove = () => {
    if (open && exists(open.noteId)) actions.removeNote(page.id, open.noteId);
    setOpen(null);
  };
  const close = () => {
    const note = open && latest.current.find((n) => n.id === open.noteId);
    if (note && note.body.trim() === '') actions.removeNote(page.id, note.id);
    setOpen(null);
  };

  /** From the list: to the passage when it is in the text, else to the note's place in the list */
  const show = (noteId: NoteId, from: Element) => {
    const passage = [...(box.current?.querySelectorAll('[data-page-note]') ?? [])].find((el) => el.getAttribute('data-page-note') === noteId);
    passage?.scrollIntoView({ block: 'center' });
    openAt(noteId, (passage ?? from).getBoundingClientRect());
  };
  const addOnPage = (from: Element) => openAt(newNoteId(), from.getBoundingClientRect());

  return {
    box,
    editorNotes,
    card: open && { open, body: notes.find((note) => note.id === open.noteId)?.body ?? '', write, remove, close },
    list: { notes: notesInTextOrder(notes, found), show, addOnPage },
  };
}
