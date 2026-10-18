import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
import { DeleteAccountModal } from './DeleteAccountModal';

// Next's router is the one dependency here that isn't a domain service
const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: navigation.replace }) }));

const ada = { email: 'ada@example.com', password: 'correct-horse', name: 'Ada' };

async function confirmWith(password: string) {
  const user = userEvent.setup();
  if (password) await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole('button', { name: 'Delete account' }));
}

describe('DeleteAccountModal', () => {
  beforeEach(() => navigation.replace.mockReset());

  it('offers the download first, and deletes the account with its password, then goes to the login page', async () => {
    renderWithLayers(<DeleteAccountModal opened onClose={() => {}} />, MemoryAuth([ada], { signedIn: ada.email }));
    expect(screen.getByRole('link', { name: 'Download my paths first' }).getAttribute('href')).toMatch(/\/paths\/export$/);
    await confirmWith(ada.password);
    await vi.waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/login'));
  });

  it('asks for the password when it is left empty, and deletes nothing', async () => {
    renderWithLayers(<DeleteAccountModal opened onClose={() => {}} />, MemoryAuth([ada], { signedIn: ada.email }));
    await confirmWith('');
    expect(await screen.findByText('Enter your password')).toBeTruthy();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('says a wrong password is wrong and keeps the account', async () => {
    renderWithLayers(<DeleteAccountModal opened onClose={() => {}} />, MemoryAuth([ada], { signedIn: ada.email }));
    await confirmWith('wrong-horse');
    expect((await screen.findByRole('alert')).textContent).toBe("That password isn't right.");
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
