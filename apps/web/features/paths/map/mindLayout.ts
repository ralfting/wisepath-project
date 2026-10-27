import type { MapNode, MapTree, Page, PageId } from '@wisepath/domain/paths';

/**
 * Mind map layout
 * The root sits at the centre. Its branches split into two columns, the first
 * half on the right (top to bottom) and the rest on the left (bottom to top),
 * so they read clockwise. Each deeper level is a column further out on the
 * same side, children stacked around their parent. The first column bulges
 * out in the middle like an ellipse around the root. Sizes are estimated
 * from titles so lines can be drawn without measuring the DOM.
 */

const NODE_H = 32;
const MODULE_H = 58;
/** Height a second line of title adds */
const NODE_LINE = 17;
const MODULE_LINE = 18;
const SIBLING_GAP = 9;
const BLOCK_GAP = 26;
const COLUMN_GAP = 32;
const RADIUS_X = 196;

export interface Point {
  x: number;
  y: number;
}

export type Side = 1 | -1;

export interface PlacedNode {
  page: Page;
  depth: number;
  side: Side;
  module: boolean;
  /** Has branches below it, so it shows a counter */
  branches: number;
  /** Middle of the end facing the root */
  inner: Point;
  w: number;
  h: number;
  /** Lines the title takes: a title too long for one line wraps onto a second */
  lines: 1 | 2;
}

export interface Line {
  key: string;
  d: string;
  from: PageId;
  to: PageId;
}

export interface MindLayout {
  nodes: PlacedNode[];
  /** A branch from each page to the pages it reached first */
  branches: Line[];
  /** The tree's arrows: other [[links]] between pages on the map */
  arrows: Line[];
  /** The tree's citations: @[[citations]] between pages on the map, drawn the way arrows are */
  citations: Line[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Centre of every page on the map, for focusing the view */
  centres: Map<PageId, Point>;
}

/**
 * Rough rendered size of a node, from its title. Up to a maximum width the
 * node grows with its title; past it the title wraps onto a second line.
 */
export function nodeSize(
  title: string,
  module: boolean,
  hasCounter: boolean,
  hasActivities = false,
): { w: number; h: number; lines: 1 | 2 } {
  // Icon, padding and the studied check on a module; status icon, padding and counter chip on a page; either's activity badge
  const counter = hasCounter && !module ? 50 : 0;
  const badge = hasActivities ? 22 : 0;
  const [min, max, chrome, perChar] = module ? [170, 280, 118 + badge, 8.8] : [112, 270, 50 + counter + badge, 7.3];
  const oneLine = chrome + title.length * perChar;
  const lines = oneLine > max ? 2 : 1;
  const base = module ? MODULE_H : NODE_H;
  const extra = module ? MODULE_LINE : NODE_LINE;
  return { w: Math.min(max, Math.max(min, oneLine)), h: base + (lines - 1) * extra, lines };
}

/** The root's box: a card with the progress ring and icon, then the title */
export interface RootShape {
  w: number;
  h: number;
  /** Lines the title takes */
  lines: number;
}

/** Rough rendered size of the root, from its title: up to three lines of it at 18px bold, and the count under it */
export function rootShape(title: string): RootShape {
  const text = title.length * 10.5;
  const lines = Math.min(3, Math.max(1, Math.ceil(text / 210)));
  return { w: Math.max(230, 18 + 64 + 16 + Math.min(210, text) + 22), h: Math.max(96, 32 + lines * 22 + 22), lines };
}

/** Where a branch leaves the root toward a point: on the edge of its box */
const rootEdge = (root: RootShape, toward: Point): Point => {
  const angle = Math.atan2(toward.y, toward.x);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const scale = Math.min(root.w / 2 / Math.abs(cos || 1e-9), root.h / 2 / Math.abs(sin || 1e-9));
  return { x: cos * scale, y: sin * scale };
};

/** A horizontal S-curve: leaves and arrives level, like branches of a mind map */
const curve = (a: Point, b: Point) => {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
};

const centreOf = (n: PlacedNode): Point => ({ x: n.inner.x + (n.side * n.w) / 2, y: n.inner.y });
const outerOf = (n: PlacedNode): Point => ({ x: n.inner.x + n.side * n.w, y: n.inner.y });

/** `withActivities`: the pages that show an activity badge after their title, which takes room */
export function layoutMind(
  tree: MapTree,
  root: RootShape = rootShape(tree.root.page.title),
  withActivities: ReadonlySet<string> = new Set(),
): MindLayout {
  const minX = root.w / 2 + 40;
  const radiusX = Math.max(RADIUS_X, root.w / 2 + 118);
  const reach = Math.max(root.w, root.h) / 2;
  const sizes = new Map<PageId, { w: number; h: number; lines: 1 | 2 }>();
  const heights = new Map<PageId, number>();
  const measure = (node: MapNode): number => {
    const size = nodeSize(node.page.title, !!node.page.module, node.children.length > 0, withActivities.has(node.page.id));
    sizes.set(node.page.id, size);
    const kids = node.children.map(measure);
    const stacked = kids.reduce((a, h) => a + h, 0) + SIBLING_GAP * Math.max(kids.length - 1, 0);
    const height = Math.max(size.h, stacked);
    heights.set(node.page.id, height);
    return height;
  };
  tree.root.children.forEach(measure);

  const nodes: PlacedNode[] = [];
  const branches: Line[] = [];

  /** Widest node per depth within one first-level branch, so its columns line up */
  const columnWidths = (top: MapNode) => {
    const widths: number[] = [];
    const walk = (n: MapNode) => {
      widths[n.depth] = Math.max(widths[n.depth] ?? 0, sizes.get(n.page.id)!.w);
      n.children.forEach(walk);
    };
    walk(top);
    return widths;
  };

  const place = (node: MapNode, inner: Point, side: Side, widths: number[]): PlacedNode => {
    const size = sizes.get(node.page.id)!;
    const placed: PlacedNode = {
      page: node.page,
      depth: node.depth,
      side,
      module: !!node.page.module,
      branches: node.children.length,
      inner,
      ...size,
    };
    nodes.push(placed);
    const childX = inner.x + side * (widths[node.depth] + COLUMN_GAP);
    const total =
      node.children.reduce((a, c) => a + heights.get(c.page.id)!, 0) + SIBLING_GAP * Math.max(node.children.length - 1, 0);
    let top = inner.y - total / 2;
    for (const child of node.children) {
      const h = heights.get(child.page.id)!;
      const placedChild = place(child, { x: childX, y: top + h / 2 }, side, widths);
      top += h + SIBLING_GAP;
      branches.push({ key: `${node.page.id}-${child.page.id}`, d: curve(outerOf(placed), placedChild.inner), from: node.page.id, to: child.page.id });
    }
    return placed;
  };

  const firstLevel = tree.root.children;
  const half = Math.ceil(firstLevel.length / 2);
  const columns: { side: Side; items: ReadonlyArray<MapNode> }[] = [
    { side: 1, items: firstLevel.slice(0, half) },
    { side: -1, items: firstLevel.slice(half).reverse() },
  ];
  for (const { side, items } of columns) {
    const blocks = items.map((m) => heights.get(m.page.id)!);
    const total = blocks.reduce((a, h) => a + h, 0) + BLOCK_GAP * Math.max(items.length - 1, 0);
    const radiusY = Math.max(total / 2 + 60, root.h);
    let top = -total / 2;
    items.forEach((m, i) => {
      const y = top + blocks[i] / 2;
      top += blocks[i] + BLOCK_GAP;
      const bulge = Math.sqrt(Math.max(0, 1 - (y / radiusY) ** 2));
      const x = side * Math.max(minX, radiusX * bulge);
      const placed = place(m, { x, y }, side, columnWidths(m));
      // Leave the root at the point facing the branch
      const start = rootEdge(root, { x, y });
      branches.push({ key: `${tree.root.page.id}-${m.page.id}`, d: curve(start, placed.inner), from: tree.root.page.id, to: m.page.id });
    });
  }

  const byId = new Map(nodes.map((n) => [n.page.id, n]));
  const centres = new Map<PageId, Point>([[tree.root.page.id, { x: 0, y: 0 }]]);
  for (const n of nodes) centres.set(n.page.id, centreOf(n));

  // Arrows and citations bow gently; one that would cross the root sweeps around it
  const edgeToward = (id: PageId, toward: Point): Point => {
    // The root is not among the placed pages: a citation to or from it leaves its box facing the other end
    if (id === tree.root.page.id) return rootEdge(root, toward);
    const n = byId.get(id)!;
    const c = centreOf(n);
    const dx = toward.x - c.x;
    const dy = toward.y - c.y;
    // Leave from the top or bottom when the other end is mostly above or below, else from an end
    if (Math.abs(dy) * n.w > Math.abs(dx) * n.h * 3) return { x: c.x, y: c.y + Math.sign(dy) * (n.h / 2 + 4) };
    return { x: c.x + Math.sign(dx) * (n.w / 2 + 4), y: c.y };
  };
  const passesRoot = (a: Point, b: Point) => {
    const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
    const t = Math.max(0, Math.min(1, -(a.x * (b.x - a.x) + a.y * (b.y - a.y)) / len2));
    return Math.hypot(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)) < reach + 50;
  };
  const across = (pairs: MapTree['arrows'], prefix: string): Line[] =>
    pairs
      .filter((r) => centres.has(r.from) && centres.has(r.to))
      .map((r) => {
        const a0 = centres.get(r.from)!;
        const b0 = centres.get(r.to)!;
        let c1: Point;
        let c2: Point;
        if (r.from !== tree.root.page.id && r.to !== tree.root.page.id && passesRoot(a0, b0)) {
          // Below the root when the pages sit lower, above otherwise
          const sweep = (a0.y + b0.y >= 0 ? 1 : -1) * (reach + 70);
          c1 = { x: a0.x * 0.45, y: sweep };
          c2 = { x: b0.x * 0.45, y: sweep };
        } else {
          const bow = 0.18;
          const nx = -(b0.y - a0.y) * bow;
          const ny = (b0.x - a0.x) * bow;
          c1 = { x: a0.x + (b0.x - a0.x) / 3 + nx, y: a0.y + (b0.y - a0.y) / 3 + ny };
          c2 = { x: a0.x + ((b0.x - a0.x) * 2) / 3 + nx, y: a0.y + ((b0.y - a0.y) * 2) / 3 + ny };
        }
        const a = edgeToward(r.from, c1);
        const b = edgeToward(r.to, c2);
        return { key: `${prefix}-${r.from}-${r.to}`, d: `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`, from: r.from, to: r.to };
      });

  const xs = [-root.w / 2, root.w / 2];
  const ys = [-root.h / 2, root.h / 2];
  for (const n of nodes) {
    xs.push(n.inner.x, n.inner.x + n.side * n.w);
    ys.push(n.inner.y - n.h / 2, n.inner.y + n.h / 2);
  }

  return {
    nodes,
    branches,
    arrows: across(tree.arrows, 'x'),
    citations: across(tree.citations, 'c'),
    bounds: { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) },
    centres,
  };
}
