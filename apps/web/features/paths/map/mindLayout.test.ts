import { describe, expect, it } from 'vitest';
import { PageId, PathId, createPage, mapTree, newPath, updatePage } from '@wisepath/domain/paths';
import { layoutMind } from './mindLayout';

/** Startups: the root links Basics and Pricing and cites Market, which Basics links; Pricing cites Market too */
function startups() {
  let path = newPath(PathId.make('p'), 'Startups', PageId.make('root'));
  for (const title of ['Basics', 'Pricing', 'Market']) path = createPage(path, title, PageId.make(title.toLowerCase())).path;
  path = updatePage(path, PageId.make('root'), { content: 'As in @[[Market]], start with [[Basics]] and [[Pricing]].' });
  path = updatePage(path, PageId.make('basics'), { content: '[[Market]] next; compare with [[Pricing]].' });
  return updatePage(path, PageId.make('pricing'), { content: 'Next: @[[Market]]' });
}

describe('the map layout', () => {
  it('draws every citation between pages on the map, the root included, apart from the arrows', () => {
    const layout = layoutMind(mapTree(startups()));
    expect(layout.citations.map((line) => `${line.from} > ${line.to}`)).toEqual(['root > market', 'pricing > market']);
    expect(layout.arrows.map((line) => `${line.from} > ${line.to}`)).toEqual(['basics > pricing']);
    expect(layout.citations.every((line) => !line.d.includes('NaN'))).toBe(true);
  });
});
