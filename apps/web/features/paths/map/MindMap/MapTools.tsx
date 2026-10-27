'use client';

import { ActionIcon, Divider, Group, HoverCard, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconFocusCentered, IconInfoCircle, IconMinus, IconPlus } from '@tabler/icons-react';
import { DEFAULT_COLOR } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { shade } from '@/features/paths/path';
import { STATUS_KEY, StatusIcon } from '../StatusIcon';
import classes from './MindMap.module.css';

/**
 * Tools for viewing the map, together at the bottom left (the drawer covers the right): zoom out and in, the zoom
 * itself (which fits the whole map), centring on the root, and the legend
 */
export function MapTools({
  zoom,
  rootTitle,
  progress,
  onZoomOut,
  onZoomIn,
  onFit,
  onCentre,
}: {
  zoom: number;
  rootTitle: string;
  progress: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onCentre: () => void;
}) {
  const t = useT();
  return (
    <Group gap={0} className={classes.tools} wrap="nowrap" role="toolbar" aria-label={t('map.tools.label')}>
      <Tooltip label={t('map.tools.zoomOut')}>
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onZoomOut} aria-label={t('map.tools.zoomOut')}>
          <IconMinus size={17} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('map.tools.fit')}>
        <UnstyledButton className={classes.zoomValue} onClick={onFit} aria-label={t('map.tools.fitAt', { zoom: Math.round(zoom * 100) })}>
          {Math.round(zoom * 100)}%
        </UnstyledButton>
      </Tooltip>
      <Tooltip label={t('map.tools.zoomIn')}>
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onZoomIn} aria-label={t('map.tools.zoomIn')}>
          <IconPlus size={17} />
        </ActionIcon>
      </Tooltip>
      <Divider orientation="vertical" className={classes.toolsDivider} />
      <Tooltip label={t('map.tools.centreOn', { title: rootTitle })}>
        <ActionIcon variant="subtle" color="gray" size="lg" onClick={onCentre} aria-label={t('map.tools.centreOn', { title: rootTitle })}>
          <IconFocusCentered size={17} />
        </ActionIcon>
      </Tooltip>
      <Divider orientation="vertical" className={classes.toolsDivider} />
      <HoverCard position="top-start" shadow="md" openDelay={80}>
        <HoverCard.Target>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label={t('map.tools.legend')}>
            <IconInfoCircle size={17} />
          </ActionIcon>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Stack gap={8} aria-label={t('map.tools.legend')}>
            {(progress ? (['done', 'current', 'todo'] as const) : []).map((s) => (
              <Group key={s} gap={8} wrap="nowrap">
                <StatusIcon status={s} />
                <Text size="sm">{t(STATUS_KEY[s])}</Text>
              </Group>
            ))}
            <Group gap={8} wrap="nowrap">
              <svg width="26" height="10" aria-hidden="true">
                <path d="M1,5 L25,5" stroke={shade(DEFAULT_COLOR, 4)} strokeWidth="2.6" strokeLinecap="round" />
              </svg>
              <Text size="sm">{t('map.legend.branch')}</Text>
            </Group>
            <Group gap={8} wrap="nowrap">
              <svg width="26" height="10" aria-hidden="true">
                <path d="M1,5 L19,5" stroke="var(--mantine-color-blue-6)" strokeWidth="2.2" />
                <path d="M17,1 L25,5 L17,9 z" fill="var(--mantine-color-blue-6)" />
              </svg>
              <Text size="sm">{t('map.legend.crossLink')}</Text>
            </Group>
            <Group gap={8} wrap="nowrap">
              <svg width="26" height="10" aria-hidden="true">
                <path d="M1,5 L25,5" stroke="var(--mantine-color-dimmed)" strokeWidth="1.6" strokeDasharray="5 4" strokeLinecap="round" />
              </svg>
              <Text size="sm">{t('map.legend.citation')}</Text>
            </Group>
            <Text size="xs" c="dimmed" maw={260}>
              {t('map.legend.keys')}
            </Text>
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    </Group>
  );
}
