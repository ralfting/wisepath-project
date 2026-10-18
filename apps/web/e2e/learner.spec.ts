import { expect, test } from '@playwright/test';
import { API, signUp } from './helpers';

/**
 * A learner's first steps, through the real web app, API and database: the paths page and its projects (Server
 * Actions), a new map, and its tab named on the server.
 */

test('a new path opens on its first page, its map tab is named after it, and search finds it', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'New path' }).first().click();
  await page.getByLabel(/^what are you learning/i).fill('Learn Effect');
  await page.getByRole('button', { name: 'Create path' }).click();
  await expect(page).toHaveURL(/\/paths\/[^/]+\/pages\/[^/]+\?new=1$/);
  const pathId = new URL(page.url()).pathname.split('/')[2];

  // It opened in the drawer over the map; Esc closes it, back to the map alone
  await expect(page.getByRole('dialog', { name: 'Page beside the map' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(new RegExp(`/paths/${pathId}$`));

  // A full load of the map: the title comes from generateMetadata, read on the server with the session cookie
  await page.goto(`/paths/${pathId}`);
  await expect(page).toHaveTitle('Learn Effect | WisePath');

  // Search finds the page by its title, from anywhere, and Enter opens it in the drawer
  await page.keyboard.press('Control+p');
  await page.getByRole('combobox', { name: 'Search every path' }).fill('Learn Eff');
  await expect(page.getByRole('option', { name: /Learn Effect/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Page beside the map' })).toBeVisible();
});

test('projects are created, renamed and deleted from the paths page', async ({ page }) => {
  await signUp(page);

  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel(/^name/i).fill('Work');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: 'Work' })).toBeVisible();

  await page.getByRole('button', { name: 'More for Work' }).click();
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  await page.getByLabel(/^name/i).fill('Languages');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Languages' })).toBeVisible();

  await page.getByRole('button', { name: 'More for Languages' }).click();
  await page.getByRole('menuitem', { name: 'Delete project' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete project' }).click();
  await expect(page.getByRole('heading', { name: 'Languages' })).toHaveCount(0);

  // Still gone after a full load: the change reached the API, not just the screen
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Work' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Languages' })).toHaveCount(0);
});

test('a [[link]] and the / command make pages from the text, and the map grows with them', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'New path' }).first().click();
  await page.getByLabel(/^what are you learning/i).fill('Learn Effect');
  await page.getByRole('button', { name: 'Create path' }).click();
  await expect(page).toHaveURL(/\/pages\//);
  const pathId = new URL(page.url()).pathname.split('/')[2];

  // [[Fibers]] links a page that doesn't exist yet; following it offers to make it, and opens it
  await page.getByLabel('Page content').click();
  await page.keyboard.type('Start with [[Fibers]] ');
  await page.locator('span[data-wikilink]', { hasText: 'Fibers' }).click();
  await page.getByRole('button', { name: 'Create page' }).click();
  const drawer = page.getByRole('dialog', { name: 'Page beside the map' });
  await expect(drawer.getByRole('textbox', { name: 'Page title' })).toHaveValue('Fibers');

  // In Fibers, the / command's Page asks for a name, then makes that page, linked from here, and goes to it
  await drawer.getByLabel('Page content').click();
  await page.keyboard.type('/page');
  await expect(page.getByRole('listbox', { name: 'Commands' }).getByRole('option', { name: /Page/ }).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Page name' }).fill('Scheduler');
  await page.keyboard.press('Enter');
  await expect(drawer.getByRole('textbox', { name: 'Page title' })).toHaveValue('Scheduler');

  // The map shows it, branching from the root; the map's search finds it, and the list view shows it too
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(new RegExp(`/paths/${pathId}$`));
  await expect(page.getByRole('treeitem', { name: /Fibers/ })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Search this path' }).fill('Fib');
  await expect(page.getByRole('listbox', { name: 'Pages found' }).getByRole('option', { name: /Fibers/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Search this path' }).fill('');
  await page.getByRole('radiogroup', { name: 'View' }).getByText('List').click();
  await expect(page.getByRole('radio', { name: 'List' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Fibers' })).toBeVisible();

  // Once the API has both pages (edits are sent in the background; a real browser would ask before leaving
  // earlier, which reload() skips), a full load shows the map with the new page on it
  await expect
    .poll(async () => ((await (await page.request.get(`${API}/paths/${pathId}`)).json()) as { pages: unknown[] }).pages.length)
    .toBe(3);
  await page.reload();
  const fibers = page.getByRole('treeitem', { name: /Fibers/ });
  await expect(fibers).toBeVisible();

  // From the keyboard: an arrow from the centre reaches the branch (on whichever side the map drew it), Enter opens it
  await page.getByRole('treeitem', { name: /Learn Effect/ }).focus();
  await page.keyboard.press('ArrowRight');
  if (!(await fibers.evaluate((el) => el === document.activeElement))) await page.keyboard.press('ArrowLeft');
  await expect(fibers).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Page beside the map' }).getByRole('textbox', { name: 'Page title' })).toHaveValue('Fibers');
});

test('a thought captured from the Inbox is filed into a page from the keyboard', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'New path' }).first().click();
  await page.getByLabel(/^what are you learning/i).fill('Learn Effect');
  await page.getByRole('button', { name: 'Create path' }).click();
  await expect(page).toHaveURL(/\/pages\//);

  await page.goto('/inbox');
  await page.getByRole('button', { name: /^Capture/ }).click();
  await page.getByRole('textbox', { name: 'What do you want to keep?' }).fill('Fibers are cheap threads');
  await page.keyboard.press('Enter');
  const list = page.getByRole('list', { name: 'Waiting in the Inbox' });
  const item = list.getByRole('listitem').filter({ hasText: 'Fibers are cheap threads' });
  await expect(item).toBeVisible();
  // The list shows the capture at once; the API has it too
  await expect
    .poll(async () => ((await (await page.request.get(`${API}/inbox`)).json()) as Array<{ text: string }>).map((i) => i.text))
    .toContain('Fibers are cheap threads');

  // A adds it to a page: Enter picks the path, Enter its main page. First the capture box gives the focus back to
  // its button as it closes, which would take it from the item
  await expect(page.getByRole('button', { name: /^Capture/ })).toBeFocused();
  await item.focus();
  await page.keyboard.press('a');
  await expect(page.getByRole('combobox', { name: 'Find a path' })).toBeFocused();
  await expect(page.getByRole('option', { name: /Learn Effect/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Find a page' })).toBeFocused();
  // The path's pages load once it is picked
  await expect(page.getByRole('option', { name: /Learn Effect/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Added to “Learn Effect”')).toBeVisible();
  await expect(item).toHaveCount(0);
});

test('a thought captured on another page reaches the Inbox, even when the connection is slow', async ({ page }) => {
  await signUp(page);
  // The capture request takes 1.5 s; the capture box has closed long before it answers
  await page.route(`${API}/inbox**`, async (route) => {
    if (route.request().method() === 'POST') await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  const aborted: string[] = [];
  page.on('requestfailed', (request) => request.method() === 'POST' && aborted.push(request.url()));

  await page.keyboard.press('Control+Shift+Space');
  await page.getByRole('textbox', { name: 'What do you want to keep?' }).fill('Slow but kept');
  await page.keyboard.press('Enter');

  await expect
    .poll(async () => ((await (await page.request.get(`${API}/inbox`)).json()) as Array<{ text: string }>).map((item) => item.text), { timeout: 10_000 })
    .toContain('Slow but kept');
  expect(aborted).toEqual([]);
});

test('a map asks for a login without a session', async ({ page }) => {
  await page.goto('/paths/anything');
  await expect(page).toHaveURL(/\/login/);
});

test('a path is made, moved to another project and deleted, each change surviving a reload', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel(/^name/i).fill('Work');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: 'Work' })).toBeVisible();

  await page.getByRole('button', { name: 'New path' }).first().click();
  await page.getByLabel(/^what are you learning/i).fill('Learn Rust');
  await page.getByRole('button', { name: 'Create path' }).click();
  await expect(page).toHaveURL(/\/pages\//);

  // Moved from its card's menu: it shows under Work at once, and still does after a full load
  await page.goto('/paths');
  await page.getByRole('button', { name: 'More for Learn Rust' }).click();
  await page.getByRole('menuitem', { name: 'Move to' }).click();
  await page.getByRole('menuitem', { name: 'Work' }).click();
  const work = page.getByRole('region', { name: 'Work' });
  await expect(work.getByRole('link', { name: 'Learn Rust' })).toBeVisible();
  await page.reload();
  await expect(work.getByRole('link', { name: 'Learn Rust' })).toBeVisible();

  await page.getByRole('button', { name: 'More for Learn Rust' }).click();
  await page.getByRole('menuitem', { name: 'Delete path' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete path' }).click();
  await expect(page.getByRole('link', { name: 'Learn Rust' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Work' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Learn Rust' })).toHaveCount(0);
});

test('pages named with [[ ]] show on the map before they are made, and opening one makes it', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'New path' }).first().click();
  await page.getByLabel(/^what are you learning/i).fill('Learn Rust');
  await page.getByRole('button', { name: 'Create path' }).click();
  await expect(page).toHaveURL(/\/pages\//);
  const pathId = new URL(page.url()).pathname.split('/')[2];

  await page.getByLabel('Page content').click();
  await page.keyboard.type('Start with [[Ownership]] and [[Borrowing]]. ');
  // Both show on the map at once, as pages not made yet
  const ownership = page.getByRole('treeitem', { name: 'Ownership, not made yet. Make it' });
  const borrowing = page.getByRole('treeitem', { name: 'Borrowing, not made yet. Make it' });
  await expect(ownership).toBeVisible();
  await expect(borrowing).toBeVisible();

  // Opening one makes it and opens it; the other stays a ghost
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(new RegExp(`/paths/${pathId}$`));
  await ownership.click();
  await expect(page.getByRole('dialog', { name: 'Page beside the map' }).getByRole('textbox', { name: 'Page title' })).toHaveValue('Ownership');
  await expect(page.getByRole('treeitem', { name: /^Ownership/ })).toBeVisible();
  await expect(borrowing).toBeVisible();

  // Once the API has the text and the new page, a full load of the map shows the same
  await expect
    .poll(async () => {
      const saved = (await (await page.request.get(`${API}/paths/${pathId}`)).json()) as { pages: Array<{ content: string }> };
      return [saved.pages.length, saved.pages.some((p) => p.content.includes('[[Borrowing]]'))];
    })
    .toEqual([2, true]);
  await page.goto(`/paths/${pathId}`);
  await expect(page.getByRole('treeitem', { name: /^Ownership/ })).toBeVisible();
  await expect(borrowing).toBeVisible();
  await expect(page.getByRole('treeitem', { name: 'Ownership, not made yet. Make it' })).toHaveCount(0);
});

test('a first visit says how to start, offers a sample path once, and shows no project header for one project', async ({ page }) => {
  await signUp(page);
  await expect(page.getByRole('heading', { name: 'Start here' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'General' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Try a sample path' }).click();
  await expect(page).toHaveURL(/\/paths\/sample-/);
  await expect(page.getByRole('heading', { name: 'Literature (sample)', level: 1 })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /^Reading closely/ })).toBeVisible();

  // Back home: the card is gone, the sample is a path like any other, and one project needs no header
  await page.goto('/paths');
  await expect(page.getByRole('link', { name: 'Literature (sample)' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Start here' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'General' })).toHaveCount(0);

  // A second project brings the groups back
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByLabel(/^name/i).fill('Work');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Work' })).toBeVisible();
});
