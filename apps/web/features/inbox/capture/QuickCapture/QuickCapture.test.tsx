import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
import { QuickCapture } from './QuickCapture';

// A phone: a touch screen with no pointer that hovers, which happy-dom has no way to say
function onPhone() {
  const matchMedia = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => Object.defineProperty(matchMedia(query), 'matches', { value: false }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QuickCapture', () => {
  it('starts blank every time it opens, whatever was typed before', async () => {
    const user = userEvent.setup();
    const props = { onClose: () => {}, page: null, onDone: () => {} };
    const view = renderWithLayers(<QuickCapture opened {...props} />, MemoryAuth());
    await user.type(await screen.findByRole('textbox', { name: 'What do you want to keep?' }), 'Half a thought');

    view.rerender(<QuickCapture opened={false} {...props} />);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'What do you want to keep?' })).toBeNull());
    view.rerender(<QuickCapture opened {...props} />);
    expect(((await screen.findByRole('textbox', { name: 'What do you want to keep?' })) as HTMLTextAreaElement).value).toBe('');
  });

  it('on a phone, takes Enter as a new line and saves from its button', async () => {
    onPhone();
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDone = vi.fn();
    renderWithLayers(<QuickCapture opened onClose={onClose} page={null} onDone={onDone} />, MemoryAuth());
    const field = await screen.findByRole('textbox', { name: 'What do you want to keep?' });

    await user.type(field, 'First line{Enter}second line');
    expect((field as HTMLTextAreaElement).value).toBe('First line\nsecond line');
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClose).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith('Saved to the Inbox');
  });
});
