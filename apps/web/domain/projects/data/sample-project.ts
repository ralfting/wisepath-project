import type { ChartPosition, Page, Project } from '../types/project.types';

/**
 * Sample project used until the projects API exists.
 * Flagged with isSample so the UI labels it as sample content.
 * Seeds are written as description plus links and turned into markdown pages.
 */

interface Resource {
  id: string;
  title: string;
  kind: 'video' | 'article' | 'note';
  url?: string;
  detail?: string;
}

interface SeedPage {
  id: string;
  title: string;
  description: string;
  resources: Resource[];
  position: ChartPosition;
  studiedAt: string | null;
}

const isYouTube = (url?: string) => !!url && /youtube\.com|youtu\.be/.test(url);

function toMarkdown(seed: SeedPage, next: string[]): string {
  const videos = seed.resources.filter((r) => isYouTube(r.url));
  const links = seed.resources.filter((r) => r.url && !isYouTube(r.url));
  const notes = seed.resources.filter((r) => !r.url);
  const parts = [seed.description];
  for (const video of videos) parts.push(/[?.!]$/.test(video.title) ? video.title : `${video.title}:`, video.url as string);
  if (links.length) {
    parts.push('## Resources', links.map((r) => `- [${r.title}](${r.url})${r.detail ? ` (${r.detail})` : ''}`).join('\n'));
  }
  if (notes.length) parts.push('## My notes', notes.map((r) => `- ${r.title}`).join('\n'));
  if (next.length) parts.push('## Next', next.map((title) => `- [[${title}]]`).join('\n'));
  return parts.join('\n\n');
}

function toPage(seed: SeedPage): Page {
  // Each seed connection becomes a [[link]] from the earlier page, which sets the top-down levels
  const next = seedConnections
    .filter((c) => c.from === seed.id)
    .map((c) => seedPages.find((p) => p.id === c.to)?.title)
    .filter((title): title is string => !!title);
  return {
    id: seed.id,
    title: seed.title,
    content: toMarkdown(seed, next),
    position: seed.position,
    studied: seed.studiedAt !== null,
    updatedAt: seed.studiedAt ?? '2026-09-20T12:00:00Z',
  };
}

const mdn = (path: string, title: string): Resource => ({
  id: path,
  title,
  kind: 'article',
  url: `https://developer.mozilla.org/en-US/docs/${path}`,
  detail: 'MDN',
});

const jsinfo = (slug: string, title: string): Resource => ({
  id: slug,
  title,
  kind: 'article',
  url: `https://javascript.info/${slug}`,
  detail: 'javascript.info',
});

const note = (id: string, title: string): Resource => ({ id, title, kind: 'note', detail: 'My notes' });

// A small path: five pages, two levels of links, two already studied
const seedPages: SeedPage[] = [
  {
    id: 'variables',
    title: 'Variables & Types',
    description:
      'let, const and the old var; the seven primitive types plus objects, and how typeof reports each of them.',
    resources: [
      mdn('Web/JavaScript/Guide/Grammar_and_types', 'Grammar and types'),
      jsinfo('types', 'Data types'),
      note('variables-note', 'Why I stopped using var'),
    ],
    position: { x: 0, y: 0 },
    studiedAt: '2026-09-01T19:00:00Z',
  },
  {
    id: 'functions',
    title: 'Functions',
    description:
      'Declarations, expressions and arrow functions; parameters, defaults and rest; functions as values you can pass around.',
    resources: [mdn('Web/JavaScript/Guide/Functions', 'Functions'), jsinfo('function-basics', 'Functions')],
    position: { x: 0, y: 0 },
    studiedAt: '2026-09-06T19:00:00Z',
  },
  {
    id: 'arrays',
    title: 'Arrays',
    description: 'Creating arrays, reading and writing by index, and the methods that loop over them.',
    resources: [jsinfo('array', 'Arrays'), jsinfo('array-methods', 'Array methods')],
    position: { x: 0, y: 0 },
    studiedAt: null,
  },
  {
    id: 'scope',
    title: 'Scope',
    description: 'Global, function and block scope; how the engine looks up a name through nested scopes.',
    resources: [mdn('Glossary/Scope', 'Scope')],
    position: { x: 0, y: 0 },
    studiedAt: null,
  },
  {
    id: 'closures',
    title: 'Closures',
    description: 'A function remembers the scope it was created in. Counters, private state and the classic loop bug.',
    resources: [
      jsinfo('closure', 'Variable scope, closure'),
      mdn('Web/JavaScript/Closures', 'Closures'),
      note('closures-note', 'The for-loop + setTimeout bug'),
    ],
    position: { x: 0, y: 0 },
    studiedAt: null,
  },
];

const seedConnections = [
  { from: 'variables', to: 'functions' },
  { from: 'variables', to: 'arrays' },
  { from: 'functions', to: 'scope' },
  { from: 'scope', to: 'closures' },
];

export const sampleProject: Project = {
  id: 'learn-javascript',
  title: 'Learn JavaScript',
  subject: 'JavaScript',
  startPageId: 'variables',
  isSample: true,
  pages: seedPages.map(toPage),
};

/** Looks up a project by id. Only the sample exists until the projects API lands. */
export function getSampleProject(projectId: string): Project | null {
  return projectId === sampleProject.id ? sampleProject : null;
}
