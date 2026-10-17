import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** The API the app talks to in these runs (playwright.config.ts) */
export const API = 'http://localhost:4201/api';

/** A new account, signed in, on the paths page; its email */
export async function signUp(page: Page, name = 'E2E Learner') {
  const email = `e2e-${crypto.randomUUID()}@wisepath.test`;
  await page.goto('/signup');
  await page.getByLabel(/^name/i).fill(name);
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/^password/i).fill('long-enough-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/paths$/);
  return email;
}
