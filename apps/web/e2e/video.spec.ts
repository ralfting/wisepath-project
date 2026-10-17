import { expect, test } from '@playwright/test';

/**
 * The video block against YouTube itself, so it runs only when asked (E2E_YOUTUBE=1): it needs the network and
 * YouTube's player, which a CI run can't count on. Run it after changing anything under features/paths/editor/video.
 */
test.skip(!process.env.E2E_YOUTUBE, 'needs YouTube: run with E2E_YOUTUBE=1');

test('a video plays from its keys, takes a note, goes fullscreen and floats when scrolled away', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/signup');
  await page.getByLabel(/^name/i).fill('E2E Learner');
  await page.getByLabel(/^email/i).fill(`e2e-${crypto.randomUUID()}@wisepath.test`);
  await page.getByLabel(/^password/i).fill('long-enough-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/paths$/);
  await page.getByRole('button', { name: 'New path' }).first().click();
  await page.getByLabel(/^what are you learning/i).fill('Videos');
  await page.getByRole('button', { name: 'Create path' }).click();
  await expect(page).toHaveURL(/\/pages\//);
  // The full page, so the text can scroll the video away
  const pageUrl = new URL(page.url());
  await page.goto(pageUrl.pathname);
  await page.getByRole('button', { name: 'YouTube video' }).click();
  await page.getByLabel('YouTube link').fill('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
  await page.getByRole('button', { name: 'Add video' }).click();
  const fullscreen = page.getByRole('button', { name: 'Fullscreen, with the notes' });
  await expect(fullscreen).toBeEnabled({ timeout: 20_000 });

  // K on the stage plays it; the note button's time moves on
  const stage = page.getByLabel(/^Video\. Space or K plays/);
  await stage.focus();
  await page.keyboard.press('k');
  await expect(page.getByRole('button', { name: /Note at 00:0[2-9]/ })).toBeVisible({ timeout: 20_000 });

  // N pauses and opens the note at that moment; Enter puts it in the text as [mm:ss] and the video goes on
  await page.keyboard.press('n');
  const field = page.getByPlaceholder('What happens here?');
  await expect(field).toBeVisible();
  await field.fill('The bunny wakes up');
  await page.keyboard.press('Enter');
  await expect(page.getByText('The bunny wakes up')).toBeVisible();

  // Fullscreen with the notes, and back
  await fullscreen.click();
  await expect(page.getByRole('complementary', { name: 'Notes on this video' })).toBeVisible();
  await page.getByRole('button', { name: 'Exit fullscreen' }).click();
  await expect(page.getByRole('complementary', { name: 'Notes on this video' })).toHaveCount(0);

  // Playing (it went on after the note) and scrolled out of view, it floats in a corner, with a way back
  await page.getByText('The bunny wakes up').click();
  await page.keyboard.press('End');
  for (let i = 0; i < 30; i++) await page.keyboard.type(`\nline ${i}`);
  await page.mouse.move(640, 300);
  await page.mouse.wheel(0, -4000);
  await expect(page.getByRole('button', { name: 'Back to the video' })).toBeVisible({ timeout: 10_000 });
});
