import { describe, expect, it } from 'vitest';
import { PageId, mapTree, samplePath } from '@wisepath/domain/paths';
import type { Path } from '@wisepath/domain/paths';
import { layoutMind } from '../mindLayout';
import { READABLE_ZOOM, fitView, frameView, neighbourOf, zoomAround } from './MindMap.helpers';

const page = (id: string, title: string, content = '') => ({ id: PageId.make(id), title, content, studied: false, updatedAt: '' });
// Effect branches to A, B, C, D (alternating sides as the layout places them); A branches to A1 and A2
const path: Path = {
  ...samplePath,
  rootPageId: PageId.make('root'),
  pages: [
    page('root', 'Effect', '[[A]] [[B]] [[C]] [[D]]'),
    page('a', 'A', '[[A1]] [[A2]]'),
    page('b', 'B'),
    page('c', 'C'),
    page('d', 'D'),
    page('a1', 'A1'),
    page('a2', 'A2'),
  ],
};
const tree = mapTree(path);
const layout = layoutMind(tree);
const sideOf = (id: string) => layout.nodes.find((n) => n.page.id === id)!.side;
const outward = (id: string) => (sideOf(id) === 1 ? 'ArrowRight' : 'ArrowLeft');
const inward = (id: string) => (sideOf(id) === 1 ? 'ArrowLeft' : 'ArrowRight');

describe('neighbourOf', () => {
  it('goes outward to a branch, back in to its parent, and Home to the centre', () => {
    const fromRoot = neighbourOf(layout, tree, 'root', outward('a'));
    expect(fromRoot).not.toBeNull();
    expect(sideOf(fromRoot!)).toBe(sideOf('a'));
    expect(['a1', 'a2']).toContain(neighbourOf(layout, tree, 'a', outward('a')));
    expect(neighbourOf(layout, tree, 'a1', inward('a1'))).toBe('a');
    expect(neighbourOf(layout, tree, 'a1', 'Home')).toBe('root');
  });

  it('moves up and down among the pages on the same branch and side, and stops at the ends', () => {
    const down = neighbourOf(layout, tree, 'a1', 'ArrowDown') ?? neighbourOf(layout, tree, 'a1', 'ArrowUp');
    expect(down).toBe('a2');
    expect(neighbourOf(layout, tree, 'a2', 'ArrowDown') === null || neighbourOf(layout, tree, 'a2', 'ArrowUp') === null).toBe(true);
    expect(neighbourOf(layout, tree, 'root', 'ArrowUp')).toBeNull();
  });
});

describe('the view', () => {
  const bounds = { minX: -400, minY: -200, maxX: 400, maxY: 200 };

  it('fits the whole map, but opens readable around the root on a phone', () => {
    expect(fitView(bounds, 1600, 900).k).toBe(1);
    expect(fitView(bounds, 360, 640)).toEqual({ k: READABLE_ZOOM, x: 180, y: 320 });
  });

  it('zooms around a point, keeping it where it is', () => {
    const v = { x: 100, y: 50, k: 1 };
    const z = zoomAround(v, 2, { x: 300, y: 250 });
    // The map point under (300, 250) before is under it after
    expect([(300 - v.x) / v.k, (250 - v.y) / v.k]).toEqual([(300 - z.x) / z.k, (250 - z.y) / z.k]);
  });

  it('leaves the view alone when the page and its branch are in sight, else brings them in', () => {
    const v = { x: 400, y: 300, k: 1 };
    expect(frameView(v, { x: 0, y: 0 }, [{ x: 0, y: 0 }], 800, 600)).toBe(v);
    const moved = frameView(v, { x: 2000, y: 0 }, [{ x: 2000, y: 0 }], 800, 600);
    expect(moved.x + 2000 * moved.k).toBeCloseTo(400);
  });
});
