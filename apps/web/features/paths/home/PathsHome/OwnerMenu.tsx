'use client';

import { useState } from 'react';
import { ActionIcon, Menu } from '@mantine/core';
import { IconDotsVertical, IconDownload, IconFolderShare, IconTrash } from '@tabler/icons-react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';
import { pathDownloadHref, useSetPathKind } from '@/useCases/paths';
import { KindSwitchItem } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import classes from './PathsHome.module.css';
import { DeleteMapModal } from './DeleteMapModal';

/** The owner's menu on a path card: its kind, moving it to another project, downloading it, deleting it */
export function OwnerMenu({
  path,
  projects,
  onMove,
  onKindError,
}: {
  path: PathSummary;
  projects: ReadonlyArray<Project>;
  onMove: (path: PathSummary, to: Project) => void;
  onKindError: (message: string | null) => void;
}) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);
  const setKind = useSetPathKind();
  const elsewhere = projects.filter((p) => p.id !== path.projectId);
  return (
    <>
      <Menu position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" aria-label={t('home.card.more', { title: path.title })} className={classes.action}>
            <IconDotsVertical size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <KindSwitchItem kind={path.kind} onSwitch={async (kind) => onKindError(await setKind(path.id, kind))} />
          {elsewhere.length > 0 && (
            <Menu.Sub position="left-start">
              <Menu.Sub.Target>
                <Menu.Sub.Item leftSection={<IconFolderShare size={15} />}>{t('home.card.moveTo')}</Menu.Sub.Item>
              </Menu.Sub.Target>
              <Menu.Sub.Dropdown>
                {elsewhere.map((project) => (
                  <Menu.Item key={project.id} onClick={() => onMove(path, project)}>
                    {project.name}
                  </Menu.Item>
                ))}
              </Menu.Sub.Dropdown>
            </Menu.Sub>
          )}
          <Menu.Item component="a" href={pathDownloadHref(path.id)} download leftSection={<IconDownload size={15} />}>
            {t('home.card.download')}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setDeleting(true)}>
            {t('home.card.delete')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <DeleteMapModal opened={deleting} path={path} onClose={() => setDeleting(false)} />
    </>
  );
}
