import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { renderWithLayers } from '@/test/render';
import * as actions from '@/useCases/paths/actions';
import { StudyThisPath } from './StudyThisPath';

// Next's router is the one dependency here that isn't a domain service, and taking a path is a Server Action
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: navigation.push }) }));
vi.mock('@/useCases/paths/actions', () => ({ takePath: vi.fn(async () => ({ ok: true, value: undefined })) }));

const ada = { email: 'ada@example.com', password: 'correct-horse', name: 'Ada' };
const reading = '/public/paths/react';

afterEach(() => window.history.replaceState(null, '', '/'));

describe('StudyThisPath', () => {
  it('sends a visitor to sign up or log in with their wish to study the path kept for the way back', async () => {
    renderWithLayers(<StudyThisPath pathId="react" readingHref={reading} />, MemoryAuth([ada]));

    const back = encodeURIComponent(`${reading}?study`);
    expect((await screen.findByRole('link', { name: 'Log in to study it' })).getAttribute('href')).toBe(`/login?next=${back}`);
    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe(`/signup?next=${back}`);
    expect(actions.takePath).not.toHaveBeenCalled();
  });

  it('takes the path and opens it for a learner back from logging in to study it', async () => {
    window.history.replaceState(null, '', `${reading}?study`);
    renderWithLayers(<StudyThisPath pathId="react" readingHref={reading} />, MemoryAuth([ada], { signedIn: ada.email }));

    await vi.waitFor(() => expect(actions.takePath).toHaveBeenCalledWith('react'));
    await vi.waitFor(() => expect(navigation.push).toHaveBeenCalledWith('/paths/react'));
  });
});
