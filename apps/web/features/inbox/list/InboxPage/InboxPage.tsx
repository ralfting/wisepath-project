'use client';

import { Button, Group, Kbd, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconInbox, IconPlus } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { AppFrame } from '@/features/shell';
import { openCapture } from '@/features/inbox/capture';
import { PagePicker } from '../PagePicker/PagePicker';
import classes from './InboxPage.module.css';
import { InboxRow } from './InboxRow';
import { useInboxPage } from './useInboxPage';

/**
 * Everything captured and not yet added to a page, newest first. Each item can be added
 * to a page, made a page of its own, or deleted, from the keyboard too:
 * ↑ ↓ move between items, A adds to a page, D deletes, Enter opens where it came from.
 */
export function InboxPage() {
  const t = useT();
  const { state, operations } = useInboxPage();
  const { items, captureKeys: keys, hasKeyboard } = state;

  return (
    <AppFrame
      crumbs={[{ label: t('inbox.title') }]}
      tools={
        <Button leftSection={<IconPlus size={16} />} onClick={openCapture} rightSection={hasKeyboard ? <Kbd size="xs">{keys}</Kbd> : undefined}>
          {t('inbox.capture.label')}
        </Button>
      }
    >
      <Stack gap="lg" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={820} w="100%">
        <Stack gap={4}>
          <Title order={1} fz={34} lts={-0.6}>
            {t('inbox.title')}
          </Title>
          <Text c="dimmed">{t('inbox.intro')}</Text>
        </Stack>

        {state.status === 'loading' ? (
          <Group gap="xs" role="status">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('inbox.list.loading')}
            </Text>
          </Group>
        ) : state.status === 'unavailable' ? (
          <Text c="dimmed" role="alert">
            {t('inbox.errors.unavailable')}
          </Text>
        ) : items.length === 0 ? (
          <Paper withBorder radius="lg" p="xl" className={classes.empty}>
            <Stack align="center" gap="xs" ta="center">
              <IconInbox size={36} stroke={1.4} aria-hidden color="var(--mantine-color-dimmed)" />
              <Title order={2} fz="lg">
                {t('inbox.empty.title')}
              </Title>
              <Text c="dimmed" size="sm" maw={420}>
                {hasKeyboard ? t('inbox.empty.body', { keys }) : t('inbox.empty.bodyTouch')}
              </Text>
            </Stack>
          </Paper>
        ) : (
          <>
            {hasKeyboard && (
              <Text size="xs" c="dimmed">
                {t('inbox.list.keys')}
              </Text>
            )}
            <ul className={classes.list} aria-label={t('inbox.list.label')}>
              {items.map((item, index) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  ref={operations.rowRef(item)}
                  onKeyDown={(event) => operations.keyDown(event, item, index)}
                  onFile={() => operations.file(item)}
                  onMakePage={() => operations.makePage(item)}
                  onDelete={() => operations.remove(item)}
                />
              ))}
            </ul>
          </>
        )}
      </Stack>
      <PagePicker
        opened={state.picking !== null}
        title={state.picking === 'makePage' ? t('inbox.picker.makeTitle') : t('inbox.picker.fileTitle')}
        onClose={operations.closePicker}
        onPick={operations.pick}
      />
    </AppFrame>
  );
}
