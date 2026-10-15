'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Code, CopyButton, List, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy, IconRoute } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { AppFrame } from '@/features/shell/AppFrame';
import { bookmarkletHref } from './bookmarklet';
import { useCaptureKeys } from './keys';
import classes from './CaptureSettingsPage.module.css';

/**
 * CaptureSettingsPage
 * Where the Send to WisePath bookmark is offered: a button to drag to the
 * bookmarks bar, how to use it, and its address to copy for whoever can't
 * drag (from the keyboard, or a browser that won't take it).
 */

export function CaptureSettingsPage() {
  const t = useT();
  const mac = useCaptureKeys().startsWith('⌘');
  // The script opens this app, so it's made in the browser, where the app's address is known
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => setHref(bookmarkletHref(window.location.origin)), []);

  return (
    <AppFrame crumbs={[{ label: t('capture.settings.crumb') }, { label: t('capture.settings.title') }]}>
      <Stack gap="lg" px={{ base: 'md', sm: 'xl' }} pb="xl" maw={720} w="100%">
        <Stack gap={4}>
          <Title order={1} fz={34} lts={-0.6}>
            {t('capture.settings.title')}
          </Title>
          <Text c="dimmed">{t('capture.settings.intro')}</Text>
        </Stack>

        <Paper withBorder radius="lg" p="lg" component="section" aria-labelledby="capture-steps">
          <Title order={2} fz="lg" mb="sm" id="capture-steps">
            {t('capture.settings.steps.label')}
          </Title>
          <List type="ordered" spacing="md">
            <List.Item>{t('capture.settings.steps.bar', { keys: mac ? '⌘⇧B' : 'Ctrl+Shift+B' })}</List.Item>
            <List.Item>
              <Stack gap="xs" align="flex-start">
                <Text>{t('capture.settings.steps.drag')}</Text>
                <Bookmarklet href={href} />
              </Stack>
            </List.Item>
            <List.Item>{t('capture.settings.steps.use')}</List.Item>
          </List>
        </Paper>

        <Stack gap="xs">
          <Text size="sm">
            {t('capture.settings.video')} <Code>- [12:34] …</Code>
          </Text>
          <Text size="sm">{t('capture.settings.login')}</Text>
        </Stack>

        <Stack gap="xs" align="flex-start">
          <Text size="sm" c="dimmed">
            {t('capture.settings.copy.intro')}
          </Text>
          <CopyButton value={href ?? ''}>
            {({ copied, copy }) => (
              <Button
                variant="default"
                size="sm"
                onClick={copy}
                disabled={!href}
                leftSection={copied ? <IconCheck size={16} aria-hidden /> : <IconCopy size={16} aria-hidden />}
              >
                {copied ? t('capture.settings.copy.done') : t('capture.settings.copy.button')}
              </Button>
            )}
          </CopyButton>
        </Stack>
      </Stack>
    </AppFrame>
  );
}

/**
 * The bookmark itself, a link to drag. React refuses javascript: addresses in
 * href, so it is set on the element directly; clicking it here does nothing
 * but say what it is for.
 */
function Bookmarklet({ href }: { href: string | null }) {
  const t = useT();
  const ref = useRef<HTMLAnchorElement>(null);
  const [hinted, setHinted] = useState(false);
  useEffect(() => {
    if (href) ref.current?.setAttribute('href', href);
  }, [href]);

  return (
    <Tooltip label={t('capture.settings.dragHint')} opened={hinted || undefined} withArrow>
      <a
        ref={ref}
        className={classes.bookmarklet}
        draggable
        onClick={(event) => {
          event.preventDefault();
          setHinted(true);
        }}
        onBlur={() => setHinted(false)}
        onMouseLeave={() => setHinted(false)}
      >
        <IconRoute size={16} stroke={2} aria-hidden />
        {t('capture.settings.bookmarklet')}
      </a>
    </Tooltip>
  );
}
