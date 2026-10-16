'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ActionIcon, Button, Drawer, List, Modal, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconArrowsMaximize, IconPlayerPlayFilled } from '@tabler/icons-react';
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

/**
 * Says a clip is shown large. Mantine's drawer and modal both close on Esc from
 * the window, so while a clip is large, Esc closes only it and Help stays
 */
const EnlargedContext = createContext<(enlarged: boolean) => void>(() => {});

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
  const [enlarged, setEnlarged] = useState(false);

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
      closeOnEscape={!enlarged}
    >
      <EnlargedContext.Provider value={setEnlarged}>
        {screen === 'page' ? <PageHelp /> : screen === 'map' ? <Tips area="map" /> : <Tips area="home" />}
      </EnlargedContext.Provider>
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
 * text on its own. A press on it (or its corner button) shows it large, with
 * the player's controls, from where it was.
 */
function Clip({ name, label }: { name: string; label: string }) {
  const { locale } = useLocale();
  const t = useT();
  const still = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(!still);
  // Where the small clip was when it was enlarged; null while it isn't
  const [enlarged, setEnlarged] = useState<number | null>(null);
  const holdHelp = useContext(EnlargedContext);

  if (failed) return null;
  const base = `/help/${name}.${locale}`;

  const enlarge = () => {
    ref.current?.pause();
    setEnlarged(ref.current?.currentTime ?? 0);
    holdHelp(true);
  };
  const shrink = () => {
    setEnlarged(null);
    holdHelp(false);
    if (!still) void ref.current?.play();
  };

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
        onClick={enlarge}
        className={classes.video}
      />
      <Tooltip label={t('help.enlarge')} withArrow>
        <ActionIcon variant="white" color="dark" size="md" radius="md" aria-label={t('help.enlargeClip', { title: label })} className={classes.enlarge} onClick={enlarge}>
          <IconArrowsMaximize size={15} />
        </ActionIcon>
      </Tooltip>
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
      <Modal
        opened={enlarged !== null}
        onClose={shrink}
        title={label}
        centered
        size="auto"
        radius="lg"
        // Above Help (260)
        zIndex={280}
        closeButtonProps={{ 'aria-label': t('common.actions.close') }}
      >
        <video
          src={`${base}.mp4`}
          poster={`${base}.jpg`}
          autoPlay={!still}
          muted
          loop
          playsInline
          controls
          aria-label={label}
          onLoadedMetadata={(event) => {
            event.currentTarget.currentTime = enlarged ?? 0;
          }}
          className={classes.large}
        />
      </Modal>
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
