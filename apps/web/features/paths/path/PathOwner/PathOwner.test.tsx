import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithLayers } from '@/test/render';
import { PathOwner } from './PathOwner';

describe('PathOwner', () => {
  it('says whose path it is and that an editor can edit it, on hover', async () => {
    const user = userEvent.setup();
    renderWithLayers(<PathOwner name="Ada" access="editor" size={26} />);

    const owner = screen.getByRole('img', { name: 'Ada’s path. You can edit its pages' });
    await user.hover(owner);
    expect(await screen.findByText('Ada’s path')).toBeTruthy();
    expect(screen.getByText('You can edit its pages')).toBeTruthy();
  });

  it('tells a reader they can read and study it, on keyboard focus', async () => {
    const user = userEvent.setup();
    renderWithLayers(<PathOwner name="Ada" access="viewer" size={26} />);

    await user.tab();
    expect(screen.getByRole('img', { name: 'Ada’s path. You can read and study it' })).toBe(document.activeElement);
    expect(await screen.findByText('You can read and study it')).toBeTruthy();
  });

  it('names no one when the owner has no name', () => {
    renderWithLayers(<PathOwner name={null} access="viewer" size={26} />);

    expect(screen.getByRole('img', { name: 'Someone else’s path. You can read and study it' })).toBeTruthy();
  });

  it('says it in Portuguese', () => {
    renderWithLayers(<PathOwner name="Ada" access="editor" size={26} />, undefined, 'pt-BR');

    expect(screen.getByRole('img', { name: 'Trilha de Ada. Você pode editar as páginas' })).toBeTruthy();
  });
});
