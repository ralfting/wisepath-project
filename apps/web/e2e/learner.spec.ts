import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * A learner's first steps, through the real web app, API and database: the paths page and its projects (Server
 * Actions), a new map, and its tab named on the server.
 */

/** A new account, signed in, on the paths page */
async function signUp(page: Page) {
  await page.goto('/signup');
  await page.getByLabel(/^name/i).fill('E2E Learner');
  await page.getByLabel(/^email/i).fill(`e2e-${crypto.randomUUID()}@wisepath.test`);
  await page.getByLabel(/^password/i).fill('long-enough-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/paths$/);
}

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

  // A adds it to a page: Enter picks the path, Enter its main page
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

test('a map asks for a login without a session', async ({ page }) => {
  await page.goto('/paths/anything');
  await expect(page).toHaveURL(/\/login/);
});
