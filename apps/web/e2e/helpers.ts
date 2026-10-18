import { expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

/** The API the app talks to in these runs (playwright.config.ts) */
export const API = 'http://localhost:4201/api';

/** A new account, signed in, on the paths page; its email (a fresh one unless given) */
export async function signUp(page: Page, name = 'E2E Learner', email = `e2e-${crypto.randomUUID()}@wisepath.test`) {
  await page.goto('/signup');
  await page.getByLabel(/^name/i).fill(name);
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/^password/i).fill('long-enough-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/paths$/);
  return email;
}

/** A path made for a test, and its one page besides the root */
export interface Map {
  readonly pathId: string;
  readonly pageId: string;
}

/** Someone new, signed in, in a browser of their own */
export async function someone(browser: Browser, name: string) {
  const page = await (await browser.newContext()).newPage();
  const email = await signUp(page, name);
  return { page, email };
}

/** A learning path made through the API as the signed-in owner: a root linking one page, Borrowing */
export async function learningPath(owner: Page): Promise<Map> {
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

/** The owner's Share dialog on the Rust path */
export const shareDialog = (page: Page) => page.getByRole('dialog', { name: 'Share “Rust”' });
