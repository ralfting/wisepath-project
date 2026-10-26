import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { PageId, PathId } from '@wisepath/domain/paths';
import type { Page, Path } from '@wisepath/domain/paths';
import { renderWithLayers } from '@/test/render';
import type { PageActions } from '../PageContent/PageContent.helpers';
import { PageNotes } from './PageNotes';

const aPage = (notes?: string): Page => ({
  id: PageId.make('borrowing'),
  title: 'Borrowing',
  content: 'One mutable reference or many shared ones.',
  studied: false,
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...(notes !== undefined ? { notes } : {}),
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
  beginRename: vi.fn(),
  renameLinks: vi.fn(),
  openPage: vi.fn(),
  createLinkedPage: vi.fn(),
  createPage: vi.fn(),
});

const notesOf = (page: Page) => {
  const pageActions = actions();
  renderWithLayers(<PageNotes path={aReadPath(page)} page={page} actions={pageActions} />, MemoryAuth());
  return pageActions;
};

describe('PageNotes', () => {
  it('lets a reader add a note, saving what they type as their notes on the page', async () => {
    const user = userEvent.setup();
    const { updatePage } = notesOf(aPage());

    const region = screen.getByRole('region', { name: 'My notes' });
    expect(within(region).getByText('Only you see these')).toBeTruthy();
    await user.click(within(region).getByRole('button', { name: 'Add a note' }));
    const field = await within(region).findByRole('textbox', { name: 'My notes' });
    await user.type(field, 'Why');

    expect(updatePage).toHaveBeenLastCalledWith('borrowing', { notes: 'Why' });
    // A lean editor: none of the page text's toolbar, such as linking or making a page
    expect(within(region).queryByRole('button', { name: 'Link to a page' })).toBeNull();
  });

  it('shows notes already written, ready to edit', async () => {
    notesOf(aPage('Ask about lifetimes'));

    const region = screen.getByRole('region', { name: 'My notes' });
    expect(await within(region).findByText('Ask about lifetimes')).toBeTruthy();
    expect(within(region).queryByRole('button', { name: 'Add a note' })).toBeNull();
  });
});
