import type { Page, PageId, Project } from '@wisepath/domain/projects';
import { crossReferences, structureOf } from '@wisepath/domain/projects';

/**
 * Mind map layout
 * The root sits at the centre. Modules split into two columns, the first half
 * on the right (top to bottom) and the rest on the left (bottom to top), so
 * they read clockwise. Each module's topics stack on its outer side. Columns
 * bulge out in the middle like an ellipse around the root. Sizes are fixed so
 * lines can be drawn without measuring the DOM.
 */

export const ROOT_SIZE = 156;
export const MODULE = { w: 192, h: 58 };
/** Topics grow with their title up to `maxW`; `w` is only the spacing estimate's floor */
export const TOPIC = { w: 120, maxW: 230, h: 32 };
const TOPIC_STEP = TOPIC.h + 9;
const BLOCK_GAP = 26;
const RADIUS_X = 200;
const MIN_X = MODULE.w / 2 + 14;
const TOPIC_OFFSET = 34;

/** Rough rendered width of a topic pill, for the bounds and for arrows that end on its far side */
export const topicWidth = (title: string) => Math.min(TOPIC.maxW, Math.max(TOPIC.w, 46 + title.length * 6.9));

export interface Point {
  x: number;
  y: number;
}

export type Side = 1 | -1;

export interface PlacedModule {
  page: Page;
  at: Point;
  side: Side;
  /** `at` is the middle of the topic's inner end, the one facing its module */
  topics: { page: Page; at: Point }[];
}

export interface Line {
  key: string;
  d: string;
  from: PageId;
  to: PageId;
}

export interface MindLayout {
  root: { page: Page; at: Point };
  modules: PlacedModule[];
  /** Root to module, module to topic */
  tree: Line[];
  /** [[Link]] references that are not parent and child, drawn as arrows */
  cross: Line[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Centre of every page, for focusing the view */
  centres: Map<PageId, Point>;
}

const blockHeight = (topics: number) => Math.max(MODULE.h, topics * TOPIC_STEP - 9);

/** A horizontal S-curve: leaves and arrives level, like branches of a mind map */
const branch = (a: Point, b: Point) => {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
};

export function layoutMind(project: Project): MindLayout {
  const { root, modules } = structureOf(project);
  const half = Math.ceil(modules.length / 2);
  const columns: { side: Side; items: typeof modules }[] = [
    { side: 1, items: modules.slice(0, half) },
    { side: -1, items: modules.slice(half).reverse() },
  ];

  const placed = new Map<PageId, PlacedModule>();
  for (const { side, items } of columns) {
    const heights = items.map((m) => blockHeight(m.topics.length));
    const total = heights.reduce((a, h) => a + h, 0) + BLOCK_GAP * Math.max(items.length - 1, 0);
    const radiusY = Math.max(total / 2 + MODULE.h, ROOT_SIZE);
    let top = -total / 2;
    items.forEach((m, i) => {
      const y = top + heights[i] / 2;
      top += heights[i] + BLOCK_GAP;
      const bulge = Math.sqrt(Math.max(0, 1 - (y / radiusY) ** 2));
      const x = side * Math.max(MIN_X, RADIUS_X * bulge);
      const topicX = x + side * (MODULE.w / 2 + TOPIC_OFFSET);
      const firstY = y - ((m.topics.length - 1) * TOPIC_STEP) / 2;
      placed.set(m.page.id, {
        page: m.page,
        at: { x, y },
        side,
        topics: m.topics.map((t, j) => ({ page: t, at: { x: topicX, y: firstY + j * TOPIC_STEP } })),
      });
    });
  }

  // Keep the learner's module order for rendering and tab order
  const ordered = modules.map((m) => placed.get(m.page.id)!);
  const centres = new Map<PageId, Point>([[root.id, { x: 0, y: 0 }]]);
  const tree: Line[] = [];
  for (const m of ordered) {
    centres.set(m.page.id, m.at);
    const inner = { x: m.at.x - m.side * (MODULE.w / 2), y: m.at.y };
    const outer = { x: m.at.x + m.side * (MODULE.w / 2), y: m.at.y };
    // Leave the root's circle at the point facing the module
    const angle = Math.atan2(inner.y, inner.x);
    const start = { x: Math.cos(angle) * (ROOT_SIZE / 2), y: Math.sin(angle) * (ROOT_SIZE / 2) };
    tree.push({ key: `${root.id}-${m.page.id}`, d: branch(start, inner), from: root.id, to: m.page.id });
    for (const t of m.topics) {
      centres.set(t.page.id, { x: t.at.x + (m.side * topicWidth(t.page.title)) / 2, y: t.at.y });
      const end = t.at;
      tree.push({ key: `${m.page.id}-${t.page.id}`, d: branch(outer, end), from: m.page.id, to: t.page.id });
    }
  }

  // Cross references bow gently; one that would cross the root sweeps around it
  const titleOf = new Map(project.pages.map((p) => [p.id, p.title]));
  const sizeOf = (id: PageId) =>
    id === root.id ? null : placed.has(id) ? MODULE : { w: topicWidth(titleOf.get(id) ?? ''), h: TOPIC.h };
  const edgeToward = (id: PageId, toward: Point): Point => {
    const c = centres.get(id)!;
    const size = sizeOf(id);
    if (!size) {
      const a = Math.atan2(toward.y - c.y, toward.x - c.x);
      return { x: c.x + Math.cos(a) * (ROOT_SIZE / 2 + 4), y: c.y + Math.sin(a) * (ROOT_SIZE / 2 + 4) };
    }
    // Leave from the left or right end, or from the top or bottom when the other page is mostly above or below
    const dx = toward.x - c.x;
    const dy = toward.y - c.y;
    if (Math.abs(dy) * size.w > Math.abs(dx) * size.h * 3) return { x: c.x, y: c.y + Math.sign(dy) * (size.h / 2 + 4) };
    return { x: c.x + Math.sign(dx) * (size.w / 2 + 4), y: c.y };
  };
  const passesRoot = (a: Point, b: Point) => {
    const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
    const t = Math.max(0, Math.min(1, -(a.x * (b.x - a.x) + a.y * (b.y - a.y)) / len2));
    return Math.hypot(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)) < ROOT_SIZE / 2 + 50;
  };
  const cross: Line[] = crossReferences(project)
    .filter((r) => r.from !== root.id && r.to !== root.id && centres.has(r.from) && centres.has(r.to))
    .map((r) => {
      const a0 = centres.get(r.from)!;
      const b0 = centres.get(r.to)!;
      let c1: Point;
      let c2: Point;
      if (passesRoot(a0, b0)) {
        // Below the root when the pages sit lower, above otherwise
        const sweep = (a0.y + b0.y >= 0 ? 1 : -1) * (ROOT_SIZE / 2 + 70);
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
      return { key: `x-${r.from}-${r.to}`, d: `M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`, from: r.from, to: r.to };
    });

  const xs = [-ROOT_SIZE / 2, ROOT_SIZE / 2];
  const ys = [-ROOT_SIZE / 2, ROOT_SIZE / 2];
  for (const m of ordered) {
    xs.push(m.at.x - MODULE.w / 2, m.at.x + MODULE.w / 2);
    ys.push(m.at.y - MODULE.h / 2, m.at.y + MODULE.h / 2);
    for (const t of m.topics) {
      xs.push(t.at.x, t.at.x + m.side * topicWidth(t.page.title));
      ys.push(t.at.y - TOPIC.h / 2, t.at.y + TOPIC.h / 2);
    }
  }

  return {
    root: { page: root, at: { x: 0, y: 0 } },
    modules: ordered,
    tree,
    cross,
    bounds: { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) },
    centres,
  };
}
