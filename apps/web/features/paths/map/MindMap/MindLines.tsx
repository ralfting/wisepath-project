import type { MapTree, Path } from '@wisepath/domain/paths';
import { lookOf } from '@wisepath/domain/paths';
import { shade } from '@/features/paths/path';
import { isGhost } from '../ghosts';
import type { MindLayout } from '../mindLayout';
import classes from './MindMap.module.css';

/** Room around the drawing, so line ends and arrowheads at its edge are not cut */
const PAD = 40;

/**
 * The map's lines, in three weights so the path reads first: each branch in its page's colour (thicker from the root,
 * thickest for the related link pointed at), the other [[links]] as blue arrows, and @[[citations]] as thin dashed grey
 * lines without a head; arrows and citations stay faint until they matter
 */
export function MindLines({
  path,
  tree,
  layout,
  dimmed,
  isPointedLink,
  arrowActive,
}: {
  path: Path;
  tree: MapTree;
  layout: MindLayout;
  dimmed: (id: string) => boolean;
  isPointedLink: (from: string, to: string) => boolean;
  arrowActive: (from: string, to: string) => boolean;
}) {
  const { minX, minY, maxX, maxY } = layout.bounds;
  const rootId = tree.root.page.id;
  return (
    <svg
      className={classes.lines}
      style={{ left: minX - PAD, top: minY - PAD }}
      width={maxX - minX + PAD * 2}
      height={maxY - minY + PAD * 2}
      viewBox={`${minX - PAD} ${minY - PAD} ${maxX - minX + PAD * 2} ${maxY - minY + PAD * 2}`}
      aria-hidden="true"
    >
      <defs>
        <marker id="wp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--mantine-color-blue-6)" />
        </marker>
      </defs>
      {layout.branches.map((line) => (
        <path
          key={line.key}
          d={line.d}
          fill="none"
          stroke={shade(lookOf(path, line.to, tree).color, isPointedLink(line.from, line.to) ? 6 : line.from === rootId ? 4 : 3)}
          strokeWidth={isPointedLink(line.from, line.to) ? 3.4 : line.from === rootId ? 2.4 : 1.6}
          // A line to a page not made yet is dashed and faint, like the page
          strokeDasharray={isGhost(line.to) ? '4 4' : undefined}
          opacity={dimmed(line.to) ? 0.25 : isGhost(line.to) ? 0.5 : 0.9}
        />
      ))}
      {layout.citations.map((line) => (
        <path
          key={line.key}
          d={line.d}
          fill="none"
          stroke="var(--mantine-color-dimmed)"
          strokeWidth={isPointedLink(line.from, line.to) ? 2.4 : arrowActive(line.from, line.to) ? 1.6 : 1.1}
          strokeDasharray="5 4"
          strokeLinecap="round"
          opacity={arrowActive(line.from, line.to) ? 0.85 : 0.12}
        />
      ))}
      {layout.arrows.map((line) => (
        <path
          key={line.key}
          d={line.d}
          fill="none"
          stroke="var(--mantine-color-blue-6)"
          strokeWidth={isPointedLink(line.from, line.to) ? 3.2 : arrowActive(line.from, line.to) ? 2.6 : 1.4}
          strokeLinecap="round"
          markerEnd="url(#wp-arrow)"
          opacity={arrowActive(line.from, line.to) ? 0.95 : 0.16}
        />
      ))}
    </svg>
  );
}
