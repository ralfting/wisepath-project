import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { API, learningPath, someone } from './helpers';
import type { Map } from './helpers';

/**
 * Questions on a page (docs/plans/24-page-questions.md): the author writes one with /question, each reader answers it
 * for themselves, the answer outlives a reload, and in a learning path the studied control waits for it. A visitor on
 * the public link sees the question with no field. Screenshots of the block, light and dark, go to
 * test-results/questions/.
 */

const SCHEME_KEY = 'mantine-color-scheme-value';
const QUESTION = 'What does the borrow checker stop?';

const answerField = (page: Page) => page.getByRole('note', { name: 'Question' }).getByRole('textbox', { name: 'Your answer' });

/** This person's answers on Borrowing, as the API keeps them */
const answers = async (page: Page, map: Map) => {
  const path = (await (await page.request.get(`${API}/paths/${map.pathId}`)).json()) as {
    pages: Array<{ id: string; answers?: Array<{ body: string }> }>;
  };
  return path.pages.find((p) => p.id === map.pageId)?.answers?.map((a) => a.body) ?? [];
};

test('a question is written with /question, answered by each reader for themselves, and holds a learning path', async ({ browser }) => {
  const ada = await someone(browser, 'Ada');
  const map = await learningPath(ada.page);

  // Ada writes the question on Borrowing with the / command
  await ada.page.goto(`/paths/${map.pathId}/pages/${map.pageId}`);
  await ada.page.getByLabel('Page content').click();
  await ada.page.keyboard.type('/question');
  await expect(ada.page.getByRole('listbox', { name: 'Commands' }).getByRole('option', { name: /Question/ })).toBeVisible();
  await ada.page.keyboard.press('Enter');
  await ada.page.keyboard.type(QUESTION);
  await expect(ada.page.getByRole('note', { name: 'Question' })).toContainText(QUESTION);

  // The studied control counts it, and takes her to its answer
  const left = ada.page.getByRole('button', { name: '1 question to answer' });
  await expect(left).toBeVisible();
  await left.click();
  await expect(answerField(ada.page)).toBeFocused();
  await ada.page.keyboard.type('Two writers at once');
  await ada.page.keyboard.press('Tab');
  await expect.poll(() => answers(ada.page, map)).toEqual(['Two writers at once']);

  // Kept across a reload, and the page can now be marked studied
  await ada.page.reload();
  await expect(answerField(ada.page)).toHaveValue('Two writers at once');
  await expect(ada.page.getByRole('switch', { name: "I've studied this" })).toBeVisible();

  for (const scheme of ['light', 'dark'] as const) {
    await ada.page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [SCHEME_KEY, scheme]);
    await ada.page.reload();
    await expect(answerField(ada.page)).toHaveValue('Two writers at once');
    await ada.page.getByRole('note', { name: 'Question' }).screenshot({ path: `test-results/questions/question-${scheme}.png` });
  }

  // Made public, Bob takes it: the question is there, his field empty, and his answer stays his
  await expect(await ada.page.request.patch(`${API}/paths/${map.pathId}/visibility`, { data: { visibility: 'public' } })).toBeOK();
  const bob = await someone(browser, 'Bob');
  await bob.page.goto(`/public/paths/${map.pathId}`);
  await bob.page.getByRole('button', { name: 'Study this path' }).click();
  await expect(bob.page).toHaveURL(new RegExp(`/paths/${map.pathId}$`));
  await bob.page.goto(`/paths/${map.pathId}/pages/${map.pageId}`);
  await expect(bob.page.getByLabel('Page content')).toHaveAttribute('contenteditable', 'false');
  await expect(answerField(bob.page)).toHaveValue('');
  await expect(bob.page.getByRole('button', { name: '1 question to answer' })).toBeVisible();
  await answerField(bob.page).fill('Dangling references');
  await answerField(bob.page).blur();
  await expect.poll(() => answers(bob.page, map)).toEqual(['Dangling references']);
  expect(await answers(ada.page, map)).toEqual(['Two writers at once']);

  // A visitor on the link reads the question, with no field
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/public/paths/${map.pathId}`);
  await visitor.getByRole('radiogroup', { name: 'View' }).getByText('List').click();
  await visitor.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: 'Borrowing' }).click();
  await expect(visitor.getByRole('note', { name: 'Question' })).toContainText(QUESTION);
  await expect(visitor.getByRole('textbox', { name: 'Your answer' })).toHaveCount(0);
});
