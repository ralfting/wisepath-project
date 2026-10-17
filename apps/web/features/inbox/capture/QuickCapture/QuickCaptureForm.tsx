'use client';

import { ActionIcon, Group, Image, Loader, Text, Textarea, Tooltip } from '@mantine/core';
import { IconLink, IconX } from '@tabler/icons-react';
import { formatTime } from '@wisepath/domain/inbox';
import type { PageTarget } from '@/useCases/inbox';
import { useT } from '@/i18n/I18nProvider';
import classes from './QuickCapture.module.css';
import { Destination } from './Destination';
import { useQuickCaptureForm } from './useQuickCaptureForm';
import type { CaptureSavers } from './useQuickCaptureForm';

/** Quick capture's field, the pasted link under it, and where the text goes */
export function QuickCaptureForm({
  page,
  savers,
  onClose,
  onDone,
}: {
  page: PageTarget | null;
  savers: CaptureSavers;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const t = useT();
  const { state, operations } = useQuickCaptureForm({ page, savers, onClose, onDone });
  const shown = state.shownLink;
  return (
    <>
    <Textarea
      aria-label={t('inbox.capture.field')}
      placeholder={t('inbox.capture.placeholder')}
      value={state.text}
      onChange={(event) => operations.setText(event.currentTarget.value)}
      onPaste={operations.paste}
      onKeyDown={operations.keyDown}
      autosize
      minRows={2}
      maxRows={10}
      variant="unstyled"
      size="md"
      data-autofocus
      classNames={{ input: classes.field }}
    />
    {shown && (
      <Group gap={8} wrap="nowrap" className={classes.link}>
        {shown.loading ? (
          <Loader size={14} aria-label={t('inbox.capture.link.loading')} />
        ) : shown.favicon ? (
          <Image src={shown.favicon} alt="" w={16} h={16} />
        ) : (
          <IconLink size={16} aria-hidden />
        )}
        <Text size="sm" truncate style={{ flex: 1 }}>
          {shown.title ?? shown.url}
          {shown.videoTime !== undefined && (
            <Text span size="sm" c="dimmed">
              {' '}
              {t('inbox.capture.link.at', { time: formatTime(shown.videoTime) })}
            </Text>
          )}
        </Text>
        <Tooltip label={t('inbox.capture.link.remove')}>
          <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('inbox.capture.link.remove')} onClick={operations.removeLink}>
            <IconX size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    )}
    {page && <Destination page={page} toPage={state.toPage} onChange={operations.setToPage} onTitle={operations.rememberTitle} />}
    </>
  );
}
