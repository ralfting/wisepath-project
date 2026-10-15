'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Anchor, Button, Center, Group, Image, Loader, Paper, Stack, Text, Textarea, ThemeIcon, Title, VisuallyHidden } from '@mantine/core';
import { IconCheck, IconLink, IconRoute } from '@tabler/icons-react';
import { formatTime } from '@wisepath/domain/inbox';
import { useT } from '@/i18n/I18nProvider';
import { useLogout, useSession } from '@/useCases/auth';
import { useCaptureAndWait } from '@/useCases/inbox';
import { useLinkPreview } from '@/useCases/projects';
import { loginHref } from '@/features/shared/routes';
import { isEmpty, webCaptureInput } from './webPage';
import type { WebPage } from './webPage';
import classes from './WebCapture.module.css';

/**
 * WebCapture
 * The small window the bookmarklet opens: the page it came from (title,
 * address, the text selected there, the video's moment) and one field for a
 * note. Enter sends it to the Inbox and closes the window; Esc closes it.
 * A browser that keeps the window open shows that it was saved instead.
 */

type Sending = 'idle' | 'sending' | 'waiting' | 'saved';

/** How long a send may take before the window says the connection is lost (it keeps trying) */
const PATIENCE_MS = 4000;

export function WebCapture({ page }: { page: WebPage }) {
  const t = useT();
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();
  const send = useCaptureAndWait();
  const [note, setNote] = useState('');
  const [sending, setSending] = useState<Sending>('idle');

  // A cookie that no longer opens a session: clear it, log in, and come back to this same capture
  useEffect(() => {
    if (session.status !== 'signedOut') return;
    const here = window.location.pathname + window.location.search;
    logout().finally(() => router.replace(loginHref(here)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  // Esc closes the window from anywhere in it
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') window.close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submit = async () => {
    const input = webCaptureInput(page, note);
    if (!input || sending !== 'idle') return;
    setSending('sending');
    const slow = window.setTimeout(() => setSending((now) => (now === 'sending' ? 'waiting' : now)), PATIENCE_MS);
    const saved = await send(input);
    window.clearTimeout(slow);
    setSending(saved ? 'saved' : 'idle');
    // Only a window opened by the bookmarklet can close itself; any other shows it was saved
    if (saved) window.close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  if (session.status === 'loading' || session.status === 'signedOut') {
    return (
      <Center component="main" mih="100vh">
        <Loader size="sm" aria-label={t('capture.window.loading')} />
      </Center>
    );
  }

  if (isEmpty(page)) {
    return (
      <Center component="main" mih="100vh" p="md">
        <Stack gap="xs" align="center" ta="center" maw={340}>
          <Title order={1} size="h4">
            {t('capture.window.empty.title')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('capture.window.empty.body')}
          </Text>
          <Anchor component={Link} href="/settings/capture" size="sm">
            {t('capture.window.empty.settings')}
          </Anchor>
        </Stack>
      </Center>
    );
  }

  if (sending === 'saved') {
    return (
      <Center component="main" mih="100vh" p="md">
        <Stack gap="xs" align="center" ta="center" role="status">
          <ThemeIcon size={40} radius="xl" variant="light" color="teal">
            <IconCheck size={22} aria-hidden />
          </ThemeIcon>
          <Title order={1} size="h4">
            {t('capture.window.saved.title')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('capture.window.saved.body')}
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack component="main" gap="sm" p="md" mih="100vh">
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon size={24} radius="md" variant="gradient" gradient={{ from: 'blue.6', to: 'cyan.5', deg: 135 }} aria-hidden>
          <IconRoute size={15} stroke={2} />
        </ThemeIcon>
        <Title order={1} size="h5">
          {t('capture.window.heading')}
        </Title>
      </Group>

      <Paper withBorder p="sm" radius="md" component="section" aria-label={t('capture.window.page')}>
        <Source page={page} />
        {page.quote && (
          <blockquote className={classes.quote}>
            <VisuallyHidden>{t('capture.window.quote')}</VisuallyHidden>
            <Text size="sm" lineClamp={3}>
              {page.quote}
            </Text>
          </blockquote>
        )}
      </Paper>

      <Textarea
        label={t('capture.window.note')}
        placeholder={t('capture.window.notePlaceholder')}
        value={note}
        onChange={(event) => setNote(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        autosize
        minRows={2}
        maxRows={4}
        autoFocus
        disabled={sending !== 'idle'}
      />

      <Group justify="space-between" wrap="nowrap" gap="sm" mt="auto">
        <Text size="xs" c="dimmed" role="status">
          {sending === 'waiting' ? t('capture.window.waiting') : t('capture.window.hint')}
        </Text>
        <Button size="sm" onClick={() => void submit()} loading={sending !== 'idle'}>
          {t('capture.window.send')}
        </Button>
      </Group>
    </Stack>
  );
}

/** The page it came from: the site's icon, the title, the address's site and the video's moment */
function Source({ page }: { page: WebPage }) {
  const t = useT();
  const title = page.title ?? t('capture.window.noTitle');
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      {page.url ? <SiteIcon url={page.url} /> : <IconLink size={16} aria-hidden className={classes.icon} />}
      <Stack gap={0} miw={0} style={{ flex: 1 }}>
        <Text size="sm" fw={600} lineClamp={2}>
          {title}
        </Text>
        {page.url && (
          <Text size="xs" c="dimmed" truncate>
            {host(page.url)}
            {page.videoTime !== undefined && ` · ${t('capture.window.at', { time: formatTime(page.videoTime) })}`}
          </Text>
        )}
      </Stack>
    </Group>
  );
}

function SiteIcon({ url }: { url: string }) {
  const preview = useLinkPreview(url);
  const favicon = preview.status === 'ready' ? preview.preview.favicon : null;
  return favicon ? <Image src={favicon} alt="" w={16} h={16} className={classes.icon} /> : <IconLink size={16} aria-hidden className={classes.icon} />;
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
