import { describe, expect, it } from 'vitest';
import { PageId, PathId } from '@wisepath/domain/paths';
import type { SearchHit } from '@wisepath/domain/search';
import type { RecentPage } from '@/useCases/search';
import { searchRows } from './SearchPalette.helpers';

const recent = (pathId: string, title: string): RecentPage => ({ pathId, pageId: `${pathId}-page`, title, pathTitle: `Old ${pathId}`, openedAt: 0 });
const hit = (title: string, where: ReadonlyArray<string>): SearchHit => ({
  pathId: PathId.make('rust'),
  pageId: PageId.make(title.toLowerCase()),
  title,
  pathTitle: 'Rust',
  where,
  updatedAt: '2026-10-17T10:00:00Z',
  excerpt: null,
});

describe('searchRows', () => {
  it("lists the search's hits with where they sit and the matched part of the title", () => {
    const [row] = searchRows({ status: 'ready', query: 'own', hits: [hit('Ownership', ['Memory'])], stale: false }, [], null);
    expect(row.where).toBe('Rust › Memory');
    expect(row.titleMarks.length).toBeGreaterThan(0);
  });

  it('offers recent pages when nothing is typed, dropping deleted paths and showing renamed ones by their new title', () => {
    const rows = searchRows({ status: 'idle' }, [recent('rust', 'Traits'), recent('gone', 'Lost page')], [{ id: 'rust', title: 'Rust, renamed' }]);
    expect(rows.map((r) => [r.title, r.where])).toEqual([['Traits', 'Rust, renamed']]);
  });

  it('shows nothing while loading or when search is unavailable', () => {
    expect(searchRows({ status: 'loading' }, [recent('rust', 'Traits')], null)).toEqual([]);
    expect(searchRows({ status: 'unavailable' }, [recent('rust', 'Traits')], null)).toEqual([]);
  });
});
