import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from 'd3-force';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import type { PageId, Project } from '@wisepath/domain/projects';
import { computeLevels, references } from '@wisepath/domain/projects';

/** A point on the chart, in chart units */
export interface ChartPosition {
  x: number;
  y: number;
}

/**
 * Graph layout
 * An Obsidian-style force layout with gravity: the start page is pinned at the
 * top, every other page is pulled softly toward its depth (link steps from the
 * start) while links act as springs and pages push each other apart. Related
 * pages cluster, and the chart flows downward as links are added.
 * The result is deterministic and starts from the previous positions, so
 * adding a page moves its neighbours a little instead of reshuffling the sky.
 */

export const DEPTH_GAP = 105;

interface Node extends SimulationNodeDatum {
  id: string;
  depth: number | null;
  radius: number;
  /** Width of the star's label box, in chart units at the usual viewing zoom */
  labelWidth: number;
}

const LABEL_HEIGHT = 46;

/**
 * Keeps label boxes from overlapping: labels are wide, so overlapping pairs
 * are pushed apart sideways (depth gravity already holds them vertically).
 */
function forceLabelBoxes() {
  let nodes: Node[] = [];
  const force = (alpha: number) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const overlapX = (a.labelWidth + b.labelWidth) / 2 - Math.abs(dx);
        const overlapY = LABEL_HEIGHT - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        const push = overlapX * 0.5 * Math.min(1, alpha * 4);
        const dir = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx);
        const aFixed = a.fx != null;
        const bFixed = b.fx != null;
        if (!aFixed) a.x = (a.x ?? 0) - dir * push * (bFixed ? 2 : 1);
        if (!bFixed) b.x = (b.x ?? 0) + dir * push * (aFixed ? 2 : 1);
      }
    }
  };
  force.initialize = (n: Node[]) => {
    nodes = n;
  };
  return force;
}

export interface GraphLayout {
  positions: Map<string, ChartPosition>;
  depthOf: Map<string, number>;
  /** Pages the start page does not reach */
  apart: string[];
  /** Deepest y of the pages the start page reaches */
  bottomY: number;
}

function seededRandom(seed: number) {
  let h = seed >>> 0 || 1;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** A key that changes only when the shape of the graph changes (pages or links) */
export function graphKey(project: Project): string {
  const refs = references(project)
    .map((r) => `${r.from}>${r.to}`)
    .sort()
    .join(',');
  return `${project.startPageId ?? ''}|${project.pages.map((p) => p.id).sort().join(',')}|${refs}`;
}

export function layoutGraph(project: Project, previous?: Map<string, ChartPosition>): GraphLayout {
  const { levelOf, apart } = computeLevels(project);
  const refs = references(project);
  const titleOf = new Map(project.pages.map((p) => [p.id, p.title]));

  // Room for the italic label under each star
  // Initial positions: the previous layout where known, else under the page that links it
  const placed = new Map<string, ChartPosition>();
  const nodes: Node[] = project.pages.map((page, i) => {
    const depth = levelOf.has(page.id) ? (levelOf.get(page.id) as number) - 1 : null;
    const prev = previous?.get(page.id);
    let x: number;
    let y: number;
    if (prev) {
      ({ x, y } = prev);
    } else if (depth !== null) {
      const parent = refs.find((r) => r.to === page.id && placed.has(r.from));
      const base = parent ? placed.get(parent.from)! : { x: 0, y: 0 };
      x = base.x + ((i % 5) - 2) * 40;
      y = depth * DEPTH_GAP;
    } else {
      x = 260 + (i % 3) * 50;
      y = -40 + (i % 4) * 60;
    }
    placed.set(page.id, { x, y });
    const labelWidth = (titleOf.get(page.id)?.length ?? 12) * 9.6 + 44;
    return { id: page.id, depth, radius: 30, labelWidth, x, y };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const start = project.startPageId ? byId.get(project.startPageId) : undefined;
  if (start) {
    start.fx = 0;
    start.fy = 0;
  }

  const links: SimulationLinkDatum<Node>[] = refs.map((r) => ({ source: r.from, target: r.to }));
  const maxDepth = Math.max(0, ...nodes.map((n) => n.depth ?? 0));

  const simulation = forceSimulation(nodes)
    .randomSource(seededRandom(nodes.length * 7919 + links.length))
    .force(
      'link',
      forceLink<Node, SimulationLinkDatum<Node>>(links)
        .id((n) => n.id)
        .distance(DEPTH_GAP * 1.1)
        .strength(0.25),
    )
    .force('charge', forceManyBody<Node>().strength(-520).distanceMax(600))
    .force('collide', forceCollide<Node>(30).strength(0.8))
    .force('labels', forceLabelBoxes())
    // Gravity toward each page's depth; pages not reached float apart near the top right
    .force(
      'depth',
      forceY<Node>((n) => (n.depth === null ? 60 : n.depth * DEPTH_GAP)).strength((n) => (n.depth === null ? 0.08 : 0.7)),
    )
    .force(
      'centre',
      forceX<Node>((n) => (n.depth === null ? 140 + maxDepth * 40 : 0)).strength((n) => (n.depth === null ? 0.08 : 0.02)),
    )
    .stop();

  // Warm starts settle quickly; a first layout gets more time
  const ticks = previous && previous.size ? 160 : 320;
  for (let i = 0; i < ticks; i++) simulation.tick();

  // Pages set apart sit right of everything reached, not over it
  const reached = nodes.filter((n) => n.depth !== null);
  const rightEdge = reached.length ? Math.max(...reached.map((n) => (n.x ?? 0) + n.labelWidth / 2)) : 0;
  const apartNodes = nodes.filter((n) => n.depth === null);
  const apartLeft = Math.min(...apartNodes.map((n) => (n.x ?? 0) - n.labelWidth / 2), Infinity);
  const shift = apartNodes.length && apartLeft < rightEdge + 90 ? rightEdge + 90 - apartLeft : 0;

  const positions = new Map<string, ChartPosition>();
  for (const n of nodes) {
    positions.set(n.id, { x: Math.round((n.x ?? 0) + (n.depth === null ? shift : 0)), y: Math.round(n.y ?? 0) });
  }

  const depthOf = new Map<string, number>();
  levelOf.forEach((level, id) => depthOf.set(id, level - 1));
  const bottomY = reached.length ? Math.max(...reached.map((n) => n.y ?? 0)) : 0;
  return { positions, depthOf, apart, bottomY };
}
