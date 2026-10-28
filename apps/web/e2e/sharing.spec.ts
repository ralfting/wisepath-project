import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { API, learningPath, shareDialog, signUp, someone } from './helpers';
import type { Map } from './helpers';

/**
 * Sharing a path (docs/plans/14-public-and-shared-paths.md), with two or three people at once, each in a browser of
 * their own: the owner shares and makes public, a reader studies with their own marks, a visitor reads the link.
 */

/** Whether Borrowing is studied, as this person's own marks say */
const studied = async (page: Page, map: Map) => {
  const path = (await (await page.request.get(`${API}/paths/${map.pathId}`)).json()) as { pages: Array<{ id: string; studied: boolean }> };
  return path.pages.find((p) => p.id === map.pageId)?.studied;
};

const content = async (page: Page, map: Map) => {
  const path = (await (await page.request.get(`${API}/paths/${map.pathId}`)).json()) as { pages: Array<{ id: string; content: string }> };
  return path.pages.find((p) => p.id === map.pageId)?.content;
};

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
  await expect(fromOthers.getByRole('img', { name: "Ada’s path. You can read and study it" })).toBeVisible();
  await fromOthers.getByRole('link', { name: 'Rust' }).click();
  await expect(bob.page.getByRole('img', { name: "Ada’s path. You can read and study it" })).toBeVisible();

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
  await visitor.getByRole('radiogroup', { name: 'View' }).getByText('List').click();
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

test('a public path opens on its map on a wide screen, a page chosen in it read in a drawer, and a phone has the list', async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const visitor = await (await browser.newContext()).newPage();
  const map = await learningPath(ada.page);
  expect((await ada.page.request.patch(`${API}/paths/${map.pathId}/visibility`, { data: { visibility: 'public' } })).ok()).toBe(true);

  await visitor.goto(`/public/paths/${map.pathId}`);
  const borrowing = visitor.getByRole('tree', { name: /Rust/ }).getByRole('treeitem', { name: /Borrowing/ });
  await expect(borrowing).toBeVisible();
  // The map or the list, never both
  await expect(visitor.getByRole('navigation', { name: 'Pages' })).toBeHidden();
  // The wheel over the map scrolls the page instead of being kept by the map
  await borrowing.hover();
  await visitor.mouse.wheel(0, 300);
  await expect.poll(() => visitor.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await borrowing.click();
  const drawer = visitor.getByRole('dialog', { name: 'Borrowing' });
  await expect(drawer.getByText(/Previous/)).toBeVisible();
  // The map stays usable beside it: another page takes its place
  await visitor.getByRole('tree', { name: /Rust/ }).getByRole('treeitem', { name: /^Rust/ }).click();
  await expect(visitor.getByRole('dialog', { name: 'Rust' })).toBeVisible();
  await visitor.keyboard.press('Escape');
  await expect(visitor.getByRole('dialog')).toHaveCount(0);

  await visitor.getByRole('radiogroup', { name: 'View' }).getByText('List').click();
  await expect(visitor.getByRole('tree')).toHaveCount(0);
  await expect(visitor.getByRole('navigation', { name: 'Pages' })).toBeVisible();

  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await phone.goto(`/public/paths/${map.pathId}`);
  await expect(phone.getByRole('navigation', { name: 'Pages' })).toBeVisible();
  await expect(phone.getByRole('heading', { name: 'Rust', level: 2 })).toBeVisible();
  await expect(phone.getByRole('tree')).toHaveCount(0);
  await expect(phone.getByRole('radiogroup', { name: 'View' })).toBeHidden();
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

test('a path shared with an email that has no account waits, and is theirs once they sign up', async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const map = await learningPath(ada.page);
  const email = `later-${crypto.randomUUID()}@wisepath.test`;

  await ada.page.goto(`/paths/${map.pathId}`);
  await ada.page.getByRole('button', { name: 'Share Rust' }).click();
  await shareDialog(ada.page).getByLabel(/^email/i).fill(email);
  await shareDialog(ada.page).getByRole('button', { name: 'Add' }).click();
  await expect(shareDialog(ada.page).getByText('Waiting for them to sign up with this email')).toBeVisible();

  // Ada tells them herself; they sign up with that email and find it among the paths from others
  const newcomer = await (await browser.newContext()).newPage();
  await signUp(newcomer, 'Gil', email);
  await expect(newcomer.getByRole('region', { name: 'From others' }).getByText('By Ada')).toBeVisible();

  // The invite became a person in Ada's list
  await ada.page.reload();
  await ada.page.getByRole('button', { name: 'Share Rust' }).click();
  await expect(shareDialog(ada.page).getByText('Gil', { exact: true })).toBeVisible();
  await expect(shareDialog(ada.page).getByText('Waiting for them to sign up with this email')).toHaveCount(0);
});

test('whoever took a path is told once, on their next visit, that it went private', async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const gil = await someone(browser, 'Gil');
  const map = await learningPath(ada.page);
  const paths = `${API}/paths/${map.pathId}`;
  expect((await ada.page.request.patch(`${paths}/visibility`, { data: { visibility: 'public' } })).ok()).toBe(true);
  expect((await gil.page.request.post(`${paths}/take`)).ok()).toBe(true);
  expect((await ada.page.request.patch(`${paths}/visibility`, { data: { visibility: 'private' } })).ok()).toBe(true);

  await gil.page.goto('/paths');
  await expect(gil.page.getByText('“Rust” is no longer available: Ada made it private.')).toBeVisible();
  await expect(gil.page.getByRole('region', { name: 'From others' })).toHaveCount(0);

  // Shown once: the next visit says nothing
  await expect.poll(async () => ((await (await gil.page.request.get(`${API}/notices`)).json()) as unknown[]).length).toBe(0);
  await gil.page.reload();
  await expect(gil.page.getByRole('heading', { name: 'My paths' })).toBeVisible();
  await expect(gil.page.getByText('“Rust” is no longer available: Ada made it private.')).toHaveCount(0);
});
