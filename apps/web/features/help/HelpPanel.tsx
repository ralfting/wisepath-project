'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button, Drawer, List, Stack, Text, Title } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconPlayerPlayFilled } from '@tabler/icons-react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import classes from './HelpPanel.module.css';
import { screenOf } from './screen';

/**
 * HelpPanel
 * What can I do here: tips for the screen the learner is on (a page, a map,
 * My paths), opened from Help in the sidebar. A page's topics show a short
 * clip of the app doing it, in the app's language (public/help/).
 */

export const OPEN_HELP_EVENT = 'wisepath:open-help';

export function openHelp(): void {
  window.dispatchEvent(new Event(OPEN_HELP_EVENT));
}

/** The panel, opened by openHelp */
export function HelpHost() {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpened(true);
    window.addEventListener(OPEN_HELP_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_HELP_EVENT, onOpen);
  }, []);

  return <HelpPanel opened={opened} onClose={() => setOpened(false)} />;
}

function HelpPanel({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const t = useT();
  const screen = screenOf(pathname);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      // Above the page drawer (Mantine's 200, expanded too), the floating sidebar (220) and the line's key tag (250)
      zIndex={260}
      // The drawer's title is already a heading (h2)
      title={t('help.title')}
      styles={{ title: { fontSize: 'var(--mantine-font-size-xl)', fontWeight: 700 } }}
      closeButtonProps={{ 'aria-label': t('common.actions.close') }}
    >
      {screen === 'page' ? <PageHelp /> : screen === 'map' ? <Tips area="map" /> : <Tips area="home" />}
    </Drawer>
  );
}

function PageHelp() {
  const t = useT();
  return (
    <Stack gap="xl">
      <Text c="dimmed">{t('help.page.intro')}</Text>
      <Topic clip="add-page" title="help.page.addPage.title" body="help.page.addPage.body" />
      <Topic clip="video-notes" title="help.page.videoNotes.title" body="help.page.videoNotes.body" />
      <Text size="sm" c="dimmed">
        {t('help.page.more')}
      </Text>
    </Stack>
  );
}

function Topic({ clip, title, body }: { clip: string; title: TranslationKey; body: TranslationKey }) {
  const t = useT();
  return (
    <Stack gap="sm" component="section" aria-label={t(title)}>
      <Title order={3} fz={16}>
        {t(title)}
      </Title>
      <Clip name={clip} label={t(title)} />
      <Text size="sm">{t(body)}</Text>
    </Stack>
  );
}

/**
 * A few seconds of the app doing it, muted and looping like a GIF. With less
 * motion asked for, it waits for a press. A clip that can't load leaves the
 * text on its own.
 */
function Clip({ name, label }: { name: string; label: string }) {
  const { locale } = useLocale();
  const t = useT();
  const still = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(!still);

  if (failed) return null;
  const base = `/help/${name}.${locale}`;

  return (
    <div className={classes.clip}>
      <video
        ref={ref}
        src={`${base}.mp4`}
        poster={`${base}.jpg`}
        autoPlay={!still}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        onError={() => setFailed(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className={classes.video}
      />
      {!playing && (
        <Button
          size="xs"
          variant="white"
          leftSection={<IconPlayerPlayFilled size={12} />}
          className={classes.play}
          onClick={() => void ref.current?.play()}
        >
          {t('help.play')}
        </Button>
      )}
    </div>
  );
}

function Tips({ area }: { area: 'map' | 'home' }) {
  const t = useT();
  const keys =
    area === 'map'
      ? (['help.map.tips.add', 'help.map.tips.open', 'help.map.tips.keys', 'help.map.tips.search'] as const)
      : (['help.home.tips.newPath', 'help.home.tips.projects', 'help.home.tips.move', 'help.home.tips.kind'] as const);
  return (
    <Stack gap="lg">
      <Text c="dimmed">{t(area === 'map' ? 'help.map.intro' : 'help.home.intro')}</Text>
      <List spacing="sm" size="sm">
        {keys.map((key) => (
          <List.Item key={key}>{t(key)}</List.Item>
        ))}
      </List>
    </Stack>
  );
}
