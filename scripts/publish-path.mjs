#!/usr/bin/env node
/**
 * Writes a path kept as Markdown files in the repo (content/<path>/) into a WisePath account through the API, makes
 * it readable by its link and asks to publish it to the catalog. Running it again updates the same path: its ids come
 * from the folder and the titles.
 *
 *   WISEPATH_EMAIL=you@example.com WISEPATH_PASSWORD=... node scripts/publish-path.mjs content/como-usar-o-wisepath
 *   node scripts/publish-path.mjs content/como-usar-o-wisepath --check     # validates the files, sends nothing
 *
 * WISEPATH_API (default the production API) and WISEPATH_WEB (for the link it prints) point elsewhere.
 *
 * The folder holds path.json (kind, description, audience, language, modules by title) and one file per page, the
 * root first by name (00-…), each starting with "# Title". Every [[link]] must name a page of the folder.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const API = process.env.WISEPATH_API ?? 'https://wisepath-api.vercel.app/api';
const WEB = process.env.WISEPATH_WEB ?? 'https://wisepath-web.vercel.app';

const [folder, flag] = process.argv.slice(2);
if (!folder) throw new Error('Usage: node scripts/publish-path.mjs <content folder> [--check]');

/** A stable id from the folder and a title, shaped as a UUID, so a second run finds the same path and pages */
const idOf = (title) => {
  const hex = createHash('sha1').update(`${path.basename(folder)}:${title}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const meta = JSON.parse(readFileSync(path.join(folder, 'path.json'), 'utf8'));
const pages = readdirSync(folder)
  .filter((file) => file.endsWith('.md'))
  .sort()
  .map((file) => {
    const [first, ...rest] = readFileSync(path.join(folder, file), 'utf8').split('\n');
    if (!first.startsWith('# ')) throw new Error(`${file} must start with "# Title"`);
    const title = first.slice(2).trim();
    return { file, title, id: idOf(title), content: rest.join('\n').trim() };
  });
const [root, ...others] = pages;

// Every page once, every link to one of them, every module a page: nothing half made on the map
const titles = new Set(pages.map((page) => page.title.toLowerCase()));
if (titles.size !== pages.length) throw new Error('Two pages have the same title');
for (const page of pages) {
  const withoutCode = page.content.replace(/`[^`\n]*`/g, '');
  for (const [, title] of withoutCode.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    if (!titles.has(title.trim().toLowerCase())) throw new Error(`${page.file} links [[${title}]], which no file is`);
  }
}
for (const title of Object.keys(meta.modules ?? {})) {
  if (!titles.has(title.toLowerCase())) throw new Error(`Module "${title}" is not a page`);
}
console.log(`${pages.length} pages, links and modules check out: ${root.title}`);
if (flag === '--check') process.exit(0);

const email = process.env.WISEPATH_EMAIL;
const password = process.env.WISEPATH_PASSWORD;
if (!email || !password) throw new Error('Set WISEPATH_EMAIL and WISEPATH_PASSWORD');

/** One call to the API with the session; fails loudly with what it answered */
let token = '';
async function call(method, url, body) {
  const response = await fetch(`${API}${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`${method} ${url}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error(`Login failed: ${login.status}`);
token = /access_token=([^;]+)/.exec(login.headers.get('set-cookie') ?? '')?.[1] ?? '';
if (!token) throw new Error('The login answered without a session');

const projects = await call('GET', '/projects');
const general = projects.find((project) => project.isDefault) ?? projects[0];
const pathId = idOf(`path:${root.title}`);
const at = `/paths/${pathId}`;

await call('POST', '/paths', { id: pathId, projectId: general.id, rootPageId: root.id, title: root.title, kind: meta.kind });
for (const page of others) await call('POST', `${at}/pages`, { id: page.id, title: page.title });
for (const page of pages) {
  const look = meta.modules?.[page.title];
  await call('PATCH', `${at}/pages/${page.id}`, { content: page.content, ...(look ? { module: true, ...look } : {}) });
}
await call('PATCH', at, { description: meta.description, kind: meta.kind });
// Opened by its link only while private: setting it again would take a published path out of the catalog
const { visibility } = await call('GET', at);
if (visibility === 'private') await call('PATCH', `${at}/visibility`, { visibility: 'public' });
await call('PUT', `${at}/publication`, { description: meta.description, audience: meta.audience, language: meta.language });

console.log(`Done. Readable by its link: ${WEB}/public/paths/${pathId}`);
if (visibility !== 'published') console.log(`Asked to publish to the catalog: approve it at ${WEB}/admin/publications`);
