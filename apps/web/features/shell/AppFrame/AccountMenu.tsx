'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Collapse, Avatar, Group, Menu, Stack, Text, UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconChevronDown, IconCheck, IconDownload, IconLanguage, IconLogout, IconSelector } from '@tabler/icons-react';
import { useLogout, useSaveLocale, useSession } from '@/useCases/auth';
import { allPathsDownloadHref } from '@/useCases/paths';
import { useLocale, useT } from '@/i18n/I18nProvider';
import { LOCALES, LOCALE_NAMES } from '@/i18n/locales';
import { Flag } from '@/i18n/Flag';
import type { Locale } from '@/i18n/locales';
import classes from './AppFrame.module.css';

/** The learner's menu at the foot of the sidebar: their language, downloading their paths and logging out */
export function AccountMenu() {
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const t = useT();
  const { locale, setChoice } = useLocale();
  const saveLocale = useSaveLocale();
  // The two languages, shown in the menu itself when its Language item is opened
  const [languagesOpen, setLanguagesOpen] = useState(false);
  // Changes at once here, and on the account for every other device
  const pick = (next: Locale | null) => {
    setChoice(next);
    void saveLocale(next);
  };
  const user = session.status === 'signedIn' ? session.user : null;

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <Menu position="top-start" width="target" withinPortal onClose={() => setLanguagesOpen(false)}>
      <Menu.Target>
        {/* Named by what it shows, after the word for it: a label that hid the name would not match what is read on screen */}
        <UnstyledButton className={classes.accountButton}>
          <VisuallyHidden>{t('shell.account.menu')}</VisuallyHidden>
          <Avatar radius="xl" color="blue" variant="filled" name={user?.displayName} aria-hidden="true" />
          <Stack gap={0} miw={0} style={{ flex: 1 }}>
            <Text size="sm" fw={600} truncate>
              {user?.displayName ?? ' '}
            </Text>
            {/* Without a name the display name is already the email */}
            {user && user.displayName !== user.email && (
              <Text size="xs" c="dimmed" truncate>
                {user.email}
              </Text>
            )}
          </Stack>
          <IconSelector size={16} color="var(--mantine-color-dimmed)" />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {/* The language opens in place, inside this menu: a menu beside it would close as the pointer crossed over */}
        <Menu.Item
          closeMenuOnClick={false}
          onClick={() => setLanguagesOpen((o) => !o)}
          leftSection={<IconLanguage size={16} />}
          rightSection={
            <Group gap={6} wrap="nowrap">
              <Flag locale={locale} size={16} />
              <IconChevronDown size={14} className={classes.languageChevron} data-open={languagesOpen || undefined} aria-hidden />
            </Group>
          }
          aria-expanded={languagesOpen}
        >
          {t('common.language.menu')}
        </Menu.Item>
        <Collapse in={languagesOpen} transitionDuration={160} role="group" aria-label={t('common.language.menu')}>
          {LOCALES.map((option) => {
            const inUse = option === locale;
            const name = LOCALE_NAMES[option];
            return (
              <Menu.Item
                key={option}
                onClick={() => pick(option)}
                leftSection={<Flag locale={option} />}
                rightSection={inUse ? <IconCheck size={14} aria-hidden /> : null}
                // Menu items can't be checked: the one in use says so in its name, and wears a tick
                aria-label={inUse ? t('common.language.current', { name }) : name}
                data-locale-option={option}
                className={classes.languageOption}
              >
                {name}
              </Menu.Item>
            );
          })}
        </Collapse>
        <Menu.Item component="a" href={allPathsDownloadHref()} download leftSection={<IconDownload size={16} />}>
          {t('shell.account.download')}
        </Menu.Item>
        <Menu.Divider role="separator" />
        <Menu.Item leftSection={<IconLogout size={16} />} onClick={onLogout}>
          {t('shell.account.logout')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
