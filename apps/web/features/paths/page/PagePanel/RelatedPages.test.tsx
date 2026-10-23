import { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PageId, mapTree, moveBranch, relatedPages, samplePath } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import type { PathActions } from '@/useCases/paths';
import { renderWithLayers } from '@/test/render';
import { RelatedPages } from './RelatedPages';

/** The Related tab over a path that changes as the map's actions say, as the open map does */
function Related({ initial, pageId }: { initial: Path; pageId: string }) {
  const [path, setPath] = useState(initial);
  const page = path.pages.find((p) => p.id === pageId)!;
  const store = { moveBranch: (id: string, parentId: string) => setPath((p) => moveBranch(p, PageId.make(id), PageId.make(parentId))) } as unknown as PathActions; // only the action this tab calls
  return <RelatedPages path={path} page={page} tree={mapTree(path)} related={relatedPages(path, page.id)} store={store} onSelect={() => {}} />;
}

describe('where a page branches from', () => {
  it('moves the page under another one picked from the search', async () => {
    const user = userEvent.setup();
    renderWithLayers(<Related initial={samplePath} pageId="scopes" />);
    const parent = screen.getByRole('region', { name: /^Branches from/ });
    expect(within(parent).getByText('Providers')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Choose the page this one branches from' }));
    await user.type(await screen.findByRole('combobox', { name: 'Find a page' }), 'modules');
    await user.click(screen.getByRole('option', { name: 'Modules' }));

    expect(within(screen.getByRole('region', { name: /^Branches from/ })).getByText('Modules')).toBeTruthy();
  });

  it('offers no change on a path the learner only reads', () => {
    renderWithLayers(<Related initial={{ ...samplePath, access: 'viewer' }} pageId="scopes" />);
    expect(screen.getByRole('region', { name: /^Branches from/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Choose the page this one branches from' })).toBeNull();
  });
});
