import { describe, expect, it } from 'vitest';
import { PageId } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import { samplePath } from '@wisepath/domain/paths';
import { findInMap } from './PathMap.helpers';

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
