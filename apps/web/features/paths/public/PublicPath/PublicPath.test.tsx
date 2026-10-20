import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Layer } from 'effect';
import { PageId, PathId } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { MemoryPathSharing } from '@/infrastructure/paths/MemoryPathSharing';
import { renderWithLayers } from '@/test/render';
import { PublicPath } from './PublicPath';

// Next's router is the one dependency here that isn't a domain service
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const page = (title: string, content: string) => ({ id: PageId.make(title.toLowerCase()), title, content, studied: false, updatedAt: '' });
const path: Path = {
  id: PathId.make('react'),
  title: 'React',
  kind: 'learningPath',
  pages: [page('React', '[[Hooks]] [[Tests]]'), page('Hooks', 'A hook keeps state between renders.'), page('Tests', 'Render, act, assert.')],
  rootPageId: PageId.make('react'),
  visibility: 'public',
  access: 'viewer',
};

describe('PublicPath', () => {
  it('reads the path page by page from the pager under the text, in map order', async () => {
    const user = userEvent.setup();
    renderWithLayers(<PublicPath path={path} />, Layer.mergeAll(MemoryAuth(), MemoryPathSharing({ publicPaths: [path] })));
    await user.click(screen.getByRole('radio', { name: 'List' }));

    await user.click(screen.getByRole('button', { name: /Next.*Hooks/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Hooks' })).toBeTruthy();
    expect(await screen.findByText('A hook keeps state between renders.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Next.*Tests/ }));
    await user.click(screen.getByRole('button', { name: /Previous.*Hooks/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Hooks' })).toBeTruthy();
  });
});
