'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@mantine/hooks';
import classes from './SelectionBeam.module.css';

/**
 * SelectionBeam
 * When a page opens beside the map, a line runs for a moment from its node to
 * the drawer and fades: the eye follows it across, instead of having to find
 * where the page went. Drawn once the map has finished moving to the node.
 */

/** The map's pan (MindMap.module.css) and the drawer's entrance, so both have landed */
const SETTLE_MS = 360;
/** How long the line stays: drawn, held, faded (SelectionBeam.module.css) */
const SHOW_MS = 900;

export function SelectionBeam({ selectedId }: { selectedId: string | null }) {
  const reduceMotion = useReducedMotion();
  const [beam, setBeam] = useState<{ d: string; key: number } | null>(null);
  const count = useRef(0);

  useEffect(() => {
    if (!selectedId || reduceMotion) return;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = setTimeout(() => {
      const node = document.querySelector(`[data-page-id="${selectedId}"]`)?.getBoundingClientRect();
      const drawer = document.querySelector('.mantine-Drawer-content')?.getBoundingClientRect();
      // Nothing to join: the node is off screen, or the drawer covers the window
      if (!node || !drawer || node.right > drawer.left || node.width === 0 || drawer.left < 120) return;
      const a = { x: node.right + 4, y: node.top + node.height / 2 };
      // Arrives beside the page's title, near the drawer's top
      const b = { x: drawer.left - 2, y: drawer.top + 110 };
      const mx = (a.x + b.x) / 2;
      count.current += 1;
      setBeam({ d: `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`, key: count.current });
      hide = setTimeout(() => setBeam(null), SHOW_MS);
    }, SETTLE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      setBeam(null);
    };
  }, [selectedId, reduceMotion]);

  if (!beam) return null;
  return createPortal(
    <svg key={beam.key} className={classes.beam} aria-hidden="true">
      <path d={beam.d} pathLength={1} className={classes.line} />
    </svg>,
    document.body,
  );
}
