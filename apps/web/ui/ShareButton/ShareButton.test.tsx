import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLayers } from '@/test/render';
import { ShareButton } from './ShareButton';

const labels = { share: 'Share', copied: 'Link copied' };
const url = () => new URL('/public/paths/react', window.location.origin).toString();

// The share sheet and the pointer are browser features happy-dom leaves out
function onPhone(share: Navigator['share']) {
  const matchMedia = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
    Object.defineProperty(matchMedia(query), 'matches', { value: query === '(pointer: coarse)' }),
  );
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
});

describe('ShareButton', () => {
  it('copies the full link away from a phone and says so', async () => {
    const user = userEvent.setup();
    renderWithLayers(<ShareButton href="/public/paths/react" title="React" labels={labels} />);

    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeTruthy();
    expect(await navigator.clipboard.readText()).toBe(url());
  });

  it("opens a phone's share sheet with the path's title and link, and copies nothing when the sheet is closed", async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    onPhone(share);
    const user = userEvent.setup();
    renderWithLayers(<ShareButton href="/public/paths/react" title="React" labels={labels} />);

    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith({ title: 'React', url: url() });
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy();
  });
});
