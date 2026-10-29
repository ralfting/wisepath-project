import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageId, samplePath, updatePage } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import type { PathActions, SaveState } from '@/useCases/paths';
import { renderWithLayers } from '@/test/render';
import { PagePanel } from './PagePanel';

const store: PathActions = {
  updatePage: vi.fn(),
  writeNote: vi.fn(),
  removeNote: vi.fn(),
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
};

const saved: SaveState = { status: 'saved', notice: null };

/** The sample map as a learning path whose root and Fundamentals branch are studied: Modules is the first page left */
const learningPath: Path = updatePage({ ...samplePath, kind: 'learningPath' }, samplePath.rootPageId, { studied: true });

/** The drawer's panel on one page, switching to the page it is asked to open, as the drawer does */
function Drawer({ path, pageId, save = saved }: { path: Path; pageId: string; save?: SaveState }) {
  const [open, setOpen] = useState(pageId);
  const page = path.pages.find((p) => p.id === open)!;
  return <PagePanel path={path} page={page} store={store} save={save} onSelect={setOpen} flat />;
}

describe('the drawer header', () => {
  it("shows whether the page's edits are saved, from the path's save state", () => {
    const { rerender } = renderWithLayers(<Drawer path={learningPath} pageId="modules" />);
    expect(screen.getByRole('status').textContent).toBe('Saved');

    rerender(<Drawer path={learningPath} pageId="modules" save={{ status: 'saving', notice: null }} />);
    expect(screen.getByRole('status').textContent).toBe('Saving…');

    rerender(<Drawer path={learningPath} pageId="modules" save={{ status: 'offline', notice: null }} />);
    expect(screen.getByRole('status').textContent).toBe('Offline · retrying');
  });

  it('offers a studied page of a learning path the first page not studied yet, and opens it there', async () => {
    const user = userEvent.setup();
    renderWithLayers(<Drawer path={learningPath} pageId="cli-and-commands" />);

    await user.click(screen.getByRole('button', { name: 'Next: Modules' }));

    expect(screen.getByDisplayValue('Modules')).toBeTruthy();
    // Modules is not studied yet: nothing to move on to until it is
    expect(screen.queryByRole('button', { name: /^Next:/ })).toBeNull();
  });

  it('offers no next page in a study, nor once every page is studied', () => {
    const { rerender } = renderWithLayers(<Drawer path={{ ...learningPath, kind: 'study' }} pageId="cli-and-commands" />);
    expect(screen.queryByRole('button', { name: /^Next:/ })).toBeNull();

    const allStudied = learningPath.pages.reduce((path, page) => updatePage(path, PageId.make(page.id), { studied: true }), learningPath);
    rerender(<Drawer path={allStudied} pageId="cli-and-commands" />);
    expect(screen.queryByRole('button', { name: /^Next:/ })).toBeNull();
  });
});
