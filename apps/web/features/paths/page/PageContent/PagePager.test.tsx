import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Layer } from 'effect';
import { PageId, PathId } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import { renderWithLayers } from '@/test/render';
import { PagePager } from './PagePager';

const page = (title: string, content = '') => ({ id: PageId.make(title.toLowerCase()), title, content, studied: false, updatedAt: '' });
const path: Path = {
  id: PathId.make('react'),
  title: 'React',
  kind: 'learningPath',
  pages: [page('React', '[[Hooks]] [[Tests]]'), page('Hooks', '[[useState]]'), page('useState'), page('Tests'), page('Lone')],
  rootPageId: PageId.make('react'),
  visibility: 'private',
  access: 'owner',
};
const pageOf = (title: string) => path.pages.find((p) => p.title === title)!;

describe('PagePager', () => {
  it('offers the pages before and after in reading order, back up to the next branch, and opens them', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    renderWithLayers(<PagePager path={path} page={pageOf('useState')} onOpen={onOpen} />, Layer.empty);

    await user.click(screen.getByRole('button', { name: /Previous.*Hooks/ }));
    await user.click(screen.getByRole('button', { name: /Next.*Tests/ }));
    expect(onOpen.mock.calls).toEqual([['hooks'], ['tests']]);
  });

  it('offers no previous page on the root and nothing at all on an unlinked page', () => {
    const { unmount } = renderWithLayers(<PagePager path={path} page={pageOf('React')} onOpen={() => {}} />, Layer.empty);
    expect(screen.queryByRole('button', { name: /Previous/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Next.*Hooks/ })).toBeTruthy();
    unmount();

    renderWithLayers(<PagePager path={path} page={pageOf('Lone')} onOpen={() => {}} />, Layer.empty);
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
