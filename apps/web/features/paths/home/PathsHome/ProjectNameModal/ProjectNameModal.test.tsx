import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Layer } from 'effect';
import { MemoryAuth } from '@/infrastructure/auth/MemoryAuth';
import { MemoryProjectRepository, aProject } from '@/infrastructure/projects/MemoryProjectRepository';
import { renderWithLayers } from '@/test/render';
import { ProjectNameModal } from './ProjectNameModal';

// The Server Actions behind the project hooks are not under test here: the form is
vi.mock('@/useCases/projects/actions', () => ({
  createProject: vi.fn(async (name: string) => ({ ok: true, value: { id: 'new', name, isDefault: false } })),
  renameProject: vi.fn(async () => ({ ok: true, value: undefined })),
  removeProject: vi.fn(async () => ({ ok: true, value: undefined })),
}));

const work = aProject({ name: 'Work' });
const languages = aProject({ name: 'Languages' });
const layers = Layer.mergeAll(MemoryAuth(), MemoryProjectRepository([work, languages]));

describe('ProjectNameModal', () => {
  it('starts from the project it renames each time it opens, and empty for a new one', async () => {
    const user = userEvent.setup();
    const view = renderWithLayers(<ProjectNameModal opened project={work} onClose={() => {}} />, layers);
    const field = await screen.findByLabelText(/^name/i);
    expect((field as HTMLInputElement).value).toBe('Work');
    await user.clear(field);
    await user.type(field, 'Half-typed');

    view.rerender(<ProjectNameModal opened={false} project={work} onClose={() => {}} />);
    await waitFor(() => expect(screen.queryByLabelText(/^name/i)).toBeNull());
    view.rerender(<ProjectNameModal opened project={languages} onClose={() => {}} />);
    expect(((await screen.findByLabelText(/^name/i)) as HTMLInputElement).value).toBe('Languages');

    view.rerender(<ProjectNameModal opened={false} onClose={() => {}} />);
    await waitFor(() => expect(screen.queryByLabelText(/^name/i)).toBeNull());
    view.rerender(<ProjectNameModal opened onClose={() => {}} />);
    expect(((await screen.findByLabelText(/^name/i)) as HTMLInputElement).value).toBe('');
  });

  it('asks for a name before saving, and closes once saved', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithLayers(<ProjectNameModal opened onClose={onClose} />, layers);
    await user.click(await screen.findByRole('button', { name: 'Create project' }));
    expect(await screen.findByText('Give the project a name')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^name/i), 'Music');
    await user.click(screen.getByRole('button', { name: 'Create project' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
