import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { samplePath, summarize } from '@wisepath/domain/paths';
import type { PathSummary } from '@wisepath/domain/paths';
import { renderWithLayers } from '@/test/render';
import * as actions from '@/useCases/paths/actions';
import { LeaveMenu } from './LeaveMenu';

// The Server Action behind leaving is not under test here: asking first is
vi.mock('@/useCases/paths/actions', () => ({ leavePath: vi.fn(async () => ({ ok: true, value: undefined })) }));

const fromOthers = (visibility: PathSummary['visibility']): PathSummary => ({
  ...summarize({ ...samplePath, visibility }, null),
  ownerName: 'Ada',
  access: 'viewer',
});

const openRemove = async (path: PathSummary) => {
  const user = userEvent.setup();
  renderWithLayers(<LeaveMenu path={path} />);
  await user.click(screen.getByRole('button', { name: `More for ${path.title}` }));
  await user.click(await screen.findByRole('menuitem', { name: `Remove ${path.title} from my paths`, hidden: true }));
  return { user, dialog: await screen.findByRole('dialog', { name: 'Remove this path?' }) };
};

beforeEach(() => vi.mocked(actions.leavePath).mockClear());

describe('LeaveMenu', () => {
  it('asks before removing a path from others, saying the learner’s own work on it goes too', async () => {
    const path = fromOthers('public');
    const { user, dialog } = await openRemove(path);

    expect(dialog.textContent).toContain('answers and notes');
    expect(dialog.textContent).toContain('take it again from its link');
    expect(actions.leavePath).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(actions.leavePath).not.toHaveBeenCalled();
  });

  it('removes it once confirmed, and tells a learner invited to a private path they would need a new invite', async () => {
    const path = fromOthers('private');
    const { user, dialog } = await openRemove(path);

    expect(dialog.textContent).toContain('invite you again');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(actions.leavePath).toHaveBeenCalledWith(path.id));
  });
});
