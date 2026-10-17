'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Accordion, ActionIcon, Badge, Button, Drawer, Group, List, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconArrowsMaximize, IconBulb, IconPlayerPlay, IconPlayerPlayFilled } from '@tabler/icons-react';
import { useLocale, useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/I18nProvider';
import classes from './HelpPanel.module.css';
import { Rich } from './Rich';
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

/** A topic of Help: its steps and tip (help.<screen>.<topic>.*), and the clip that shows it (public/help/<clip>.<locale>.mp4) when there is one */
interface Topic {
  /** Its messages: <base>.title, <base>.steps.a…, <base>.tip */
  readonly base: string;
  readonly steps: number;
  readonly clip?: string;
}

/** What each screen explains, in the order a learner meets it */
const TOPICS: Record<Screen, { intro: TranslationKey; topics: ReadonlyArray<Topic> }> = {
  page: {
    intro: 'help.page.intro',
    topics: [
      { base: 'help.page.addPage', steps: 3, clip: 'add-page' },
      { base: 'help.page.videoNotes', steps: 4, clip: 'video-notes' },
    ],
  },
  map: {
    intro: 'help.map.intro',
    topics: [
      { base: 'help.map.addBranch', steps: 3, clip: 'map-branch' },
      { base: 'help.map.search', steps: 3, clip: 'map-search' },
      { base: 'help.map.open', steps: 2 },
      { base: 'help.map.keys', steps: 4 },
    ],
  },
  inbox: {
    intro: 'help.inbox.intro',
    topics: [
      { base: 'help.inbox.capture', steps: 3, clip: 'inbox-capture' },
      { base: 'help.inbox.file', steps: 3, clip: 'inbox-file' },
      { base: 'help.inbox.makePage', steps: 3 },
      { base: 'help.inbox.fromPage', steps: 2 },
      { base: 'help.inbox.keys', steps: 4 },
    ],
  },
  home: {
    intro: 'help.home.intro',
    topics: [
      { base: 'help.home.newPath', steps: 3, clip: 'new-path' },
      { base: 'help.home.projects', steps: 3, clip: 'projects' },
      { base: 'help.home.kind', steps: 2 },
    ],
  },
};

const key = (k: string) => k as TranslationKey;

/** The screen's topics, one open at a time, so the panel stays short; a clip only plays while open */
function Topics({ screen }: { screen: Screen }) {
  const t = useT();
  const { intro, topics } = TOPICS[screen];
  // A single topic starts open; with more, all start closed so the list reads first
  const [open, setOpen] = useState<string | null>(topics.length === 1 ? topics[0].base : null);

  return (
    <Stack gap="md">
      <Text c="dimmed">{t(intro)}</Text>
      <Accordion value={open} onChange={setOpen} variant="separated" radius="md" chevronPosition="right">
        {topics.map((topic) => {
          const title = t(key(`${topic.base}.title`));
          return (
            <Accordion.Item key={topic.base} value={topic.base}>
              <Accordion.Control icon={topic.clip ? <IconPlayerPlay size={16} /> : <IconBulb size={16} />}>
                <Text fw={600} size="sm">
                  {title}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  {topic.clip && open === topic.base && <Clip name={topic.clip} label={title} />}
                  <List type="ordered" spacing={8} size="sm" classNames={{ item: classes.step }}>
                    {'abcd'.slice(0, topic.steps).split('').map((step) => (
                      <List.Item key={step}>
                        <Rich text={t(key(`${topic.base}.steps.${step}`))} />
                      </List.Item>
                    ))}
                  </List>
                  <Group gap={8} wrap="nowrap" align="flex-start" className={classes.tip}>
                    <Badge size="sm" variant="light" color="yellow" leftSection={<IconBulb size={12} />} style={{ flexShrink: 0 }}>
                      {t('help.tip')}
                    </Badge>
                    <Text size="sm">
                      <Rich text={t(key(`${topic.base}.tip`))} />
                    </Text>
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
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
