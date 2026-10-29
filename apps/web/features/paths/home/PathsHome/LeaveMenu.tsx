'use client';

import { useState } from 'react';
import { ActionIcon, Menu } from '@mantine/core';
import { IconDotsVertical, IconLogout } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { LeavePathModal } from './LeavePathModal';
import classes from './PathsHome.module.css';

/** The menu on a path from others: removing it from the learner's paths, which takes their own work on it too */
export function LeaveMenu({ path }: { path: PathSummary }) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Menu position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" aria-label={t('home.card.more', { title: path.title })} className={classes.action}>
            <IconDotsVertical size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconLogout size={15} />} onClick={() => setConfirming(true)} aria-label={t('share.from.leaveFor', { title: path.title })}>
            {t('share.from.leave')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <LeavePathModal opened={confirming} path={path} onClose={() => setConfirming(false)} />
    </>
  );
}
