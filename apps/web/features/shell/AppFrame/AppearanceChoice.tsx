'use client';

import { Collapse, Menu, useMantineColorScheme } from '@mantine/core';
import type { MantineColorScheme } from '@mantine/core';
import { IconCheck, IconChevronDown, IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import classes from './AppFrame.module.css';

const SCHEMES: ReadonlyArray<{ value: MantineColorScheme; icon: Icon; message: TranslationKey }> = [
  { value: 'light', icon: IconSun, message: 'common.appearance.light' },
  { value: 'dark', icon: IconMoon, message: 'common.appearance.dark' },
  { value: 'auto', icon: IconDeviceDesktop, message: 'common.appearance.system' },
];

/**
 * The account menu's Appearance: light, dark or the device's setting, opened in place like the language.
 * Kept per device by Mantine; rendered only once the menu opens, so the stored choice never meets the server's render.
 */
export function AppearanceChoice({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useT();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const current = SCHEMES.find((scheme) => scheme.value === colorScheme) ?? SCHEMES[0];

  return (
    <>
      <Menu.Item
        closeMenuOnClick={false}
        onClick={onToggle}
        leftSection={<current.icon size={16} />}
        rightSection={<IconChevronDown size={14} className={classes.choiceChevron} data-open={open || undefined} aria-hidden />}
        aria-expanded={open}
      >
        {t('common.appearance.menu')}
      </Menu.Item>
      <Collapse in={open} transitionDuration={160} role="group" aria-label={t('common.appearance.menu')}>
        {SCHEMES.map((scheme) => {
          const inUse = scheme.value === colorScheme;
          const name = t(scheme.message);
          return (
            <Menu.Item
              key={scheme.value}
              onClick={() => setColorScheme(scheme.value)}
              leftSection={<scheme.icon size={16} />}
              rightSection={inUse ? <IconCheck size={14} aria-hidden /> : null}
              // Menu items can't be checked: the one in use says so in its name, and wears a tick
              aria-label={inUse ? t('common.appearance.current', { name }) : name}
              className={classes.choiceOption}
            >
              {name}
            </Menu.Item>
          );
        })}
      </Collapse>
    </>
  );
}
