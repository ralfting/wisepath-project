import type { CSSProperties } from 'react';
import type { PageColor } from '@wisepath/domain/paths';
import { shade } from '@/features/paths/path';
import type { PlacedNode, RootShape } from '../mindLayout';

const tints = (color: PageColor) => ({
  '--c0': shade(color, 0),
  '--c1': shade(color, 1),
  '--c2': shade(color, 2),
  '--c3': shade(color, 3),
  '--c6': shade(color, 6),
});

/** Absolute position of a node: it grows away from the root, from its inner end */
export function place(n: PlacedNode, color: PageColor): CSSProperties {
  return {
    left: n.side === 1 ? n.inner.x : n.inner.x - n.w,
    top: n.inner.y - n.h / 2,
    width: n.w,
    height: n.h,
    '--lines': n.lines,
    ...tints(color),
  } as CSSProperties;
}

export function placeBox(shape: RootShape, color: PageColor): CSSProperties {
  return { left: -shape.w / 2, top: -shape.h / 2, width: shape.w, height: shape.h, ...tints(color) } as CSSProperties;
}
