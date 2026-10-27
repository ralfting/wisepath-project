import { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { NoteId, PageId, PathId } from '@wisepath/domain/paths';
import type { Page, PageNote, Path } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { renderWithLayers } from '@/test/render';
import { PageSheet } from '../PageEditor/PageSheet';
import { PagePanel } from '../PagePanel/PagePanel';

const aNote = (id: string, body: string, quote?: PageNote['quote']): PageNote => ({
  id: NoteId.make(id),
  ...(quote ? { quote } : {}),
  body,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
});

const aPage = (notes: ReadonlyArray<PageNote>): Page => ({
  id: PageId.make('borrowing'),
  title: 'Borrowing',
  content: 'One mutable reference or many shared ones.',
  studied: false,
  updatedAt: '2026-10-01T00:00:00.000Z',
  notes,
});

/** A path someone else owns, read by a viewer: the page's text is not theirs, the notes are */
const aReadPath = (page: Page): Path => ({
  id: PathId.make('rust'),
  title: 'Borrowing',
  kind: 'study',
  pages: [page],
  rootPageId: page.id,
  visibility: 'public',
  access: 'viewer',
});

/** The notes' actions as the map's store records them, applied to the page as the store does */
const notesStore = (setPage: (change: (page: Page) => Page) => void, spies: Pick<PathActions, 'writeNote' | 'removeNote'>): PathActions => ({
  updatePage: vi.fn(),
  writeNote: (pageId, noteId, text) => {
    spies.writeNote(pageId, noteId, text);
    setPage((page) => {
      const others = (page.notes ?? []).filter((note) => note.id !== noteId);
      return { ...page, notes: [...others, { ...aNote(noteId, text.body, text.quote) }] };
    });
  },
  removeNote: (pageId, noteId) => {
    spies.removeNote(pageId, noteId);
    setPage((page) => ({ ...page, notes: (page.notes ?? []).filter((note) => note.id !== noteId) }));
  },
  toggleActivity: vi.fn(),
  answerQuestion: vi.fn(),
  beginRename: vi.fn(),
  renameLinks: vi.fn(),
  createPage: vi.fn(),
  addBranch: vi.fn(),
  moveBranch: vi.fn(),
  deletePage: vi.fn(),
  setLook: vi.fn(),
  setDescription: vi.fn(),
  setKind: vi.fn(),
});

type Surface = 'drawer' | 'full page';

function Reading({ notes, surface, spies }: { notes: ReadonlyArray<PageNote>; surface: Surface; spies: Pick<PathActions, 'writeNote' | 'removeNote'> }) {
  const [page, setPage] = useState(() => aPage(notes));
  const path = aReadPath(page);
  const store = notesStore(setPage, spies);
  return surface === 'drawer' ? (
    <PagePanel path={path} page={page} store={store} onSelect={() => {}} flat />
  ) : (
    <PageSheet path={path} page={page} store={store} save={{ status: 'saved', notice: null }} onOpenPage={() => {}} showOnMap={{ onClick: () => {} }} onDeleted={() => {}} />
  );
}

const readPage = (notes: ReadonlyArray<PageNote>, surface: Surface = 'drawer') => {
  const spies = { writeNote: vi.fn(), removeNote: vi.fn() };
  renderWithLayers(<Reading notes={notes} surface={surface} spies={spies} />, MemoryAuth());
  return spies;
};

/** The open note's card beside the page */
const openCard = () => screen.findByRole('dialog', { name: 'Note' });

const notesTab = async (user: ReturnType<typeof userEvent.setup>, count: number) => {
  await user.click(screen.getByRole('tab', { name: `My notes (${count})` }));
  return screen.getByRole('tabpanel', { name: `My notes (${count})` });
};

/** From a note's quote in the Notes tab to its passage, with its card open on the Content tab */
const goToPassage = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByText('One mutable', { selector: '.wp-page-note' });
  const tab = await notesTab(user, 4);

  await user.click(within(tab).getByRole('button', { name: 'Go to the passage: shared ones' }));

  expect(screen.getByRole('tab', { name: 'Content' }).getAttribute('aria-selected')).toBe('true');
  const card = await openCard();
  expect(within(card).getByText('Many readers')).toBeTruthy();
  expect(document.activeElement).toBe(within(card).getByRole('button', { name: 'Edit note' }));
};

const borrowingNotes = [
  aNote('page-wide', 'Read the chapter again'),
  aNote('gone', 'About lifetimes', { exact: 'lifetimes', prefix: '', suffix: '' }),
  aNote('shared', 'Many readers', { exact: 'shared ones', prefix: 'many ', suffix: '.' }),
  aNote('first', 'Exactly one', { exact: 'One mutable', prefix: '', suffix: ' reference' }),
];

describe("a reader's notes on a page they may only read", () => {
  it('opens a note from its passage to read, then to edit or delete', async () => {
    const user = userEvent.setup();
    const { writeNote, removeNote } = readPage([aNote('n1', 'Why only one?', { exact: 'mutable reference', prefix: 'One ', suffix: ' or many' })]);

    await user.click(await screen.findByText('mutable reference', { selector: '.wp-page-note' }));
    const card = await openCard();
    expect(within(card).getByText('Why only one?')).toBeTruthy();
    expect(within(card).queryByLabelText('Note')).toBeNull();

    await user.click(within(card).getByRole('button', { name: 'Edit note' }));
    const field = await within(card).findByLabelText('Note');
    expect(field.textContent).toBe('Why only one?');
    await user.type(field, '!');
    expect(writeNote).toHaveBeenLastCalledWith('borrowing', 'n1', {
      quote: { exact: 'mutable reference', prefix: 'One ', suffix: ' or many' },
      body: 'Why only one?!',
    });
    await user.click(within(card).getByRole('button', { name: 'Done' }));
    expect(within(card).queryByLabelText('Note')).toBeNull();
    expect(within(card).getByText('Why only one?!')).toBeTruthy();

    await user.click(within(card).getByRole('button', { name: 'Delete note' }));
    expect(removeNote).toHaveBeenCalledWith('borrowing', 'n1');
    expect(screen.queryByRole('dialog', { name: 'Note' })).toBeNull();
  });

  it('closes the card on Esc, leaving the editor first', async () => {
    const user = userEvent.setup();
    readPage([aNote('n1', 'Why only one?', { exact: 'mutable reference', prefix: 'One ', suffix: ' or many' })]);
    await user.click(await screen.findByText('mutable reference', { selector: '.wp-page-note' }));
    const card = await openCard();
    await user.click(within(card).getByRole('button', { name: 'Edit note' }));
    await within(card).findByLabelText('Note');

    await user.keyboard('{Escape}');
    expect(within(card).queryByLabelText('Note')).toBeNull();
    expect(within(card).getByText('Why only one?')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Note' })).toBeNull();
  });

  it('writes a new note on the selected words once it says something', async () => {
    const user = userEvent.setup();
    const { writeNote } = readPage([]);
    const text = (await screen.findByText('One mutable reference or many shared ones.')).firstChild!;

    document.getSelection()!.setBaseAndExtent(text, 4, text, 11);
    document.dispatchEvent(new Event('selectionchange'));
    await user.click(await screen.findByRole('button', { name: 'Note', hidden: true }));
    const card = await openCard();
    const field = await within(card).findByLabelText('Note');
    expect(within(card).queryByRole('button', { name: 'Edit note' })).toBeNull();
    expect(writeNote).not.toHaveBeenCalled();
    await user.type(field, 'Hm');

    expect(writeNote).toHaveBeenLastCalledWith('borrowing', expect.any(String), {
      quote: { exact: 'mutable', prefix: 'One ', suffix: ' reference or many shared ones.' },
      body: 'Hm',
    });
  });

  it('lists the notes in text order on their own tab, marking one whose passage is gone', async () => {
    const user = userEvent.setup();
    readPage(borrowingNotes);
    // The editor finds the passages before the list can order them
    await screen.findByText('One mutable', { selector: '.wp-page-note' });

    const tab = await notesTab(user, 4);
    expect(within(tab).getByText('Only you see these')).toBeTruthy();
    const items = within(tab).getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual([
      expect.stringContaining('Exactly one'),
      expect.stringContaining('Many readers'),
      expect.stringContaining('Read the chapter again'),
      expect.stringMatching(/lifetimes.*Passage removed.*About lifetimes/),
    ]);
    expect(within(tab).getByRole('button', { name: 'Add a note' })).toBeTruthy();
  });

  it('writes a note in its place in the tab, one at a time', async () => {
    const user = userEvent.setup();
    const { writeNote } = readPage(borrowingNotes);
    await screen.findByText('One mutable', { selector: '.wp-page-note' });
    const tab = await notesTab(user, 4);
    const [first, second] = within(tab).getAllByRole('listitem');

    await user.click(within(first).getByRole('button', { name: 'Edit note' }));
    await user.type(await within(first).findByLabelText('Note'), '!');
    expect(writeNote).toHaveBeenLastCalledWith('borrowing', 'first', { quote: { exact: 'One mutable', prefix: '', suffix: ' reference' }, body: 'Exactly one!' });

    await user.click(within(second).getByRole('button', { name: 'Edit note' }));
    expect(within(first).queryByLabelText('Note')).toBeNull();
    expect(within(first).getByText('Exactly one!')).toBeTruthy();
    expect(within(tab).getAllByLabelText('Note')).toHaveLength(1);
    await user.click(within(second).getByRole('button', { name: 'Delete note' }));
    expect(within(tab).queryByText('Many readers')).toBeNull();
    expect(screen.getByRole('tab', { name: 'My notes (3)' })).toBeTruthy();
  });

  it('writes a note opened by a double click, and says it is saved when Save closes it', async () => {
    const user = userEvent.setup();
    const { writeNote } = readPage(borrowingNotes);
    await screen.findByText('One mutable', { selector: '.wp-page-note' });
    const tab = await notesTab(user, 4);
    const [first] = within(tab).getAllByRole('listitem');

    await user.dblClick(within(first).getByText('Exactly one'));
    await user.type(await within(first).findByLabelText('Note'), '!');
    await user.click(within(first).getByRole('button', { name: 'Save' }));

    expect(within(first).queryByLabelText('Note')).toBeNull();
    expect(writeNote).toHaveBeenLastCalledWith('borrowing', 'first', { quote: { exact: 'One mutable', prefix: '', suffix: ' reference' }, body: 'Exactly one!' });
    expect(within(first).getByRole('status').textContent).toBe('Note saved');
  });

  it('adds a note on the whole page there, and keeps none left blank', async () => {
    const user = userEvent.setup();
    const { writeNote } = readPage([]);
    const tab = await notesTab(user, 0);
    expect(within(tab).getByText('Notes you make on selected words, or here, show up in this tab.')).toBeTruthy();

    await user.click(within(tab).getByRole('button', { name: 'Add a note' }));
    await within(tab).findByLabelText('Note');
    await user.keyboard('{Escape}');
    expect(within(tab).queryByLabelText('Note')).toBeNull();
    expect(writeNote).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(within(tab).getByRole('button', { name: 'Add a note' }));

    await user.click(within(tab).getByRole('button', { name: 'Add a note' }));
    await user.type(await within(tab).findByLabelText('Note'), 'Ask about Rc');
    expect(writeNote).toHaveBeenLastCalledWith('borrowing', expect.any(String), { body: 'Ask about Rc' });
    expect(screen.getByRole('tab', { name: 'My notes (1)' })).toBeTruthy();
    expect(within(tab).getAllByRole('listitem')).toHaveLength(1);
  });

  it('goes from a quote to its passage on the Content tab with its card open', async () => {
    const user = userEvent.setup();
    readPage(borrowingNotes);
    await goToPassage(user);
  });

  it('has the same Content and Notes tabs on the full page', async () => {
    const user = userEvent.setup();
    readPage(borrowingNotes, 'full page');
    await goToPassage(user);
  });
});

