import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
import { QuickCapture } from './QuickCapture';

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
});
