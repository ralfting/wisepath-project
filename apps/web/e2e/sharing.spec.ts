import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { API, signUp } from './helpers';

/**
 * Sharing a path (docs/plans/14-public-and-shared-paths.md), with two or three people at once, each in a browser of
 * their own: the owner shares and makes public, a reader studies with their own marks, a visitor reads the link.
 */

interface Map {
  readonly pathId: string;
  readonly pageId: string;
}

/** Someone new, signed in, in a browser of their own */
async function someone(browser: Browser, name: string) {
  const page = await (await browser.newContext()).newPage();
  const email = await signUp(page, name);
  return { page, email };
}

/** A learning path made through the API as the signed-in owner: a root linking one page, Borrowing */
async function learningPath(owner: Page): Promise<Map> {
  const [general] = (await (await owner.request.get(`${API}/projects`)).json()) as Array<{ id: string }>;
  const pathId = crypto.randomUUID();
  const rootPageId = crypto.randomUUID();
  const pageId = crypto.randomUUID();
  const paths = `${API}/paths/${pathId}`;
  expect((await owner.request.post(`${API}/paths`, { data: { id: pathId, projectId: general.id, rootPageId, title: 'Rust', kind: 'learningPath' } })).ok()).toBe(true);
  expect((await owner.request.patch(`${paths}/pages/${rootPageId}`, { data: { content: 'Start with [[Borrowing]]' } })).ok()).toBe(true);
  expect((await owner.request.post(`${paths}/pages`, { data: { id: pageId, title: 'Borrowing' } })).ok()).toBe(true);
  return { pathId, pageId };
}

/** Whether Borrowing is studied, as this person's own marks say */
const studied = async (page: Page, map: Map) => {
  const path = (await (await page.request.get(`${API}/paths/${map.pathId}`)).json()) as { pages: Array<{ id: string; studied: boolean }> };
  return path.pages.find((p) => p.id === map.pageId)?.studied;
};

const content = async (page: Page, map: Map) => {
  const path = (await (await page.request.get(`${API}/paths/${map.pathId}`)).json()) as { pages: Array<{ id: string; content: string }> };
  return path.pages.find((p) => p.id === map.pageId)?.content;
};

const shareDialog = (page: Page) => page.getByRole('dialog', { name: 'Share “Rust”' });

test('a path shared to read is studied with your own marks, and once you may edit it, edited', async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const bob = await someone(browser, 'Bob');
  const map = await learningPath(ada.page);

  // Ada shares it with Bob, to read
  await ada.page.goto(`/paths/${map.pathId}`);
  await ada.page.getByRole('button', { name: 'Share Rust' }).click();
  await shareDialog(ada.page).getByLabel(/^email/i).fill(bob.email);
  await shareDialog(ada.page).getByRole('button', { name: 'Add' }).click();
  await expect(shareDialog(ada.page).getByText('Bob', { exact: true })).toBeVisible();

  // Bob finds it among the paths from others, with Ada's name
  await bob.page.goto('/paths');
  const fromOthers = bob.page.getByRole('region', { name: 'From others' });
  await expect(fromOthers.getByText('By Ada')).toBeVisible();
  await fromOthers.getByRole('link', { name: 'Rust' }).click();

  // He reads it: no Share, no way to change the text; marking a page studied is his alone
  await expect(bob.page.getByRole('treeitem', { name: /Borrowing/ })).toBeVisible();
  await expect(bob.page.getByRole('button', { name: 'Share Rust' })).toHaveCount(0);
  await bob.page.getByRole('treeitem', { name: /Borrowing/ }).click();
  const drawer = bob.page.getByRole('dialog', { name: 'Page beside the map' });
  await expect(drawer.getByLabel('Page content')).toHaveAttribute('contenteditable', 'false');
  await drawer.getByRole('switch', { name: "I've studied this" }).click();
  await expect.poll(() => studied(bob.page, map)).toBe(true);
  expect(await studied(ada.page, map)).toBe(false);

  // Ada lets him edit; once he opens it again he writes in it, and she reads what he wrote
  await shareDialog(ada.page).getByRole('textbox', { name: 'Access for Bob' }).click();
  await ada.page.getByRole('option', { name: 'Can edit' }).click();
  await expect(shareDialog(ada.page).getByRole('textbox', { name: 'Access for Bob' })).toHaveValue('Can edit');
  await bob.page.goto(`/paths/${map.pathId}/pages/${map.pageId}`);
  const text = bob.page.getByLabel('Page content');
  await expect(text).toHaveAttribute('contenteditable', 'true');
  await text.click();
  await bob.page.keyboard.type('Bob was here');
  await expect.poll(() => content(ada.page, map)).toContain('Bob was here');
});

test('a public path is read by its link without an account, taken to study, and gone once private', async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const bob = await someone(browser, 'Bob');
  const visitor = await (await browser.newContext()).newPage();
  const map = await learningPath(ada.page);

  // Private, the link leads nowhere: a real 404, which a streamed loading screen would turn into a 200
  expect((await visitor.goto(`/public/paths/${map.pathId}`))?.status()).toBe(404);
  await expect(visitor.getByRole('heading', { name: 'Path not found' })).toBeVisible();

  await ada.page.goto(`/paths/${map.pathId}`);
  await ada.page.getByRole('button', { name: 'Share Rust' }).click();
  await shareDialog(ada.page).getByRole('switch', { name: /^anyone with the link can read/i }).click();
  await expect(shareDialog(ada.page).getByRole('button', { name: 'Copy link' })).toBeVisible();

  // Anyone with the link reads it, kept out of search engines, and is asked to log in to study it
  await visitor.reload();
  await expect(visitor.getByRole('heading', { name: 'Rust', level: 1 })).toBeVisible();
  await expect(visitor).toHaveTitle('Rust | WisePath');
  await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await visitor.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: 'Borrowing' }).click();
  await expect(visitor.getByRole('heading', { name: 'Borrowing', level: 2 })).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'Log in to study it' })).toBeVisible();

  // Bob takes it to study: it opens as his map to read, and stays among the paths from others
  await bob.page.goto(`/public/paths/${map.pathId}`);
  await bob.page.getByRole('button', { name: 'Study this path' }).click();
  await expect(bob.page).toHaveURL(new RegExp(`/paths/${map.pathId}$`));
  await bob.page.goto('/paths');
  await expect(bob.page.getByRole('region', { name: 'From others' }).getByRole('link', { name: 'Rust' })).toBeVisible();

  // Private again: the link and Bob's copy of the way in are gone
  await shareDialog(ada.page).getByRole('switch', { name: /^anyone with the link can read/i }).click();
  await expect(shareDialog(ada.page).getByRole('button', { name: 'Copy link' })).toHaveCount(0);
  await visitor.reload();
  await expect(visitor.getByRole('heading', { name: 'Path not found' })).toBeVisible();
  await bob.page.reload();
  await expect(bob.page.getByRole('region', { name: 'From others' })).toHaveCount(0);
});

test("someone else's private map, or one that doesn't exist, answers 404 from the server", async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const eve = await someone(browser, 'Eve');
  const map = await learningPath(ada.page);

  for (const pathId of [map.pathId, crypto.randomUUID()]) {
    expect((await eve.page.goto(`/paths/${pathId}`))?.status()).toBe(404);
    await expect(eve.page.getByRole('heading', { name: 'Path not found' })).toBeVisible();
  }
  // Its own pages too, and the owner still opens it
  expect((await eve.page.goto(`/paths/${map.pathId}/pages/${map.pageId}`))?.status()).toBe(404);
  expect((await ada.page.goto(`/paths/${map.pathId}`))?.status()).toBe(200);
});
