'use client';

import { useState } from 'react';
import { ActionIcon, Box, Button, Group, Menu, Text, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { IconDots, IconShare } from '@tabler/icons-react';
import type { Page, PageColor, PageIcon, Path } from '@wisepath/domain/paths';
import { canManage } from '@wisepath/domain/paths';
import type { PathActions, SaveState } from '@/useCases/paths';
import { KindSwitchItem, PageGlyph, PathOwner, SaveStatus, ShareDialog } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import { ContinueButton } from '../ContinueButton/ContinueButton';
import classes from './PathMap.module.css';

/** The map's top bar: its title and look, its menu and Share (the owner's) or whose it is (for anyone else), what is still being saved, and a learning path's way on */
export function MapHeader({
  path,
  actions,
  save,
  look,
  progress,
  next,
  studied,
  total,
  onContinue,
}: {
  path: Path;
  actions: PathActions;
  save: SaveState;
  look: { readonly color: PageColor; readonly icon: PageIcon };
  progress: boolean;
  next: Page | undefined;
  studied: number;
  total: number;
  onContinue: () => void;
}) {
  const t = useT();
  const [sharing, setSharing] = useState(false);
  return (
    <Group gap="md" wrap="nowrap" miw={0} style={{ flex: 1 }} className={classes.header}>
      <Group gap="sm" wrap="nowrap" miw={0} style={{ flex: 1 }}>
        {/* On a phone the title needs the room more than the icon does */}
        <ThemeIcon visibleFrom="sm" size={36} radius="xl" variant="light" color={look.color} style={{ flexShrink: 0 }}>
          <PageGlyph icon={look.icon} size={20} />
        </ThemeIcon>
        <Tooltip label={path.description} disabled={!path.description} multiline w={320} position="bottom-start" withArrow>
          <Title order={1} lts={-0.3} lh={1.2} className={classes.title}>
            {path.title}
          </Title>
        </Tooltip>
        {/* Whose it is, where the owner has Share; on a phone the avatar alone */}
        {!canManage(path.access) && (
          <Group gap="xs" wrap="nowrap" miw={0} style={{ flexShrink: 0 }}>
            <PathOwner name={path.ownerName} access={path.access} size={26} />
            {path.ownerName && (
              <Text visibleFrom="sm" size="sm" c="dimmed" truncate maw={160}>
                {path.ownerName}
              </Text>
            )}
          </Group>
        )}
        {/* What can be done to the path itself, by its owner */}
        {canManage(path.access) && (
          <Menu position="bottom-start">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('map.header.more', { title: path.title })} style={{ flexShrink: 0 }}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {/* On a phone Share waits in this menu, so the title keeps the room to be read */}
              <Menu.Item hiddenFrom="sm" leftSection={<IconShare size={14} />} onClick={() => setSharing(true)}>
                {t('share.open')}
              </Menu.Item>
              <KindSwitchItem kind={path.kind} onSwitch={actions.setKind} />
            </Menu.Dropdown>
          </Menu>
        )}
        {canManage(path.access) && (
          <Button
            visibleFrom="sm"
            variant="default"
            size="xs"
            leftSection={<IconShare size={14} />}
            onClick={() => setSharing(true)}
            aria-label={t('share.openFor', { title: path.title })}
            style={{ flexShrink: 0 }}
          >
            {t('share.open')}
          </Button>
        )}
        <ShareDialog path={path} opened={sharing} onClose={() => setSharing(false)} />
        {/* Only while something is on its way, or was undone */}
        <Box visibleFrom="sm" style={{ flexShrink: 0 }}>
          <SaveStatus save={save} hideSaved />
        </Box>
      </Group>
      {/* Progress and the way on, as one control; a study's top bar keeps just its title */}
      {progress && (
        <>
          <Box className={classes.continueFull}>
            <ContinueButton next={next} studied={studied} total={total} onContinue={onContinue} />
          </Box>
          <Box className={classes.continueCompact}>
            <ContinueButton next={next} studied={studied} total={total} onContinue={onContinue} compact />
          </Box>
        </>
      )}
    </Group>
  );
}
