'use client';

import { ActionIcon, Menu } from '@mantine/core';
import { IconDotsVertical, IconLogout } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import { useLeavePath } from '@/useCases/paths';
import { showToast } from '@/features/inbox/capture';
import { useT } from '@/i18n/I18nProvider';
import classes from './PathsHome.module.css';

/** The menu on a path from others: leaving it, which takes the learner's marks on it too */
export function LeaveMenu({ path }: { path: PathSummary }) {
  const t = useT();
  const leave = useLeavePath();

  const handleLeave = async () => {
    const failed = await leave(path.id);
    showToast({ text: failed ? `${t('share.from.leaveFailed', { title: path.title })} ${failed}` : t('share.from.left', { title: path.title }) });
  };

  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={t('home.card.more', { title: path.title })} className={classes.action}>
          <IconDotsVertical size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconLogout size={15} />} onClick={() => void handleLeave()} aria-label={t('share.from.leaveFor', { title: path.title })}>
          {t('share.from.leave')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
