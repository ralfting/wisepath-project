import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import { API, learningPath, signUp } from './helpers';
import type { Map } from './helpers';

/**
 * Text passes WCAG AA contrast on every screen, in light and in dark (docs/FEATURES.md, "Accessibility and themes").
 * Each screen is also saved as a full-page screenshot under test-results/contrast/, for what axe can't judge.
 */

const SCHEMES = ['light', 'dark'] as const;
type Scheme = (typeof SCHEMES)[number];

/** Mantine's localStorageColorSchemeManager key, which ColorSchemeScript reads before the first paint */
const SCHEME_KEY = 'mantine-color-scheme-value';
/** An administrator of this spec's own (ADMIN_EMAILS in playwright.config.ts), so publishing.spec.ts can still sign up its one */
const ADMIN = { email: 'contrast-admin-e2e@wisepath.test', password: 'long-enough-password' };

/** Every block the editor and the catalog draw, so each one is measured */
const EVERY_BLOCK = [
  '## Borrowing rules',
  'A reference is **borrowed**, *never owned*, and written `&T`. See [[Lifetimes]], [[Traits]] and [the book](https://doc.rust-lang.org/book/).',
  '### In short',
  '> One mutable reference or many shared ones.',
  '> [!info]\n> The borrow checker runs at compile time.',
  '> [!warning]\n> A reference never outlives its owner.',
  '> [!danger]\n> `unsafe` turns the checks off.',
  '> [!activity]\n> Write a function that borrows twice.',
  '```rust\nfn first(words: &str) -> &str {\n    let count = 1;\n    &words[..count]\n}\n```',
  '| Kind | Many at once |\n| --- | --- |\n| `&T` | yes |\n| `&mut T` | no |',
  '- [x] Read the chapter\n- [ ] Write the exercises',
].join('\n\n');

interface Screen {
  readonly name: string;
  /** From the screen before it, to this one at rest */
  readonly reach: () => Promise<void>;
}

const drawer = (page: Page) => page.getByRole('dialog', { name: 'Page beside the map' });

/** A path with every block on its Borrowing page, a page linked from it, an unlinked page, and a second path in a project */
async function richPath(page: Page): Promise<Map> {
  const map = await learningPath(page);
  const paths = `${API}/paths/${map.pathId}`;
  // A title of its own: publishing.spec.ts looks for its one Rust path, by "ownership", in the shared catalog
  const { rootPageId } = (await (await page.request.get(paths)).json()) as { rootPageId: string };
  await expect(await page.request.patch(`${paths}/pages/${rootPageId}`, { data: { title: 'Contrast tour' } })).toBeOK();
  await expect(await page.request.post(`${paths}/pages`, { data: { id: crypto.randomUUID(), title: 'Lifetimes' } })).toBeOK();
  await expect(await page.request.post(`${paths}/pages`, { data: { id: crypto.randomUUID(), title: 'Macros' } })).toBeOK();
  await expect(await page.request.patch(`${paths}/pages/${map.pageId}`, { data: { content: EVERY_BLOCK } })).toBeOK();
  const projectId = crypto.randomUUID();
  await expect(await page.request.post(`${API}/projects`, { data: { id: projectId, name: 'Work' } })).toBeOK();
  const data = { id: crypto.randomUUID(), projectId, rootPageId: crypto.randomUUID(), title: 'Effect', kind: 'study' };
  await expect(await page.request.post(`${API}/paths`, { data })).toBeOK();
  return map;
}

/** Publishes the path through the API, approved by the administrator, and answers its catalog address */
async function publish(page: Page, admin: APIRequestContext, map: Map) {
  // Words publishing.spec.ts doesn't search the catalog for, so its search still finds its one path
  const request = { description: 'References and lifetimes', audience: 'People who know another language', language: 'en' };
  await expect(await page.request.put(`${API}/paths/${map.pathId}/publication`, { data: request })).toBeOK();
  // Both schemes share the administrator, so whichever comes second logs in
  const signedUp = await admin.post(`${API}/auth/signup`, { data: { ...ADMIN, name: 'Admin' } });
  if (!signedUp.ok()) await expect(await admin.post(`${API}/auth/login`, { data: ADMIN })).toBeOK();
  await expect(await admin.post(`${API}/admin/publications/${map.pathId}/approve`)).toBeOK();
  const { slug } = (await (await page.request.get(`${API}/paths/${map.pathId}`)).json()) as { slug: string };
  return `/p/${slug}/borrowing`;
}

/**
 * Waits for Mantine's transitions to end: a drawer half faded in measures as low contrast. Two frames first, since
 * Mantine starts a transition a frame after it mounts the element.
 */
async function settled(page: Page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
}

// Tall enough that the drawer's whole page fits: axe measures only what is on screen, and the screenshots show it all
test.use({ viewport: { width: 1280, height: 2000 } });

for (const scheme of SCHEMES) {
  test(`every screen's text passes AA contrast in ${scheme}`, async ({ page, playwright }) => {
    test.setTimeout(120_000);
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [SCHEME_KEY, scheme] satisfies [string, Scheme]);
    // Keys read as on Linux (Ctrl+↵), as in CI: a Mac's ⌘↵ is symbols only, which axe leaves unmeasured
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'Linux x86_64' }));
    let made: Map | undefined;
    const map = () => {
      if (!made) throw new Error('The path is made on the paths page, before any screen that reads it');
      return made;
    };

    const screens: ReadonlyArray<Screen> = [
      { name: 'login', reach: async () => {
        await page.goto('/login');
        await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
      } },
      { name: 'paths-home', reach: async () => {
        await signUp(page);
        made = await richPath(page);
        await page.reload();
        await expect(page.getByRole('heading', { name: 'Work' })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Work' }).getByRole('link', { name: 'Effect' })).toBeVisible();
      } },
      { name: 'map-drawer', reach: async () => {
        await page.goto(`/paths/${map().pathId}`);
        await page.getByRole('treeitem', { name: /Borrowing/ }).click();
        await expect(drawer(page).getByRole('note', { name: 'Danger' })).toBeVisible();
        await expect(drawer(page).getByRole('table')).toBeVisible();
      } },
      { name: 'map-drawer-link-key', reach: async () => {
        await drawer(page).getByText('A reference is').click();
        // The key's tag beside a line with a link is aria-hidden, so no role finds it
        await expect(page.locator('.wp-rail-tag[data-visible]')).toBeVisible();
      } },
      { name: 'map-drawer-commands', reach: async () => {
        // From the cursor in the text to its end, then a new line
        await expect(drawer(page).getByLabel('Page content')).toBeFocused();
        await page.keyboard.press('Control+ArrowDown');
        await page.keyboard.press('Enter');
        await page.keyboard.type('/');
        await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();
      } },
      { name: 'map-drawer-related', reach: async () => {
        await page.keyboard.press('Escape');
        await drawer(page).getByRole('tab', { name: /^Related/ }).click();
        await expect(drawer(page).getByRole('tab', { name: /^Related/ })).toHaveAttribute('aria-selected', 'true');
      } },
      { name: 'map-orphans', reach: async () => {
        await page.keyboard.press('Escape');
        await expect(drawer(page)).toHaveCount(0);
        await page.getByRole('button', { name: "1 page isn't on the map" }).click();
        await expect(page.getByRole('button', { name: 'Macros' })).toBeVisible();
      } },
      { name: 'map-list', reach: async () => {
        await page.keyboard.press('Escape');
        await page.getByRole('radiogroup', { name: 'View' }).getByText('List').click();
        await expect(page.getByRole('radio', { name: 'List' })).toBeChecked();
        await expect(page.getByText('Unlinked · no page links to them')).toBeVisible();
      } },
      // Opened on the map rather than the Inbox, where the capture's toast would cover its text
      { name: 'help', reach: async () => {
        await page.getByRole('button', { name: 'Help' }).click();
        await expect(page.getByRole('dialog', { name: 'What can I do here' })).toBeVisible();
      } },
      { name: 'search', reach: async () => {
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: 'What can I do here' })).toHaveCount(0);
        await page.keyboard.press('Control+p');
        await page.getByRole('combobox', { name: 'Search every path' }).fill('borrow');
        await expect(page.getByRole('option', { name: /Borrowing/ }).first()).toBeVisible();
      } },
      { name: 'inbox', reach: async () => {
        await page.keyboard.press('Escape');
        await page.goto('/inbox');
        await page.getByRole('button', { name: /^Capture/ }).click();
        await page.getByRole('textbox', { name: 'What do you want to keep?' }).fill('Fibers are cheap threads');
        await page.keyboard.press('Enter');
        await expect(page.getByRole('list', { name: 'Waiting in the Inbox' }).getByText('Fibers are cheap threads')).toBeVisible();
      } },
      { name: 'account-menu', reach: async () => {
        await page.getByRole('button', { name: /^Account/ }).click();
        await page.getByRole('menuitem', { name: 'Appearance' }).click();
        await expect(page.getByRole('menuitem', { name: `${scheme === 'light' ? 'Light' : 'Dark'}, in use` })).toBeVisible();
      } },
      { name: 'catalog', reach: async () => {
        const admin = await playwright.request.newContext();
        const address = await publish(page, admin, map());
        await admin.dispose();
        await page.goto(address);
        await expect(page.getByRole('heading', { name: 'Borrowing', level: 1 })).toBeVisible();
      } },
    ];

    const failures: Array<string> = [];
    for (const screen of screens) {
      await screen.reach();
      await settled(page);
      await page.screenshot({ path: `${test.info().project.outputDir}/contrast/${scheme}-${screen.name}.png`, fullPage: true });
      const { violations } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      for (const node of violations.flatMap((violation) => violation.nodes)) {
        failures.push(`${screen.name} · ${node.target.join(' ')} · ${node.any[0]?.message ?? node.failureSummary}`);
      }
    }
    expect(failures, `${failures.length} contrast failures in ${scheme}:\n${failures.join('\n')}`).toEqual([]);
  });
}
