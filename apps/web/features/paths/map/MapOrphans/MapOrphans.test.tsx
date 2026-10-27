import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PageId, PathId, newPath, updatePage, createPage } from '@wisepath/domain/paths';
import { renderWithLayers } from '@/test/render';
import { MapOrphans } from './MapOrphans';

/** A path whose root links Basics and cites Aside, and Basics cites Aside too */
function citedOnly() {
  let path = newPath(PathId.make('p'), 'Startups', PageId.make('root'));
  path = createPage(path, 'Basics', PageId.make('basics')).path;
  path = createPage(path, 'Aside', PageId.make('aside')).path;
  path = updatePage(path, PageId.make('root'), { content: 'Start with [[Basics]]; see also @[[Aside]].' });
  return updatePage(path, PageId.make('basics'), { content: 'As @[[Aside]] says.' });
}

describe('pages only cited', () => {
  it('are listed off the map with the pages that cite them', async () => {
    const user = userEvent.setup();
    renderWithLayers(<MapOrphans path={citedOnly()} selectedId={null} onSelect={() => {}} />);

    await user.click(screen.getByRole('button', { name: "1 page isn't on the map" }));

    expect(await screen.findByText('Aside')).toBeTruthy();
    expect(screen.getByText('Cited by Startups, Basics')).toBeTruthy();
  });
});
