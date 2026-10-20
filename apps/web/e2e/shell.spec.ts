import { expect, test } from '@playwright/test';
import { API, learningPath, someone } from './helpers';

test('on a phone the open navigation keeps the page behind it still, and the page scrolls again once it closes', async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const map = await learningPath(ada.page);
  const long = Array.from({ length: 60 }, (_, index) => `Paragraph ${index} on borrowing.`).join('\n\n');
  expect((await ada.page.request.patch(`${API}/paths/${map.pathId}/pages/${map.pageId}`, { data: { content: long } })).ok()).toBe(true);
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await ada.page.context().storageState() })).newPage();
  await phone.goto(`/paths/${map.pathId}/pages/${map.pageId}`);
  await expect(phone.getByText('Paragraph 5 on borrowing.')).toBeVisible();

  await phone.getByRole('button', { name: 'Open navigation' }).click();
  await phone.mouse.move(100, 500);
  await phone.mouse.wheel(0, 600);
  await expect.poll(() => phone.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe('hidden');
  expect(await phone.evaluate(() => window.scrollY)).toBe(0);

  await phone.getByRole('button', { name: 'Close navigation' }).click();
  await phone.mouse.move(200, 500);
  await phone.mouse.wheel(0, 600);
  await expect.poll(() => phone.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
