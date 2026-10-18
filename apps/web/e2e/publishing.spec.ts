import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { API, learningPath, shareDialog, signUp, someone } from './helpers';

/**
 * Publishing a path to the catalog (docs/plans/19-publish-to-the-catalog.md): the owner asks from the Share dialog,
 * an administrator (ADMIN_EMAILS in playwright.config.ts) approves it from the review page.
 */

const ADMIN = 'admin-e2e@wisepath.test';

test('an owner asks to publish a path, and an administrator approves it', async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const map = await learningPath(ada.page);

  // The review page is for administrators only
  expect((await ada.page.goto('/admin/publications'))?.status()).toBe(404);

  await ada.page.goto(`/paths/${map.pathId}`);
  await ada.page.getByRole('button', { name: 'Share Rust' }).click();
  await shareDialog(ada.page).getByRole('button', { name: 'Ask to publish' }).click();
  await shareDialog(ada.page).getByLabel(/^what it teaches/i).fill('Ownership and borrowing in Rust');
  await shareDialog(ada.page).getByLabel(/^who it is for/i).fill('People who know another language');
  await shareDialog(ada.page).getByRole('button', { name: 'Send for review' }).click();
  await expect(shareDialog(ada.page).getByText('Waiting for review')).toBeVisible();

  const admin = await (await browser.newContext()).newPage();
  await signUp(admin, 'Admin', ADMIN);
  await admin.goto('/admin/publications');
  const request = admin.getByRole('heading', { name: 'Rust', level: 2 });
  await expect(request).toBeVisible();
  await admin.getByRole('button', { name: 'Approve' }).click();
  await expect(request).toHaveCount(0);

  await ada.page.reload();
  await ada.page.getByRole('button', { name: 'Share Rust' }).click();
  await expect(shareDialog(ada.page).getByText('In the catalog')).toBeVisible();

  // A visitor with JavaScript off reads it at its catalog address, and follows a [[link]] to the next page
  const { slug } = (await (await ada.page.request.get(`${API}/paths/${map.pathId}`)).json()) as { slug: string };
  const reader = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
  await reader.goto(`/p/${slug}`);
  await expect(reader.getByRole('heading', { name: 'Rust', level: 1 })).toBeVisible();
  await expect(reader.getByText('Ownership and borrowing in Rust')).toBeVisible();
  await reader.getByRole('article').getByRole('link', { name: 'Borrowing', exact: true }).click();
  await expect(reader).toHaveURL(new RegExp(`/p/${slug}/borrowing$`));
  await expect(reader.getByRole('heading', { name: 'Borrowing', level: 1 })).toBeVisible();
  // The way back, in the map's reading order
  await expect(reader.getByRole('navigation', { name: 'Previous and next page' }).getByRole('link', { name: /Rust/ })).toBeVisible();

  // Without a domain of its own (no SITE_URL here) search engines are kept out: noindex, and robots.txt closed
  await expect(reader.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(await (await reader.request.get('/robots.txt')).text()).toContain('Disallow: /');

  // Its old public link leads to the catalog address
  await reader.goto(`/public/paths/${map.pathId}`);
  await expect(reader).toHaveURL(new RegExp(`/p/${slug}$`));

  // Nothing on it that axe can find, with the page running as a visitor sees it
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/p/${slug}/borrowing`);
  await expect(visitor.getByRole('heading', { name: 'Borrowing', level: 1 })).toBeVisible();
  const { violations } = await new AxeBuilder({ page: visitor }).analyze();
  expect(violations.map((violation) => violation.id)).toEqual([]);
});
