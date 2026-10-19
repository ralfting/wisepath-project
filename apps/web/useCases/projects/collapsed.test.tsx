import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithLayers } from '@/test/render';
import { useCollapsedProjects } from './collapsed';

// What My paths needs from it: whether a project is folded, and folding it
function Projects() {
  const { collapsed, toggle } = useCollapsedProjects();
  return (
    <>
      {['work', 'languages'].map((id) => (
        <button key={id} onClick={() => toggle(id)} aria-expanded={!collapsed.has(id)}>
          {id}
        </button>
      ))}
    </>
  );
}

describe('folded projects', () => {
  beforeEach(() => localStorage.clear());

  it('stay folded after a reload, and unfold again', async () => {
    const user = userEvent.setup();
    const first = renderWithLayers(<Projects />);
    await user.click(screen.getByRole('button', { name: 'work' }));
    expect(screen.getByRole('button', { name: 'work' }).getAttribute('aria-expanded')).toBe('false');
    first.unmount();

    renderWithLayers(<Projects />);
    expect((await screen.findByRole('button', { name: 'work', expanded: false })).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'languages' }).getAttribute('aria-expanded')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'work' }));
    expect(screen.getByRole('button', { name: 'work' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('opens every project when what was stored is not a list of projects', () => {
    localStorage.setItem('wisepath:collapsed-projects', '{"work":true}');
    renderWithLayers(<Projects />);
    expect(screen.getByRole('button', { name: 'work' }).getAttribute('aria-expanded')).toBe('true');
  });
});
