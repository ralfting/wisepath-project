import { expect, test } from '@playwright/test';
import { learningPath, shareDialog, signUp, someone } from './helpers';

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
});
