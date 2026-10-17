'use client';

import { ActionIcon, Button, Group, Kbd, Text, Tooltip } from '@mantine/core';
import { IconArrowsMaximize } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useT } from '@/i18n/I18nProvider';
import classes from './VideoBlock.module.css';

/**
 * Under the video: its "Note" button, the N key (where there is a keyboard) and fullscreen; or, when YouTube didn't
 * load, saying so with Retry
 */
export function VideoBar({
  failed,
  ready,
  hasKeyboard,
  noteButton,
  onRetry,
  onFullscreen,
}: {
  failed: boolean;
  ready: boolean;
  hasKeyboard: boolean;
  noteButton: ReactNode;
  onRetry: () => void;
  onFullscreen: () => void;
}) {
  const t = useT();
  if (failed && !ready) {
    return (
      <Group gap="xs" mt={8} className={classes.bar} contentEditable={false} role="status">
        <Text size="sm" c="dimmed">
          {t('video.failed')}
        </Text>
        <Button size="compact-sm" variant="subtle" onClick={onRetry}>
          {t('common.actions.retry')}
        </Button>
      </Group>
    );
  }
  return (
    <Group gap="xs" mt={8} className={classes.bar} contentEditable={false}>
      {noteButton}
      {/* The key, where there is a keyboard: N needs the focus on the video. The one that plays a line's
          time shows on the line itself, in the cursor's rail */}
      <Group gap="xs" wrap="nowrap" ml="auto">
        {hasKeyboard && ready && (
          <Text size="xs" c="dimmed" className={classes.keys}>
            <Kbd size="xs">N</Kbd> {t('video.note.key')}
          </Text>
        )}
        <Tooltip label={t('video.fullscreen.enter')}>
          <ActionIcon variant="subtle" color="gray" onClick={onFullscreen} aria-label={t('video.fullscreen.enter')} disabled={!ready}>
            <IconArrowsMaximize size={17} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
