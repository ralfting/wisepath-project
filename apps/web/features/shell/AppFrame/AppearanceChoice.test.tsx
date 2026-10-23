import { Menu, UnstyledButton } from '@mantine/core';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithLayers } from '@/test/render';
import { AppearanceChoice } from './AppearanceChoice';

describe('the account menu’s Appearance', () => {
  it('turns the app dark, and keeps the choice on this device', async () => {
    const user = userEvent.setup();
    renderWithLayers(
      <Menu>
        <Menu.Target>
          <UnstyledButton>Account</UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <AppearanceChoice open onToggle={() => {}} />
        </Menu.Dropdown>
      </Menu>,
    );
    await user.click(screen.getByRole('button', { name: 'Account' }));
    // happy-dom lays nothing out, so the menu takes its target for scrolled away and hides itself: hidden finds it anyway
    expect(await screen.findByRole('menuitem', { name: 'Light, in use', hidden: true })).toBeTruthy();

    await user.click(screen.getByRole('menuitem', { name: 'Dark', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Account' }));

    expect(await screen.findByRole('menuitem', { name: 'Dark, in use', hidden: true })).toBeTruthy();
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
    expect(window.localStorage.getItem('mantine-color-scheme-value')).toBe('dark');
  });
});
