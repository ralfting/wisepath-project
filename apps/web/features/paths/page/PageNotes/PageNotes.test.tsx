import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { NoteId, PageId, PathId } from '@wisepath/domain/paths';
import type { Page, PageNote, Path } from '@wisepath/domain/paths';
import { renderWithLayers } from '@/test/render';
import { PageContent } from '../PageContent/PageContent';
import type { PageActions } from '../PageContent/PageContent.helpers';

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

const actions = (): PageActions => ({
  updatePage: vi.fn(),
  writeNote: vi.fn(),
  removeNote: vi.fn(),
  beginRename: vi.fn(),
  renameLinks: vi.fn(),
  openPage: vi.fn(),
  createLinkedPage: vi.fn(),
  createPage: vi.fn(),
});

const readPage = (notes: ReadonlyArray<PageNote>) => {
  const pageActions = actions();
  const page = aPage(notes);
  renderWithLayers(<PageContent path={aReadPath(page)} page={page} actions={pageActions} />, MemoryAuth());
  return pageActions;
};

/**
 * The open note's card. happy-dom lays nothing out, so the card takes its passage for scrolled away and hides
 * itself: found hidden, and its parts by their labels, since a hidden element has no accessible name
 */
const openCard = async () => {
  const card = await screen.findByRole('dialog', { hidden: true });
  expect(card.getAttribute('aria-label')).toBe('Note');
  return card;
};

describe("a reader's notes on a page they may only read", () => {
  it('highlights the passage of a note and opens the note from it, to edit or delete', async () => {
    const user = userEvent.setup();
    const { writeNote, removeNote } = readPage([aNote('n1', 'Why only one?', { exact: 'mutable reference', prefix: 'One ', suffix: ' or many' })]);

    await user.click(await screen.findByText('mutable reference', { selector: '.wp-page-note' }));
    const field = await within(await openCard()).findByLabelText('Note');
    expect(field.textContent).toBe('Why only one?');
    await user.type(field, '!');
    expect(writeNote).toHaveBeenLastCalledWith('borrowing', 'n1', {
      quote: { exact: 'mutable reference', prefix: 'One ', suffix: ' or many' },
      body: 'Why only one?!',
    });

    await user.click(within(await openCard()).getByLabelText('Delete note'));
    expect(removeNote).toHaveBeenCalledWith('borrowing', 'n1');
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
  });

  it('writes a new note on the selected words once it says something', async () => {
    const user = userEvent.setup();
    const { writeNote } = readPage([]);
    const text = (await screen.findByText('One mutable reference or many shared ones.')).firstChild!;

    document.getSelection()!.setBaseAndExtent(text, 4, text, 11);
    document.dispatchEvent(new Event('selectionchange'));
    await user.click(await screen.findByRole('button', { name: 'Note', hidden: true }));
    const field = await within(await openCard()).findByLabelText('Note');
    expect(writeNote).not.toHaveBeenCalled();
    await user.type(field, 'Hm');

    expect(writeNote).toHaveBeenLastCalledWith('borrowing', expect.any(String), {
      quote: { exact: 'mutable', prefix: 'One ', suffix: ' reference or many shared ones.' },
      body: 'Hm',
    });
  });

  it('lists the notes in text order under the page, marking one whose passage is gone', async () => {
    readPage([
      aNote('page-wide', 'Read the chapter again'),
      aNote('gone', 'About lifetimes', { exact: 'lifetimes', prefix: '', suffix: '' }),
      aNote('shared', 'Many readers', { exact: 'shared ones', prefix: 'many ', suffix: '.' }),
      aNote('first', 'Exactly one', { exact: 'One mutable', prefix: '', suffix: ' reference' }),
    ]);

    const region = screen.getByRole('region', { name: 'My notes' });
    expect(within(region).getByText('Only you see these')).toBeTruthy();
    await within(region).findByText('Passage removed');
    const items = within(region).getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual([
      expect.stringContaining('Exactly one'),
      expect.stringContaining('Many readers'),
      expect.stringContaining('Read the chapter again'),
      expect.stringMatching(/lifetimes.*Passage removed.*About lifetimes/),
    ]);
    expect(within(region).getByRole('button', { name: 'Add a note' })).toBeTruthy();
  });
});
