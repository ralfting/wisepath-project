import { describe, expect, it } from 'vitest';
import { PageId } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import { samplePath, updatePage } from '@wisepath/domain/paths';
import { drawnAlike, findInMap } from './PathMap.helpers';

const page = (id: string, title: string, content = '') => ({ id: PageId.make(id), title, content, studied: false, updatedAt: '' });
// root links Fibers, which links Fiber pools; Scheduling fibers is linked from nowhere
const path: Path = {
  ...samplePath,
  rootPageId: PageId.make('root'),
  pages: [page('root', 'Effect', '[[Fibers]]'), page('orphan', 'Scheduling fibers'), page('fibers', 'Fibers', '[[Fiber pools]]'), page('pools', 'Fiber pools')],
};

describe('findInMap', () => {
  it('marks the pages whose title matches, listed in reading order with the pages off the map last', () => {
    const { ids, results } = findInMap(path, ' FIBER ');
    expect([...(ids ?? [])].sort()).toEqual(['fibers', 'orphan', 'pools']);
    expect(results.map((p) => p.title)).toEqual(['Fibers', 'Fiber pools', 'Scheduling fibers']);
  });

  it('marks nothing while nothing is typed', () => {
    expect(findInMap(path, '   ')).toEqual({ ids: null, results: [] });
  });
});

describe('drawnAlike', () => {
  const fibers = PageId.make('fibers');

  it('draws the map the same while words are typed in a page, around its links', () => {
    expect(drawnAlike(path, updatePage(path, fibers, { content: 'Cheap threads: [[Fiber pools]] reuse them' }))).toBe(true);
  });

  it('draws it again for a link, citation or activity written in a page, and for a new title or studied mark', () => {
    const edits = [
      updatePage(path, fibers, { content: '[[Fiber pools]] [[Scheduling fibers]]' }),
      updatePage(path, fibers, { content: '[[Fiber pools]] @[[Scheduling fibers]]' }),
      updatePage(path, fibers, { content: '[[Fiber pools]]\n\n> [!activity]\n> Fork two fibers.' }),
      updatePage(path, fibers, { title: 'Fibres' }),
      updatePage(path, fibers, { studied: true }),
    ];
    expect(edits.map((edited) => drawnAlike(path, edited))).toEqual([false, false, false, false, false]);
  });
});
