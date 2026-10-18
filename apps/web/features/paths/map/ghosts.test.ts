import { describe, expect, it } from 'vitest';
import { PageId, PathId, mapTree } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import { ghostTitle, isGhost, withGhosts } from './ghosts';

const page = (id: string, title: string, content = '') => ({ id: PageId.make(id), title, content, studied: false, updatedAt: '' });
const path: Path = {
  id: PathId.make('rust'),
  title: 'Rust',
  kind: 'study',
  rootPageId: PageId.make('root'),
  visibility: 'private',
  access: 'owner',
  pages: [page('root', 'Rust', 'Start with [[Ownership]] and [[Borrowing]]'), page('own', 'Ownership', 'Then [[Lifetimes]]')],
};

describe('withGhosts', () => {
  it('draws each page named but not made after the real pages that branch from the same page', () => {
    const drawn = withGhosts(path, mapTree(path));
    const titles = (id: string) => drawn.nodes.get(PageId.make(id))?.children.map((c) => [c.page.title, isGhost(c.page.id)]);
    expect(titles('root')).toEqual([
      ['Ownership', false],
      ['Borrowing', true],
    ]);
    expect(titles('own')).toEqual([['Lifetimes', true]]);
    const [, borrowing] = drawn.root.children;
    expect(ghostTitle(borrowing.page.id)).toBe('Borrowing');
    // The real tree is left as it was: counts and progress read it
    expect(mapTree(path).root.children.map((c) => c.page.title)).toEqual(['Ownership']);
  });

  it('draws none for someone who may only read the path', () => {
    const read = { ...path, access: 'viewer' as const };
    expect(withGhosts(read, mapTree(read)).root.children.map((c) => c.page.title)).toEqual(['Ownership']);
  });
});
