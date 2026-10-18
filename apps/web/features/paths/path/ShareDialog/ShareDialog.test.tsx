import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { samplePath } from '@wisepath/domain/paths';
import { MemoryPathSharing, aShare } from '@/infrastructure/paths/MemoryPathSharing';
import { renderWithLayers } from '@/test/render';
import * as actions from '@/useCases/paths/actions';
import { ShareDialog } from './ShareDialog';

// The Server Actions behind the sharing hooks are not under test here: the dialog is
vi.mock('@/useCases/paths/actions', () => ({
  sharePath: vi.fn(),
  cancelInvite: vi.fn(async () => ({ ok: true, value: undefined })),
  unsharePath: vi.fn(async () => ({ ok: true, value: undefined })),
  setPathVisibility: vi.fn(async () => ({ ok: true, value: undefined })),
  takePath: vi.fn(),
  leavePath: vi.fn(),
}));

const path = samplePath;
const bob = aShare({ name: 'Bob', role: 'editor' });
const waiting = { email: 'dee@wisepath.test', role: 'editor' as const };
const layers = MemoryPathSharing({ shared: { [path.id]: { people: [bob], invites: [waiting] } } });

beforeEach(() => vi.mocked(actions.sharePath).mockReset());

describe('ShareDialog', () => {
  it('lists who has access and who it waits for, adds someone by email, and says why one could not be added', async () => {
    const user = userEvent.setup();
    vi.mocked(actions.sharePath)
      .mockResolvedValueOnce({ ok: true, value: aShare({ name: 'Cy' }) })
      .mockResolvedValueOnce({ ok: false, _tag: 'CannotShareWithSelf', message: 'This is your own path.' });
    renderWithLayers(<ShareDialog path={path} opened onClose={() => {}} />, layers);

    expect(await screen.findByText('Bob')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Access for Bob' }) as HTMLInputElement).value).toBe('Can edit');
    // An email with no account yet waits, with its access, and can be cancelled
    expect(screen.getByText('Waiting for them to sign up with this email')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: `Access for ${waiting.email}` }) as HTMLInputElement).value).toBe('Can edit');
    await user.click(screen.getByRole('button', { name: `Cancel the invite for ${waiting.email}` }));
    await waitFor(() => expect(actions.cancelInvite).toHaveBeenCalledWith(path.id, waiting.email));

    const email = screen.getByLabelText(/^email/i);
    await user.type(email, 'cy@wisepath.test');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(actions.sharePath).toHaveBeenCalledWith(path.id, 'cy@wisepath.test', 'viewer'));
    await waitFor(() => expect((email as HTMLInputElement).value).toBe(''));

    await user.type(email, 'me@wisepath.test');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('This is your own path.')).toBeTruthy();
    expect((email as HTMLInputElement).value).toBe('me@wisepath.test');
  });

  it('asks for a valid email before sending anything', async () => {
    const user = userEvent.setup();
    renderWithLayers(<ShareDialog path={path} opened onClose={() => {}} />, layers);
    await user.type(await screen.findByLabelText(/^email/i), 'not an email');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(actions.sharePath).not.toHaveBeenCalled();
  });

  it('makes the path public and offers its link, then private again', async () => {
    const user = userEvent.setup();
    renderWithLayers(<ShareDialog path={path} opened onClose={() => {}} />, layers);

    // The switch's label wraps its description too, so its name starts with the label
    const toggle = await screen.findByRole('switch', { name: /^anyone with the link can read/i });
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
    await user.click(toggle);
    await waitFor(() => expect(actions.setPathVisibility).toHaveBeenCalledWith(path.id, 'public'));
    expect(await screen.findByRole('button', { name: 'Copy link' })).toBeTruthy();

    await user.click(toggle);
    await waitFor(() => expect(actions.setPathVisibility).toHaveBeenLastCalledWith(path.id, 'private'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull());
  });
});
