import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Layer } from 'effect';
import { PathId } from '@wisepath/domain/paths';
import type { PendingPublication } from '@wisepath/domain/paths';
import { renderWithLayers } from '@/test/render';
import * as actions from '@/useCases/paths/actions';
import { PublicationQueue } from './PublicationQueue';

// The decision is a Server Action, which no Layer reaches; the queue around it is under test
vi.mock('@/useCases/paths/actions', () => ({ decidePublication: vi.fn() }));
// The app frame reads the route; the queue does not depend on it
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/publications', useRouter: () => ({ push: vi.fn() }) }));

const now = Date.parse('2026-10-18T12:00:00Z');
const request: PendingPublication = {
  pathId: PathId.make('react-tests'),
  title: 'Testes em React',
  description: 'Testar componentes pelo que a pessoa vê',
  audience: 'Frontend developers',
  language: 'pt-BR',
  pages: 12,
  ownerName: 'Ada',
  ownerEmail: 'ada@wisepath.test',
  requestedAt: '2026-10-18T10:00:00Z',
};

describe('PublicationQueue', () => {
  it('shows each request with what is needed to decide, and approves one', async () => {
    vi.mocked(actions.decidePublication).mockResolvedValueOnce({ ok: true, value: undefined });
    const user = userEvent.setup();
    renderWithLayers(<PublicationQueue requests={[request]} now={now} />, Layer.empty);

    expect(screen.getByRole('heading', { name: 'Testes em React' })).toBeTruthy();
    expect(screen.getByText('For: Frontend developers · Written in Português (Brasil) · 12 pages')).toBeTruthy();
    expect(screen.getByText('By Ada · Asked 2 hours ago')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Read it' }).getAttribute('href')).toBe('/public/paths/react-tests');

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(actions.decidePublication).toHaveBeenCalledWith('react-tests', true));
  });

  it('says when a request was already decided, after declining it', async () => {
    vi.mocked(actions.decidePublication).mockResolvedValueOnce({
      ok: false,
      _tag: 'PathNotFound',
      message: 'This request was already decided or withdrawn.',
    });
    const user = userEvent.setup();
    renderWithLayers(<PublicationQueue requests={[request]} now={now} />, Layer.empty);

    await user.click(screen.getByRole('button', { name: 'Decline' }));
    expect((await screen.findByRole('alert')).textContent).toBe('This request was already decided or withdrawn.');
    expect(actions.decidePublication).toHaveBeenCalledWith('react-tests', false);
  });

  it('says when nothing is waiting', () => {
    renderWithLayers(<PublicationQueue requests={[]} now={now} />, Layer.empty);
    expect(screen.getByText('Nothing is waiting for review.')).toBeTruthy();
  });
});
