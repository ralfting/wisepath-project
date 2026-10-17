'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Accordion, ActionIcon, Button, Drawer, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconArrowsMaximize, IconBulb, IconPlayerPlay, IconPlayerPlayFilled } from '@tabler/icons-react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import classes from './HelpPanel.module.css';
import { screenOf } from './screen';
import type { Screen } from './screen';

/**
 * HelpPanel
 * What can I do here: topics for the screen the learner is on (a page, a map,
 * My paths), opened from Help in the sidebar. Most show a short clip of the
 * app doing it, with captions, in the app's language (public/help/, made with
 * HyperFrames from recordings of the app: videos/help-*).
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
        <Topics key={screen} screen={screen} />
      </EnlargedContext.Provider>
    </Drawer>
  );
}

/** A topic of Help: its words, and the clip that shows it (public/help/<clip>.<locale>.mp4) when there is one */
interface Topic {
  readonly id: string;
  readonly title: TranslationKey;
  readonly body: TranslationKey;
  readonly clip?: string;
}

/** What each screen explains, in the order a learner meets it */
const TOPICS: Record<Screen, { intro: TranslationKey; topics: ReadonlyArray<Topic> }> = {
  page: {
    intro: 'help.page.intro',
    topics: [
      { id: 'add-page', title: 'help.page.addPage.title', body: 'help.page.addPage.body', clip: 'add-page' },
      { id: 'video-notes', title: 'help.page.videoNotes.title', body: 'help.page.videoNotes.body', clip: 'video-notes' },
    ],
  },
  map: {
    intro: 'help.map.intro',
    topics: [
      { id: 'add-branch', title: 'help.map.addBranch.title', body: 'help.map.addBranch.body', clip: 'map-branch' },
      { id: 'search', title: 'help.map.search.title', body: 'help.map.search.body', clip: 'map-search' },
      { id: 'open', title: 'help.map.open.title', body: 'help.map.open.body' },
      { id: 'keys', title: 'help.map.keys.title', body: 'help.map.keys.body' },
    ],
  },
  home: {
    intro: 'help.home.intro',
    topics: [
      { id: 'new-path', title: 'help.home.newPath.title', body: 'help.home.newPath.body', clip: 'new-path' },
      { id: 'projects', title: 'help.home.projects.title', body: 'help.home.projects.body', clip: 'projects' },
      { id: 'kind', title: 'help.home.kind.title', body: 'help.home.kind.body' },
    ],
  },
};

/** The screen's topics, one open at a time (the first to start with), so the panel stays short; a clip only plays while open */
function Topics({ screen }: { screen: Screen }) {
  const t = useT();
  const { intro, topics } = TOPICS[screen];
  const [open, setOpen] = useState<string | null>(topics[0].id);

  return (
    <Stack gap="md">
      <Text c="dimmed">{t(intro)}</Text>
      <Accordion value={open} onChange={setOpen} variant="separated" radius="md" chevronPosition="right">
        {topics.map((topic) => (
          <Accordion.Item key={topic.id} value={topic.id}>
            <Accordion.Control icon={topic.clip ? <IconPlayerPlay size={16} /> : <IconBulb size={16} />}>
              <Text fw={600} size="sm">
                {t(topic.title)}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                {topic.clip && open === topic.id && <Clip name={topic.clip} label={t(topic.title)} />}
                <Text size="sm">{t(topic.body)}</Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
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
