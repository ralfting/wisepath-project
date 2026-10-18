'use client';

import { useState } from 'react';
import { ActionIcon, Box, Button, Group, Menu, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { IconDots, IconShare } from '@tabler/icons-react';
import type { Page, PageColor, PageIcon, Path } from '@wisepath/domain/paths';
import { canManage } from '@wisepath/domain/paths';
import type { PathActions, SaveState } from '@/useCases/paths';
import { KindSwitchItem, PageGlyph, SaveStatus, ShareDialog } from '@/features/paths/path';
import { useT } from '@/i18n/I18nProvider';
import { ContinueButton } from '../ContinueButton/ContinueButton';

/** The map's top bar: its title and look, its menu and Share (the owner's), what is still being saved, and a learning path's way on */
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
    <Group gap="md" wrap="nowrap" miw={0} style={{ flex: 1 }}>
      <Group gap="sm" wrap="nowrap" miw={0} style={{ flex: 1 }}>
        {/* On a phone the title needs the room more than the icon does */}
        <ThemeIcon visibleFrom="sm" size={36} radius="xl" variant="light" color={look.color} style={{ flexShrink: 0 }}>
          <PageGlyph icon={look.icon} size={20} />
        </ThemeIcon>
        <Tooltip label={path.description} disabled={!path.description} multiline w={320} position="bottom-start" withArrow>
          <Title order={1} fz={20} lts={-0.3} lh={1.2} lineClamp={1}>
            {path.title}
          </Title>
        </Tooltip>
        {/* What can be done to the path itself, by its owner */}
        {canManage(path.access) && (
          <Menu position="bottom-start">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('map.header.more', { title: path.title })} style={{ flexShrink: 0 }}>
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <KindSwitchItem kind={path.kind} onSwitch={actions.setKind} />
            </Menu.Dropdown>
          </Menu>
        )}
        {/* On a phone the button is its icon, so the title and the way on keep their room */}
        {canManage(path.access) && (
          <>
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
            <ActionIcon
              hiddenFrom="sm"
              variant="default"
              onClick={() => setSharing(true)}
              aria-label={t('share.openFor', { title: path.title })}
              style={{ flexShrink: 0 }}
            >
              <IconShare size={16} />
            </ActionIcon>
          </>
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
          <Box visibleFrom="sm">
            <ContinueButton next={next} studied={studied} total={total} onContinue={onContinue} />
          </Box>
          <Box hiddenFrom="sm">
            <ContinueButton next={next} studied={studied} total={total} onContinue={onContinue} compact />
          </Box>
        </>
      )}
    </Group>
  );
}
