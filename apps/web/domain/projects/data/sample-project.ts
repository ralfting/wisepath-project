import type { ChartPosition, Page, Project } from '../types/project.types';
import { makeConnection } from '../entities/project.entity';

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

const COL = 140;

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
    position: { x: 0, y: 300 },
    studiedAt: '2026-09-01T19:00:00Z',
  },
  {
    id: 'operators',
    title: 'Operators',
    description: 'Arithmetic, comparison and logical operators, and the difference between == and ===.',
    resources: [jsinfo('operators', 'Basic operators, maths')],
    position: { x: 0, y: 450 },
    studiedAt: '2026-09-02T19:00:00Z',
  },
  {
    id: 'control-flow',
    title: 'Control Flow',
    description: 'if/else, switch, loops, and how break and continue change them.',
    resources: [
      mdn('Web/JavaScript/Guide/Control_flow_and_error_handling', 'Control flow and error handling'),
      jsinfo('while-for', 'Loops: while and for'),
    ],
    position: { x: 0, y: 600 },
    studiedAt: '2026-09-03T19:00:00Z',
  },
  {
    id: 'strings',
    title: 'Strings & Templates',
    description: 'String methods, template literals and tagged templates.',
    resources: [jsinfo('string', 'Strings'), mdn('Web/JavaScript/Reference/Template_literals', 'Template literals')],
    position: { x: COL, y: 180 },
    studiedAt: '2026-09-04T19:00:00Z',
  },
  {
    id: 'functions',
    title: 'Functions',
    description:
      'Declarations, expressions and arrow functions; parameters, defaults and rest; functions as values you can pass around.',
    resources: [
      mdn('Web/JavaScript/Guide/Functions', 'Functions'),
      jsinfo('function-basics', 'Functions'),
      jsinfo('arrow-functions-basics', 'Arrow functions, the basics'),
      jsinfo('function-expressions', 'Function expressions'),
      note('functions-note', 'Callbacks, explained to myself'),
    ],
    position: { x: COL, y: 380 },
    studiedAt: '2026-09-06T19:00:00Z',
  },
  {
    id: 'arrays',
    title: 'Arrays',
    description: 'Creating arrays, reading and writing by index, and length as a writable property.',
    resources: [
      jsinfo('array', 'Arrays'),
      mdn('Web/JavaScript/Guide/Indexed_collections', 'Indexed collections'),
      note('arrays-note', 'Holes and sparse arrays'),
    ],
    position: { x: COL, y: 540 },
    studiedAt: '2026-09-08T19:00:00Z',
  },
  {
    id: 'scope',
    title: 'Scope',
    description: 'Global, function and block scope; how the engine looks up a name through nested scopes.',
    resources: [jsinfo('closure', 'Variable scope, closure'), mdn('Glossary/Scope', 'Scope')],
    position: { x: COL * 2, y: 300 },
    studiedAt: '2026-09-10T19:00:00Z',
  },
  {
    id: 'hoisting',
    title: 'Hoisting',
    description: 'Why var and function declarations seem to move up, and the temporal dead zone for let and const.',
    resources: [mdn('Glossary/Hoisting', 'Hoisting')],
    position: { x: COL * 2, y: 150 },
    studiedAt: '2026-09-11T19:00:00Z',
  },
  {
    id: 'objects',
    title: 'Objects',
    description: 'Object literals, property access, computed keys, and how objects are copied by reference.',
    resources: [
      jsinfo('object', 'Objects'),
      jsinfo('object-copy', 'Object references and copying'),
      mdn('Web/JavaScript/Guide/Working_with_objects', 'Working with objects'),
      note('objects-note', 'Reference vs value, with diagrams'),
    ],
    position: { x: COL * 2, y: 480 },
    studiedAt: '2026-09-13T19:00:00Z',
  },
  {
    id: 'array-methods',
    title: 'Array Methods',
    description: 'map, filter, reduce, find and sort, and which of them mutate the array.',
    resources: [
      jsinfo('array-methods', 'Array methods'),
      mdn('Web/JavaScript/Reference/Global_Objects/Array/reduce', 'Array.prototype.reduce()'),
      note('array-methods-note', 'reduce exercises'),
    ],
    position: { x: COL * 2, y: 640 },
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
      note('closures-note-2', 'Closure exercises'),
    ],
    position: { x: COL * 3, y: 260 },
    studiedAt: '2026-09-15T20:30:00Z',
  },
  {
    id: 'this',
    title: 'The this Keyword',
    description: 'How this is decided at call time, and how call, apply, bind and arrow functions change it.',
    resources: [jsinfo('object-methods', 'Object methods, "this"'), mdn('Web/JavaScript/Reference/Operators/this', 'this')],
    position: { x: COL * 3, y: 420 },
    studiedAt: null,
  },
  {
    id: 'prototypes',
    title: 'Prototypes',
    description: 'The prototype chain, Object.create, and where inherited methods actually live.',
    resources: [
      jsinfo('prototype-inheritance', 'Prototypal inheritance'),
      mdn('Web/JavaScript/Inheritance_and_the_prototype_chain', 'Inheritance and the prototype chain'),
      note('prototypes-note', 'Drawing the chain'),
    ],
    position: { x: COL * 3, y: 560 },
    studiedAt: null,
  },
  {
    id: 'destructuring',
    title: 'Destructuring & Spread',
    description: 'Pulling values out of arrays and objects, defaults, rest, and spreading into new ones.',
    resources: [
      jsinfo('destructuring-assignment', 'Destructuring assignment'),
      mdn('Web/JavaScript/Reference/Operators/Spread_syntax', 'Spread syntax'),
    ],
    position: { x: COL * 3, y: 720 },
    studiedAt: null,
  },
  {
    id: 'error-handling',
    title: 'Error Handling',
    description: 'try/catch/finally, throwing your own errors, and custom error classes.',
    resources: [jsinfo('try-catch', 'Error handling, "try...catch"'), jsinfo('custom-errors', 'Custom errors')],
    position: { x: COL * 4, y: 90 },
    studiedAt: null,
  },
  {
    id: 'event-loop',
    title: 'The Event Loop',
    description:
      'How JavaScript runs one thing at a time: the call stack, the task queue and the microtask queue, and why a resolved promise runs before a setTimeout of zero.',
    resources: [
      {
        id: 'event-loop-talk',
        title: 'What the heck is the event loop anyway?',
        kind: 'video',
        url: 'https://www.youtube.com/watch?v=8aGhZQkoFbQ',
        detail: 'JSConf EU',
      },
      jsinfo('event-loop', 'Event loop: microtasks and macrotasks'),
      note('event-loop-note', 'Microtasks vs tasks'),
    ],
    position: { x: COL * 4, y: 240 },
    studiedAt: null,
  },
  {
    id: 'classes',
    title: 'Classes',
    description: 'class syntax as a layer over prototypes: constructors, methods, extends and super.',
    resources: [jsinfo('class', 'Class basic syntax'), jsinfo('class-inheritance', 'Class inheritance')],
    position: { x: COL * 4, y: 500 },
    studiedAt: null,
  },
  {
    id: 'modules',
    title: 'Modules',
    description: 'import and export, default versus named exports, and how modules are loaded once.',
    resources: [jsinfo('modules-intro', 'Modules, introduction'), mdn('Web/JavaScript/Guide/Modules', 'JavaScript modules')],
    position: { x: COL * 4, y: 700 },
    studiedAt: null,
  },
  {
    id: 'promises',
    title: 'Promises',
    description: 'A value that arrives later: creating, chaining and combining promises, and where errors go.',
    resources: [
      jsinfo('promise-basics', 'Promise'),
      jsinfo('promise-chaining', 'Promises chaining'),
      jsinfo('promise-api', 'Promise API'),
      mdn('Web/JavaScript/Guide/Using_promises', 'Using promises'),
      note('promises-note', 'Promise.all vs allSettled'),
    ],
    position: { x: COL * 5, y: 240 },
    studiedAt: null,
  },
  {
    id: 'dom',
    title: 'DOM Basics',
    description: 'The document as a tree of nodes: finding, creating and changing elements.',
    resources: [
      jsinfo('dom-nodes', 'DOM tree'),
      jsinfo('searching-elements-dom', 'Searching: getElement*, querySelector*'),
      mdn('Web/API/Document_Object_Model/Introduction', 'Introduction to the DOM'),
    ],
    position: { x: COL * 5, y: 420 },
    studiedAt: null,
  },
  {
    id: 'iterators',
    title: 'Iterators & Generators',
    description: 'The iteration protocol behind for...of, and generator functions that pause with yield.',
    resources: [jsinfo('generators', 'Generators')],
    position: { x: COL * 5, y: 600 },
    studiedAt: null,
  },
  {
    id: 'async-await',
    title: 'Async/Await',
    description: 'Writing promise code that reads top to bottom, and handling errors with try/catch.',
    resources: [
      jsinfo('async-await', 'Async/await'),
      mdn('Learn_web_development/Extensions/Async_JS/Promises', 'How to use promises'),
      note('async-note', 'Sequential vs parallel awaits'),
      note('async-note-2', 'Refactoring a callback API'),
    ],
    position: { x: COL * 6, y: 180 },
    studiedAt: null,
  },
  {
    id: 'fetch',
    title: 'Fetch API',
    description: 'Making HTTP requests from the browser, reading JSON, and handling network errors.',
    resources: [
      jsinfo('fetch', 'Fetch'),
      mdn('Web/API/Fetch_API/Using_Fetch', 'Using the Fetch API'),
      note('fetch-note', 'Why fetch does not reject on 404'),
    ],
    position: { x: COL * 6, y: 330 },
    studiedAt: null,
  },
  {
    id: 'events',
    title: 'Events & Delegation',
    description: 'Listening for events, bubbling and capturing, and handling many elements with one listener.',
    resources: [jsinfo('bubbling-and-capturing', 'Bubbling and capturing'), jsinfo('event-delegation', 'Event delegation')],
    position: { x: COL * 6, y: 480 },
    studiedAt: null,
  },
  {
    id: 'web-storage',
    title: 'Web Storage',
    description: 'localStorage and sessionStorage: what they keep, for how long, and their limits.',
    resources: [jsinfo('localstorage', 'LocalStorage, sessionStorage')],
    position: { x: COL * 6, y: 640 },
    studiedAt: null,
  },
];

const seedConnections = [
  { from: 'variables', to: 'operators' },
  { from: 'variables', to: 'functions' },
  { from: 'variables', to: 'strings' },
  { from: 'operators', to: 'control-flow' },
  { from: 'control-flow', to: 'functions' },
  { from: 'functions', to: 'scope' },
  { from: 'scope', to: 'hoisting' },
  { from: 'scope', to: 'closures' },
  { from: 'functions', to: 'arrays' },
  { from: 'arrays', to: 'array-methods' },
  { from: 'functions', to: 'objects' },
  { from: 'objects', to: 'this' },
  { from: 'objects', to: 'prototypes' },
  { from: 'prototypes', to: 'classes' },
  { from: 'this', to: 'classes' },
  { from: 'arrays', to: 'destructuring' },
  { from: 'objects', to: 'destructuring' },
  { from: 'closures', to: 'event-loop' },
  { from: 'event-loop', to: 'promises' },
  { from: 'promises', to: 'async-await' },
  { from: 'promises', to: 'fetch' },
  { from: 'error-handling', to: 'async-await' },
  { from: 'control-flow', to: 'error-handling' },
  { from: 'strings', to: 'error-handling' },
  { from: 'destructuring', to: 'modules' },
  { from: 'array-methods', to: 'iterators' },
  { from: 'objects', to: 'dom' },
  { from: 'dom', to: 'events' },
  { from: 'dom', to: 'web-storage' },
];

export const sampleProject: Project = {
  id: 'learn-javascript',
  title: 'Learn JavaScript',
  subject: 'JavaScript',
  startPageId: 'variables',
  isSample: true,
  pages: seedPages.map(toPage),
  connections: seedConnections.map((c) => makeConnection(c.from, c.to)),
};

/** Looks up a project by id. Only the sample exists until the projects API lands. */
export function getSampleProject(projectId: string): Project | null {
  return projectId === sampleProject.id ? sampleProject : null;
}
