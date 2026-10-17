import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
import { LoginForm } from './LoginForm';

// Next's router is the one dependency here that isn't a domain service
const navigation = vi.hoisted(() => ({ push: vi.fn(), next: null as string | null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.next ? { next: navigation.next } : {}),
}));

const ada = { email: 'ada@example.com', password: 'correct-horse', name: 'Ada' };

async function logIn(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText(/^email/i), email);
  if (password) await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('LoginForm', () => {
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.next = null;
  });

  it('logs in and goes to the paths page', async () => {
    renderWithLayers(<LoginForm />, MemoryAuth([ada]));
    await logIn(ada.email, ada.password);
    await vi.waitFor(() => expect(navigation.push).toHaveBeenCalledWith('/paths'));
  });

  it('goes back to the page that asked for the login, but never to another site', async () => {
    navigation.next = '/inbox';
    const { unmount } = renderWithLayers(<LoginForm />, MemoryAuth([ada]));
    await logIn(ada.email, ada.password);
    await vi.waitFor(() => expect(navigation.push).toHaveBeenCalledWith('/inbox'));
    unmount();

    navigation.next = '//evil.example';
    renderWithLayers(<LoginForm />, MemoryAuth([ada]));
    await logIn(ada.email, ada.password);
    await vi.waitFor(() => expect(navigation.push).toHaveBeenLastCalledWith('/paths'));
  });

  it('shows every field error when submitted empty, and calls nothing', async () => {
    renderWithLayers(<LoginForm />, MemoryAuth([ada]));
    await logIn('', '');
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(screen.getByText('Enter your password')).toBeTruthy();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('says the email or password is wrong and stays on the page', async () => {
    renderWithLayers(<LoginForm />, MemoryAuth([ada]));
    await logIn(ada.email, 'wrong-horse');
    expect((await screen.findByRole('alert')).textContent).toBe('Email or password is incorrect.');
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('speaks Portuguese when the learner does', async () => {
    renderWithLayers(<LoginForm />, MemoryAuth([ada]), 'pt-BR');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Entrar');
    expect(screen.getByLabelText(/^senha/i)).toBeTruthy();
  });
});
